package ar.edu.unlp.info.simulador.lang.parser;

import ar.edu.unlp.info.simulador.lang.CompilationException;
import ar.edu.unlp.info.simulador.lang.lexer.Token;
import ar.edu.unlp.info.simulador.lang.lexer.TokenType;
import ar.edu.unlp.info.simulador.lang.parser.ast.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Analizador sintactico (descenso recursivo). Produce un {@link Program}.
 * No hace chequeos semanticos (eso es {@link ar.edu.unlp.info.simulador.lang.SemanticValidator}).
 */
public final class Parser {

    private static final List<String> SCALAR_TYPES = List.of("int", "double", "boolean", "text");

    private final List<Token> tokens;
    private int current = 0;
    private int anonimos = 0;

    public Parser(List<Token> tokens) {
        this.tokens = tokens;
    }

    // ================================================================= programa

    public Program parseProgram() {
        List<MonitorDef> monitors = new ArrayList<>();
        List<ProcessDef> processes = new ArrayList<>();

        while (!atEnd()) {
            if (check("monitor")) {
                monitors.add(parseMonitor());
            } else if (check("process")) {
                processes.add(parseProcess());
            } else if (isScalarType(peek()) || isQueueType(peek())) {
                throw error("No hay variables globales: las variables van dentro de un monitor "
                        + "(permanentes) o de un process (locales)");
            } else {
                throw error("Se esperaba 'monitor' o 'process'");
            }
        }
        return new Program(monitors, processes);
    }

    // ================================================================= monitor

    private MonitorDef parseMonitor() {
        Token kw = consume("monitor", "Se esperaba 'monitor'");
        String name = consumeIdent("Se esperaba el nombre del monitor");
        consume("{", "Se esperaba '{' para abrir el monitor");

        List<VarDecl> perm = new ArrayList<>();
        List<CondDecl> conds = new ArrayList<>();
        List<Stmt> init = new ArrayList<>();
        List<ProcedureDef> procedures = new ArrayList<>();

        while (!check("}") && !atEnd()) {
            if (check("cond")) {
                conds.addAll(parseCondDecls());
            } else if (check("procedure")) {
                procedures.add(parseProcedure());
            } else if (isScalarType(peek()) || isQueueType(peek())) {
                perm.add(parseVarDecl());
            } else {
                init.add(parseStatement());
            }
        }
        consume("}", "Se esperaba '}' para cerrar el monitor");
        return new MonitorDef(name, perm, conds, init, procedures, kw.line());
    }

    private List<CondDecl> parseCondDecls() {
        Token kw = consume("cond", "Se esperaba 'cond'");
        List<CondDecl> result = new ArrayList<>();
        do {
            String name = consumeIdent("Se esperaba el nombre de la variable condicion");
            boolean isArray = false;
            Expr size = null;
            if (match("[")) {
                isArray = true;
                size = parseExpr();
                consume("]", "Se esperaba ']' en la declaracion de 'cond'");
            }
            result.add(new CondDecl(name, isArray, size, kw.line()));
        } while (match(","));
        consume(";", "Se esperaba ';' al final de la declaracion de 'cond'");
        return result;
    }

    private ProcedureDef parseProcedure() {
        Token kw = consume("procedure", "Se esperaba 'procedure'");
        String name = consumeIdent("Se esperaba el nombre del procedure");
        consume("(", "Se esperaba '(' despues del nombre del procedure");
        List<Param> params = new ArrayList<>();
        if (!check(")")) {
            do {
                params.add(parseParam());
            } while (match(","));
        }
        consume(")", "Se esperaba ')' al cerrar los parametros");
        Stmt.Block body = parseBlock();
        return new ProcedureDef(name, params, body, kw.line());
    }

