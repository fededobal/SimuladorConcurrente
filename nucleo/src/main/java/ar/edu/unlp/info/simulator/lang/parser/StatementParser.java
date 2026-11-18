package ar.edu.unlp.info.simulator.lang.parser;

import ar.edu.unlp.info.simulator.lang.lexer.Lexer;
import ar.edu.unlp.info.simulator.lang.lexer.Token;
import ar.edu.unlp.info.simulator.lang.lexer.TokenType;
import ar.edu.unlp.info.simulator.lang.parser.ast.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Analizador de sentencias: bloques, declaraciones locales, asignaciones, llamadas a monitores,
 * wait/signal, write, delay, if, while y las formas del for. Las colas las delega en
 * {@link QueueSyntaxParser} y las expresiones en {@link ExpressionParser}.
 */
final class StatementParser {

    private final TokenCursor tokens;
    private final ExpressionParser expressions;
    private final QueueSyntaxParser queues;
    /** Numera los nombres ocultos ({@code for#n}, {@code hasta#n}) que genera el for de rango. */
    private int anonymousCount = 0;

    StatementParser(TokenCursor tokens, ExpressionParser expressions) {
        this.tokens = tokens;
        this.expressions = expressions;
        this.queues = new QueueSyntaxParser(tokens, expressions);
    }

    Stmt.Block parseBlock() {
        Token open = tokens.consume("{", "Se esperaba '{'");
        // dentro de las llaves cada sentencia lleva su ';', aunque el bloque sea el cuerpo de un if
        boolean outer = tokens.elseEndsStatement(false);
        List<Stmt> statements = new ArrayList<>();
        while (!tokens.check("}") && !tokens.atEnd()) {
            statements.addAll(parseStatements());
        }
        tokens.elseEndsStatement(outer);
        tokens.consume("}", "Se esperaba '}'");
        return new Stmt.Block(statements, open.line());
    }

    private Stmt.Block parseBlockOrStatement() {
        if (tokens.check("{")) {
            return parseBlock();
        }
        List<Stmt> statements = parseStatements();
        return new Stmt.Block(statements, statements.get(0).line());
    }

    /** Una sentencia, o varias si es una declaracion con lista de nombres ({@code int a, b;}). */
    private List<Stmt> parseStatements() {
        if (TokenCursor.isDeclStart(tokens.peek())) {
            return new ArrayList<>(parseVarDecls());
        }
        return List.of(parseStatement());
    }

    Stmt parseStatement() {
        tokens.enterNesting();
        Stmt s = parseStatementUnchecked();
        tokens.exitNesting();
        return s;
    }

    private Stmt parseStatementUnchecked() {
        Token t = tokens.peek();

        if (t.isKeyword("skip")) {
            return parseSkip();
        }
        if (t.isKeyword("wait") || t.isKeyword("signal") || t.isKeyword("signal_all")) {
            return parseCondOp();
        }
        if (t.isKeyword("push") || t.isKeyword("pop")) {
            return queues.parseQueueOp();
        }
        if (t.isKeyword("write")) {
            return parseWrite();
        }
        if (t.isKeyword("delay")) {
            return parseDelay();
        }
        if (t.isKeyword("if")) {
            return parseIf();
        }
        if (t.isKeyword("while")) {
            return parseWhile();
        }
        if (t.isKeyword("for")) {
            return parseFor();
        }
        if (t.is("{")) {
            return parseBlock();
        }
        if (t.is(TokenType.IDENTIFIER)) {
            // llamada a monitor:  Ident ['[' expr ']'] '.' Ident '(' ... ')' ';'
            if (tokens.next().is(".") || isIndexedMonitorCall()) {
                return parseMonitorCall();
            }
            return parseAssignOrIncDec();
        }
        if (t.constant() != null) {
            throw tokens.constantAsName(t);
        }
        throw tokens.error("Sentencia no válida");
    }

    private Stmt parseSkip() {
        Token kw = tokens.advance();
        tokens.endStatement("Se esperaba ';' después de 'skip'");
        return new Stmt.Skip(kw.line());
    }