    private Param parseParam() {
        Token nameTok = consumeIdentToken("Se esperaba el nombre del parametro");
        consume(":", "Se esperaba ':' despues del nombre del parametro");
        ParamMode mode = ParamMode.IN;
        if (match("in")) {
            mode = ParamMode.IN;
        } else if (match("out")) {
            mode = ParamMode.OUT;
        }
        if (!isScalarType(peek())) {
            throw error("Se esperaba un tipo escalar (int, double, boolean, text) para el parametro");
        }
        Type type = Type.fromKeyword(advance().lexeme());
        return new Param(nameTok.lexeme(), type, mode, nameTok.line());
    }

    // ================================================================= proceso

    private ProcessDef parseProcess() {
        Token kw = consume("process", "Se esperaba 'process'");
        String name = consumeIdent("Se esperaba el nombre del proceso");
        ProcessDef.QuantDef quant = null;
        if (match("[")) {
            String iterator = consumeIdent("Se esperaba el iterador de la familia de procesos");
            consume(":", "Se esperaba ':' en el cuantificador");
            Expr from = parseExpr();
            consume("..", "Se esperaba '..' en el cuantificador");
            Expr to = parseExpr();
            consume("]", "Se esperaba ']' al cerrar el cuantificador");
            quant = new ProcessDef.QuantDef(iterator, from, to);
        }
        Stmt.Block body = parseBlock();
        return new ProcessDef(name, quant, body, kw.line());
    }

    // ================================================================= sentencias

    private Stmt.Block parseBlock() {
        Token open = consume("{", "Se esperaba '{'");
        List<Stmt> statements = new ArrayList<>();
        while (!check("}") && !atEnd()) {
            statements.add(parseStatement());
        }
        consume("}", "Se esperaba '}'");
        return new Stmt.Block(statements, open.line());
    }

    private Stmt.Block parseBlockOrStatement() {
        if (check("{")) {
            return parseBlock();
        }
        Stmt s = parseStatement();
        return new Stmt.Block(List.of(s), s.line());
    }

    private Stmt parseStatement() {
        Token t = peek();

        if (isScalarType(t) || t.isKeyword("Cola")) {
            return parseVarDecl();
        }
        if (t.isKeyword("skip")) {
            advance();
            consume(";", "Se esperaba ';' despues de 'skip'");
            return new Stmt.Skip(t.line());
        }
        if (t.isKeyword("wait") || t.isKeyword("signal") || t.isKeyword("signal_all")) {
            return parseCondOp();
        }
        if (t.isKeyword("push") || t.isKeyword("pop")) {
            return parseQueueOp();
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
            // llamada a monitor:  Ident '.' Ident '(' ... ')' ';'
            if (current + 1 < tokens.size() && tokens.get(current + 1).is(".")) {
                return parseMonitorCall();
            }
            return parseAssignOrIncDec();
        }
        throw error("Sentencia no valida");
    }

    private VarDecl parseVarDecl() {
        Token typeTok = advance();
        Type type = Type.fromKeyword(typeTok.lexeme());
        String name = consumeIdent("Se esperaba el nombre de la variable");

        if (type.isQueue()) {
            consume(";", "Se esperaba ';' al final de la declaracion de la cola");
            return new VarDecl(name, type, false, null, null, typeTok.line());
        }

        boolean isArray = false;
        Expr size = null;
        Expr init = null;
        if (match("[")) {
            isArray = true;
            size = parseExpr();
            consume("]", "Se esperaba ']' en la declaracion del arreglo");
            if (match("=")) {
                consume("(", "Se esperaba '(' para inicializar el arreglo");
                consume("[", "Se esperaba '[' en la inicializacion del arreglo");
                parseExpr(); // tamano interno, se ignora (redundante)
                consume("]", "Se esperaba ']' en la inicializacion del arreglo");
                init = parseExpr();
                consume(")", "Se esperaba ')' para cerrar la inicializacion del arreglo");
            }
        } else if (match("=")) {
            init = parseExpr();
        }
        consume(";", "Se esperaba ';' al final de la declaracion");
        return new VarDecl(name, type, isArray, size, init, typeTok.line());
    }