    private Stmt parseDelay() {
        Token kw = tokens.advance();
        tokens.consume("(", "Se esperaba '(' después de 'delay'");
        Expr seconds = parseExpr();
        tokens.consume(")", "Se esperaba ')' al cerrar el delay");
        tokens.endStatement("Se esperaba ';' al final del delay");
        return new Stmt.Delay(seconds, kw.line());
    }

    /**
     * {@code tipo nombre [, nombre]* ;}. Cada nombre lleva su propio tamano de arreglo y su
     * propio valor inicial: en {@code int a, b = 0;} solo {@code b} arranca en 0.
     */
    List<VarDecl> parseVarDecls() {
        Token typeTok = tokens.advance();
        Type type = Type.fromKeyword(typeTok.lexeme());
        List<VarDecl> result = new ArrayList<>();
        do {
            result.add(parseVarDeclItem(type, typeTok.line()));
        } while (tokens.match(","));
        tokens.consume(";", type.isQueue()
                ? "Se esperaba ';' al final de la declaración de la cola"
                : "Se esperaba ';' al final de la declaración");
        return result;
    }

    private VarDecl parseVarDeclItem(Type type, int line) {
        String name = tokens.consumeIdent("Se esperaba el nombre de la variable");

        if (type.isQueue()) {
            List<Type> elementTypes = queues.parseElementTypes(type, name);
            return VarDecl.queue(name, type, elementTypes, queues.parseOrder(type, name), line);
        }

        boolean isArray = false;
        Expr size = null;
        Expr init = null;
        if (tokens.match("[")) {
            isArray = true;
            size = parseExpr();
            tokens.consume("]", "Se esperaba ']' en la declaración del arreglo");
            if (tokens.match("=")) {
                tokens.consume("(", "Se esperaba '(' para inicializar el arreglo");
                tokens.consume("[", "Se esperaba '[' en la inicialización del arreglo");
                parseExpr(); // tamano interno, se ignora (redundante)
                tokens.consume("]", "Se esperaba ']' en la inicialización del arreglo");
                init = parseExpr();
                tokens.consume(")", "Se esperaba ')' para cerrar la inicialización del arreglo");
            }
        } else if (tokens.match("=")) {
            init = parseExpr();
        }
        return new VarDecl(name, type, null, false, isArray, size, init, line);
    }

    private Stmt parseCondOp() {
        Token kw = tokens.advance();
        Stmt.CondOpKind kind = switch (kw.lexeme()) {
            case "wait" -> Stmt.CondOpKind.WAIT;
            case "signal" -> Stmt.CondOpKind.SIGNAL;
            default -> Stmt.CondOpKind.SIGNAL_ALL;
        };
        tokens.consume("(", "Se esperaba '(' después de '" + kw.lexeme() + "'");
        String name = tokens.consumeIdent("Se esperaba el nombre de la variable condición");
        Expr index = null;
        if (tokens.match("[")) {
            index = parseExpr();
            tokens.consume("]", "Se esperaba ']' en el índice de la variable condición");
        }
        if (kind == Stmt.CondOpKind.WAIT && tokens.check(",")) {
            throw tokens.error("En la práctica no se permite el wait con prioridad "
                    + "(wait(cv, rank)): se escribe wait(" + name + ")");
        }
        tokens.consume(")", "Se esperaba ')'");
        tokens.endStatement("Se esperaba ';'");
        return new Stmt.CondOp(kind, name, index, kw.line());
    }

    private Stmt parseWrite() {
        Token kw = tokens.advance();
        tokens.consume("(", "Se esperaba '(' después de 'write'");
        List<Expr> args = parseArguments();
        tokens.consume(")", "Se esperaba ')' al cerrar el write");
        tokens.endStatement("Se esperaba ';' al final del write");
        return new Stmt.Write(args, kw.line());
    }

    private Stmt parseIf() {
        Token kw = tokens.advance();
        tokens.consume("(", "Se esperaba '(' después de 'if'");
        Expr cond = parseExpr();
        tokens.consume(")", "Se esperaba ')' después de la condición del 'if'");
        // el cuerpo sin llaves puede ir seguido del else sin ';' (ver TokenCursor.endStatement)
        boolean outer = tokens.elseEndsStatement(true);
        Stmt.Block thenB = parseBlockOrStatement();
        tokens.elseEndsStatement(outer);
        Stmt.Block elseB = null;
        if (tokens.match("else")) {
            elseB = parseBlockOrStatement();
        }
        return new Stmt.IfStmt(cond, thenB, elseB, kw.line());
    }

    private Stmt parseWhile() {
        Token kw = tokens.advance();
        tokens.consume("(", "Se esperaba '(' después de 'while'");
        Expr cond = parseExpr();
        tokens.consume(")", "Se esperaba ')' después de la condición del 'while'");
        Stmt.Block body = parseBlockOrStatement();
        return new Stmt.WhileStmt(cond, body, kw.line());
    }

    /**
     * Las tres formas del 'for':
     *
     * <pre>
     *   for (int i = 0; i &lt; n; i++) { }   estilo C
     *   for (int i = 1..n) { }             rango con iterador declarado (catedra)
     *   for (i = 1..n) { }                 rango sobre un iterador ya declarado
     *   for (1..n) { }                     rango sin iterador: solo repite (catedra)
     * </pre>
     */
    private Stmt parseFor() {
        int line = tokens.advance().line();
        tokens.consume("(", "Se esperaba '(' después de 'for'");
        boolean hasIterator = TokenCursor.isScalarType(tokens.peek())
                || tokens.peek().is(TokenType.IDENTIFIER) && tokens.next().is("=");
        if (!hasIterator) {
            return parseAnonymousRangeFor(line);
        }
        Stmt init = parseForInit(line);
        String iterator = init instanceof VarDecl vd ? vd.name() : ((Stmt.Assign) init).target();
        if (tokens.match("..")) {
            return parseRangeFor(init, iterator, line);
        }
        return parseCStyleFor(init, line);
    }

    /** {@code int i = desde} declara el iterador; {@code i = desde} reutiliza uno ya declarado. */
    private Stmt parseForInit(int line) {
        if (TokenCursor.isScalarType(tokens.peek())) {
            Type type = Type.fromKeyword(tokens.advance().lexeme());
            String id = tokens.consumeIdent("Se esperaba el nombre del iterador");
            tokens.consume("=", "Se esperaba '=' después del iterador");
            return VarDecl.scalar(id, type, parseExpr(), line);
        }
        String id = tokens.advance().lexeme();
        tokens.consume("=", "Se esperaba '=' después del iterador");
        return new Stmt.Assign(id, null, parseExpr(), line);
    }

    /**
     * {@code for (1..n)}: el iterador existe igual, pero con un nombre que el codigo fuente no
     * puede escribir (lleva '#'), asi que no colisiona ni es visible.
     */
    private Stmt parseAnonymousRangeFor(int line) {
        String iterator = "for#" + (++anonymousCount);
        Stmt init = VarDecl.scalar(iterator, Type.INT, parseExpr(), line);
        tokens.consume("..", "El 'for' debe inicializar un iterador o ser un rango, "
                + "p. ej. for (int i = 0; i < n; i++) o for (1..n)");
        return parseRangeFor(init, iterator, line);
    }

    /** El resto de un for de rango, despues del '..': {@code hasta) cuerpo}. */
    private Stmt parseRangeFor(Stmt init, String iterator, int line) {
        Expr to = parseExpr();
        tokens.consume(")", "Se esperaba ')' en el 'for' de rango");
        Stmt.Block body = parseBlockOrStatement();
        // la cota se evalua una vez, en una variable que el codigo fuente no puede nombrar
        VarDecl limit = VarDecl.scalar("hasta#" + (++anonymousCount), Type.INT, to, line);
        Expr cond = new Expr.Binary("<=", new Expr.VarRef(iterator, line),
                new Expr.VarRef(limit.name(), line), line);
        Stmt step = new Stmt.IncDec(iterator, null, true, line);
        return new Stmt.ForStmt(init, limit, cond, step, body, line);
    }