    private Stmt parseCondOp() {
        Token kw = advance();
        Stmt.CondOpKind kind = switch (kw.lexeme()) {
            case "wait" -> Stmt.CondOpKind.WAIT;
            case "signal" -> Stmt.CondOpKind.SIGNAL;
            default -> Stmt.CondOpKind.SIGNAL_ALL;
        };
        consume("(", "Se esperaba '(' despues de '" + kw.lexeme() + "'");
        String name = consumeIdent("Se esperaba el nombre de la variable condicion");
        Expr index = null;
        if (match("[")) {
            index = parseExpr();
            consume("]", "Se esperaba ']' en el indice de la variable condicion");
        }
        consume(")", "Se esperaba ')'");
        consume(";", "Se esperaba ';'");
        return new Stmt.CondOp(kind, name, index, kw.line());
    }

    private Stmt parseQueueOp() {
        Token kw = advance();
        consume("(", "Se esperaba '(' despues de '" + kw.lexeme() + "'");
        String queue = consumeIdent("Se esperaba el nombre de la cola");
        consume(",", "Se esperaba ',' despues del nombre de la cola");
        if (kw.is("push")) {
            List<Expr> elems = new ArrayList<>();
            do {
                elems.add(parseExpr());
            } while (match(","));
            consume(")", "Se esperaba ')'");
            consume(";", "Se esperaba ';'");
            return new Stmt.QueuePush(queue, elems, kw.line());
        } else {
            List<String> targets = new ArrayList<>();
            do {
                targets.add(consumeIdent("Se esperaba una variable destino para 'pop'"));
            } while (match(","));
            consume(")", "Se esperaba ')'");
            consume(";", "Se esperaba ';'");
            return new Stmt.QueuePop(queue, targets, kw.line());
        }
    }

    private Stmt parseIf() {
        Token kw = advance();
        consume("(", "Se esperaba '(' despues de 'if'");
        Expr cond = parseExpr();
        consume(")", "Se esperaba ')' despues de la condicion del 'if'");
        Stmt.Block thenB = parseBlockOrStatement();
        Stmt.Block elseB = null;
        if (match("else")) {
            elseB = parseBlockOrStatement();
        }
        return new Stmt.IfStmt(cond, thenB, elseB, kw.line());
    }

    private Stmt parseWhile() {
        Token kw = advance();
        consume("(", "Se esperaba '(' despues de 'while'");
        Expr cond = parseExpr();
        consume(")", "Se esperaba ')' despues de la condicion del 'while'");
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
        Token kw = advance();
        consume("(", "Se esperaba '(' despues de 'for'");

        String id;
        Stmt init;
        boolean rangoAnonimo = false;
        if (isScalarType(peek())) {
            Type it = Type.fromKeyword(advance().lexeme());
            id = consumeIdent("Se esperaba el nombre del iterador");
            consume("=", "Se esperaba '=' despues del iterador");
            Expr from = parseExpr();
            init = VarDecl.scalar(id, it, from, kw.line());
        } else if (peek().is(TokenType.IDENTIFIER) && next().is("=")) {
            id = advance().lexeme();
            consume("=", "Se esperaba '=' despues del iterador");
            Expr from = parseExpr();
            init = new Stmt.Assign(id, null, from, kw.line());
        } else {
            // for (1..n): el iterador existe igual, pero con un nombre que el codigo fuente
            // no puede escribir (lleva '#'), asi que no colisiona ni es visible.
            rangoAnonimo = true;
            id = "for#" + (++anonimos);
            Expr from = parseExpr();
            init = VarDecl.scalar(id, Type.INT, from, kw.line());
        }

        if (rangoAnonimo) {
            consume("..", "El 'for' debe inicializar un iterador o ser un rango, "
                    + "p. ej. for (int i = 0; i < n; i++) o for (1..n)");
        }
        if (rangoAnonimo || match("..")) {
            Expr to = parseExpr();
            consume(")", "Se esperaba ')' en el 'for' de rango");
            Stmt.Block body = parseBlockOrStatement();
            Expr cond = new Expr.Binary("<=", new Expr.VarRef(id, kw.line()), to, kw.line());
            Stmt step = new Stmt.IncDec(id, null, true, kw.line());
            return new Stmt.ForStmt(init, cond, step, body, kw.line());
        }

        consume(";", "Se esperaba ';' en el 'for'");
        Expr cond = check(";") ? new Expr.BoolLit(true, kw.line()) : parseExpr();
        consume(";", "Se esperaba ';' en el 'for'");
        Stmt step = parseForStep(kw.line());
        consume(")", "Se esperaba ')' en el 'for'");
        Stmt.Block body = parseBlockOrStatement();
        return new Stmt.ForStmt(init, cond, step, body, kw.line());
    }

    private Stmt parseForStep(int line) {
        String target = consumeIdent("Se esperaba el paso del 'for'");
        if (match("++")) {
            return new Stmt.IncDec(target, null, true, line);
        }
        if (match("--")) {
            return new Stmt.IncDec(target, null, false, line);
        }
        consume("=", "Se esperaba '++', '--' o '=' en el paso del 'for'");
        Expr value = parseExpr();
        return new Stmt.Assign(target, null, value, line);
    }

    private Stmt parseMonitorCall() {
        Token monTok = advance();
        consume(".", "Se esperaba '.'");
        String proc = consumeIdent("Se esperaba el nombre del procedure");
        consume("(", "Se esperaba '(' en la llamada al monitor");
        List<Expr> args = new ArrayList<>();
        if (!check(")")) {
            do {
                args.add(parseExpr());
            } while (match(","));
        }
        consume(")", "Se esperaba ')' en la llamada al monitor");
        consume(";", "Se esperaba ';' al final de la llamada al monitor");
        return new Stmt.MonitorCall(monTok.lexeme(), proc, args, monTok.line());
    }

    private Stmt parseAssignOrIncDec() {
        Token nameTok = advance();
        Expr index = null;
        if (match("[")) {
            index = parseExpr();
            consume("]", "Se esperaba ']' en el indice");
        }
        if (match("++")) {
            consume(";", "Se esperaba ';'");
            return new Stmt.IncDec(nameTok.lexeme(), index, true, nameTok.line());
        }
        if (match("--")) {
            consume(";", "Se esperaba ';'");
            return new Stmt.IncDec(nameTok.lexeme(), index, false, nameTok.line());
        }
        consume("=", "Se esperaba '=', '++' o '--'");
        Expr value = parseExpr();
        consume(";", "Se esperaba ';'");
        return new Stmt.Assign(nameTok.lexeme(), index, value, nameTok.line());
    }

    // ================================================================= expresiones

    private Expr parseExpr() {
        return parseOr();
    }

    private Expr parseOr() {
        Expr left = parseAnd();
        while (match("or") || match("||")) {
            int line = previous().line();
            Expr right = parseAnd();
            left = new Expr.Binary("or", left, right, line);
        }
        return left;
    }

    private Expr parseAnd() {
        Expr left = parseNot();
        while (match("and") || match("&&")) {
            int line = previous().line();
            Expr right = parseNot();
            left = new Expr.Binary("and", left, right, line);
        }
        return left;
    }

    private Expr parseNot() {
        if (match("not") || match("!")) {
            int line = previous().line();
            return new Expr.Unary("not", parseNot(), line);
        }
        return parseComparison();
    }

    private Expr parseComparison() {
        Expr left = parseAdd();
        if (matchAny("==", "!=", "<", "<=", ">", ">=")) {
            String op = previous().lexeme();
            int line = previous().line();
            Expr right = parseAdd();
            return new Expr.Binary(op, left, right, line);
        }
        return left;
    }