    /** El resto de un for al estilo C, tras la inicializacion: {@code ; cond; paso) cuerpo}. */
    private Stmt parseCStyleFor(Stmt init, int line) {
        tokens.consume(";", "Se esperaba ';' en el 'for'");
        Expr cond = tokens.check(";") ? new Expr.BoolLit(true, line) : parseExpr();
        tokens.consume(";", "Se esperaba ';' en el 'for'");
        Stmt step = parseForStep(line);
        tokens.consume(")", "Se esperaba ')' en el 'for'");
        Stmt.Block body = parseBlockOrStatement();
        return new Stmt.ForStmt(init, null, cond, step, body, line);
    }

    private Stmt parseForStep(int line) {
        String target = tokens.consumeIdent("Se esperaba el paso del 'for'");
        if (tokens.match("++")) {
            return new Stmt.IncDec(target, null, true, line);
        }
        if (tokens.match("--")) {
            return new Stmt.IncDec(target, null, false, line);
        }
        tokens.consume("=", "Se esperaba '++', '--' o '=' en el paso del 'for'");
        Expr value = parseExpr();
        return new Stmt.Assign(target, null, value, line);
    }

    /**
     * true si lo que sigue es {@code Ident[...].}: una llamada a un arreglo de monitores, y no
     * una asignacion a un elemento de arreglo ({@code a[i] = ...}).
     */
    private boolean isIndexedMonitorCall() {
        return tokens.bracketsAheadFollowedBy(".");
    }

    private Stmt parseMonitorCall() {
        Token monTok = tokens.advance();
        Expr index = null;
        if (tokens.match("[")) {
            index = parseExpr();
            tokens.consume("]", "Se esperaba ']' en el índice del monitor");
        }
        tokens.consume(".", "Se esperaba '.'");
        String proc = tokens.consumeIdent("Se esperaba el nombre del procedure");
        tokens.consume("(", "Se esperaba '(' en la llamada al monitor");
        List<Expr> args = parseArguments();
        tokens.consume(")", "Se esperaba ')' en la llamada al monitor");
        tokens.endStatement("Se esperaba ';' al final de la llamada al monitor");
        return new Stmt.MonitorCall(monTok.lexeme(), index, proc, args, monTok.line());
    }

    /** {@code [expr {, expr}]}: los argumentos hasta el ')', que no se consume. */
    private List<Expr> parseArguments() {
        List<Expr> args = new ArrayList<>();
        if (!tokens.check(")")) {
            do {
                args.add(parseExpr());
            } while (tokens.match(","));
        }
        return args;
    }

    private Stmt parseAssignOrIncDec() {
        Token nameTok = tokens.advance();
        Expr index = null;
        if (tokens.match("[")) {
            index = parseExpr();
            tokens.consume("]", "Se esperaba ']' en el índice");
        }
        if (tokens.match("++")) {
            tokens.endStatement("Se esperaba ';'");
            return new Stmt.IncDec(nameTok.lexeme(), index, true, nameTok.line());
        }
        if (tokens.match("--")) {
            tokens.endStatement("Se esperaba ';'");
            return new Stmt.IncDec(nameTok.lexeme(), index, false, nameTok.line());
        }
        if (tokens.match(Lexer.SWAP)) {
            return parseSwapRest(nameTok, index);
        }
        tokens.consume("=", "Se esperaba '=', '++' o '--'");
        Expr value = parseExpr();
        tokens.endStatement("Se esperaba ';'");
        return new Stmt.Assign(nameTok.lexeme(), index, value, nameTok.line());
    }

    /** El lado derecho de {@code x :=: y;}: una variable o un elemento de arreglo. */
    private Stmt parseSwapRest(Token leftTok, Expr leftIndex) {
        Token rightTok = tokens.consumeIdentToken(
                "Se esperaba una variable después de ':=:'");
        Expr rightIndex = null;
        if (tokens.match("[")) {
            rightIndex = parseExpr();
            tokens.consume("]", "Se esperaba ']' en el índice");
        }
        tokens.endStatement("Se esperaba ';'");
        return new Stmt.Swap(leftTok.lexeme(), leftIndex, rightTok.lexeme(), rightIndex,
                leftTok.line());
    }

    private Expr parseExpr() {
        return expressions.parseExpr();
    }
}