    private Expr parseAdd() {
        Expr left = parseMul();
        while (matchAny("+", "-")) {
            String op = previous().lexeme();
            int line = previous().line();
            Expr right = parseMul();
            left = new Expr.Binary(op, left, right, line);
        }
        return left;
    }

    private Expr parseMul() {
        Expr left = parseUnary();
        while (matchAny("*", "/", "%")) {
            String op = previous().lexeme();
            int line = previous().line();
            Expr right = parseUnary();
            left = new Expr.Binary(op, left, right, line);
        }
        return left;
    }

    private Expr parseUnary() {
        if (match("-")) {
            int line = previous().line();
            return new Expr.Unary("-", parseUnary(), line);
        }
        return parsePrimary();
    }

    private Expr parsePrimary() {
        Token t = peek();

        if (t.is(TokenType.NUMBER)) {
            advance();
            if (t.lexeme().contains(".")) {
                return new Expr.DoubleLit(Double.parseDouble(t.lexeme()), t.line());
            }
            return new Expr.IntLit(Long.parseLong(t.lexeme()), t.line());
        }
        if (t.is(TokenType.STRING)) {
            advance();
            return new Expr.TextLit(t.lexeme(), t.line());
        }
        if (t.isKeyword("true") || t.isKeyword("false")) {
            advance();
            return new Expr.BoolLit(t.is("true"), t.line());
        }
        if (t.isKeyword("empty")) {
            advance();
            String queue = consumeIdent("Se esperaba el nombre de la cola despues de 'empty'");
            return new Expr.EmptyQueue(queue, t.line());
        }
        if (t.is("(")) {
            advance();
            Expr inner = parseExpr();
            consume(")", "Se esperaba ')'");
            return inner;
        }
        if (t.is(TokenType.IDENTIFIER)) {
            advance();
            if (match("[")) {
                Expr index = parseExpr();
                consume("]", "Se esperaba ']' en el indice");
                return new Expr.ArrayAccess(t.lexeme(), index, t.line());
            }
            return new Expr.VarRef(t.lexeme(), t.line());
        }
        throw error("Se esperaba una expresion");
    }

    // ================================================================= helpers

    private Token peek() {
        return tokens.get(current);
    }

    /** Token siguiente al actual, para decidir con un simbolo de anticipacion. */
    private Token next() {
        return tokens.get(Math.min(current + 1, tokens.size() - 1));
    }

    private Token previous() {
        return tokens.get(current - 1);
    }

    private boolean atEnd() {
        return peek().is(TokenType.EOF);
    }

    private Token advance() {
        if (!atEnd()) current++;
        return previous();
    }

    private boolean check(String lexeme) {
        return !atEnd() && peek().is(lexeme);
    }

    private boolean match(String lexeme) {
        if (check(lexeme)) {
            advance();
            return true;
        }
        return false;
    }

    private boolean matchAny(String... lexemes) {
        for (String l : lexemes) {
            if (check(l)) {
                advance();
                return true;
            }
        }
        return false;
    }

    private Token consume(String lexeme, String message) {
        if (check(lexeme)) return advance();
        throw error(message + " (se encontro '" + describe(peek()) + "')");
    }

    private String consumeIdent(String message) {
        return consumeIdentToken(message).lexeme();
    }

    private Token consumeIdentToken(String message) {
        if (peek().is(TokenType.IDENTIFIER)) return advance();
        throw error(message + " (se encontro '" + describe(peek()) + "')");
    }

    private boolean isScalarType(Token t) {
        return t.is(TokenType.KEYWORD) && SCALAR_TYPES.contains(t.lexeme());
    }

    private boolean isQueueType(Token t) {
        return t.is("Cola") || t.is("ColaOrdenada");
    }

    private static String describe(Token t) {
        return t.is(TokenType.EOF) ? "fin del archivo" : t.lexeme();
    }

    private CompilationException error(String message) {
        return new CompilationException(message, peek().line());
    }
}
