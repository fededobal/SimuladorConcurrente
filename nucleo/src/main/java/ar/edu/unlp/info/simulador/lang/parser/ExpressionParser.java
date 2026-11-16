package ar.edu.unlp.info.simulador.lang.parser;

import ar.edu.unlp.info.simulador.lang.CompilationException;
import ar.edu.unlp.info.simulador.lang.lexer.Token;
import ar.edu.unlp.info.simulador.lang.lexer.TokenType;
import ar.edu.unlp.info.simulador.lang.parser.ast.Expr;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Analizador de expresiones (descenso recursivo, de menor a mayor precedencia: or, and, not,
 * comparacion, suma, producto, menos unario, primarias). Comparte el {@link TokenCursor}
 * con {@link Parser}, que lo usa para cada expresion de una sentencia.
 */
final class ExpressionParser {

    private static final String[] COMPARISON_OPERATORS = {"==", "!=", "<", "<=", ">", ">="};

    /**
     * Tope de operaciones encadenadas en una expresion. Por la misma razon que el tope de
     * anidamiento de {@link TokenCursor}: el validador y el evaluador recorren el arbol
     * recursivamente, y la pila del navegador es mas chica que la de la JVM.
     */
    private static final int MAX_EXPRESSION_DEPTH = 200;

    private final TokenCursor tokens;

    ExpressionParser(TokenCursor tokens) {
        this.tokens = tokens;
    }

    /** Una expresion completa, controlando el anidamiento y la profundidad del arbol. */
    Expr parseExpr() {
        tokens.enterNesting();
        Expr e = parseOr();
        tokens.exitNesting();
        checkDepth(e);
        return e;
    }

    /**
     * Una suma de miles de terminos no anida parentesis pero arma un arbol igual de hondo.
     * Se mide sin recursion, justamente para no agotar la pila.
     */
    private static void checkDepth(Expr root) {
        Deque<Expr> pending = new ArrayDeque<>();
        Deque<Integer> depths = new ArrayDeque<>();
        pending.push(root);
        depths.push(1);
        while (!pending.isEmpty()) {
            Expr e = pending.pop();
            int n = depths.pop();
            if (n > MAX_EXPRESSION_DEPTH) {
                throw new CompilationException("Expresión demasiado larga o anidada (máximo "
                        + MAX_EXPRESSION_DEPTH + " operaciones encadenadas)", e.line());
            }
            for (Expr child : e.children()) {
                pending.push(child);
                depths.push(n + 1);
            }
        }
    }

    private Expr parseOr() {
        Expr left = parseAnd();
        while (tokens.match("or") || tokens.match("||")) {
            int line = tokens.previous().line();
            Expr right = parseAnd();
            left = new Expr.Binary("or", left, right, line);
        }
        return left;
    }

    private Expr parseAnd() {
        Expr left = parseNot();
        while (tokens.match("and") || tokens.match("&&")) {
            int line = tokens.previous().line();
            Expr right = parseNot();
            left = new Expr.Binary("and", left, right, line);
        }
        return left;
    }

    private Expr parseNot() {
        if (tokens.match("not") || tokens.match("!")) {
            int line = tokens.previous().line();
            tokens.enterNesting();
            Expr operand = parseNot();
            tokens.exitNesting();
            return new Expr.Unary("not", operand, line);
        }
        return parseComparison();
    }

    private Expr parseComparison() {
        Expr left = parseAdd();
        if (tokens.matchAny(COMPARISON_OPERATORS)) {
            String op = tokens.previous().lexeme();
            int line = tokens.previous().line();
            Expr right = parseAdd();
            if (tokens.checkAny(COMPARISON_OPERATORS)) {
                throw tokens.error("Las comparaciones no se encadenan: en lugar de 'a < b < c' escribí "
                        + "'a < b and b < c'");
            }
            return new Expr.Binary(op, left, right, line);
        }
        return left;
    }

    private Expr parseAdd() {
        Expr left = parseMul();
        while (tokens.matchAny("+", "-")) {
            String op = tokens.previous().lexeme();
            int line = tokens.previous().line();
            Expr right = parseMul();
            left = new Expr.Binary(op, left, right, line);
        }
        return left;
    }

    private Expr parseMul() {
        Expr left = parseUnary();
        while (tokens.matchAny("*", "/", "mod")) {
            String op = tokens.previous().lexeme();
            int line = tokens.previous().line();
            Expr right = parseUnary();
            left = new Expr.Binary(op, left, right, line);
        }
        return left;
    }

    private Expr parseUnary() {
        if (tokens.match("-")) {
            int line = tokens.previous().line();
            tokens.enterNesting();
            Expr operand = parseUnary();
            tokens.exitNesting();
            return new Expr.Unary("-", operand, line);
        }
        return parsePrimary();
    }

    private Expr parsePrimary() {
        Token t = tokens.peek();

        if (t.is(TokenType.NUMBER)) {
            return parseNumber();
        }
        if (t.is(TokenType.STRING)) {
            tokens.advance();
            return new Expr.TextLit(t.lexeme(), t.line());
        }
        if (t.isKeyword("true") || t.isKeyword("false")) {
            tokens.advance();
            return new Expr.BoolLit(t.is("true"), t.line());
        }
        if (t.isKeyword("empty")) {
            return parseEmpty();
        }
        if (t.is("(")) {
            tokens.advance();
            Expr inner = parseExpr();
            tokens.consume(")", "Se esperaba ')'");
            return inner;
        }
        if (t.is(TokenType.IDENTIFIER)) {
            tokens.advance();
            if (tokens.match("[")) {
                Expr index = parseExpr();
                tokens.consume("]", "Se esperaba ']' en el índice");
                return new Expr.ArrayAccess(t.lexeme(), index, t.line());
            }
            return new Expr.VarRef(t.lexeme(), t.line());
        }
        throw tokens.error("Se esperaba una expresión");
    }

    /** Un literal entero o, si tiene punto, decimal; los que no entran son error de compilacion. */
    private Expr parseNumber() {
        Token t = tokens.advance();
        if (t.lexeme().contains(".")) {
            double d = DecimalLiteral.valueOf(t.lexeme());
            if (Double.isInfinite(d)) {
                throw new CompilationException("Número fuera de rango: el literal "
                        + "decimal es demasiado grande", t.line());
            }
            return new Expr.DoubleLit(d, t.line());
        }
        try {
            return new Expr.IntLit(Long.parseLong(t.lexeme()), t.line());
        } catch (NumberFormatException e) {
            throw new CompilationException("Número fuera de rango: " + t.lexeme()
                    + " no entra en un int (máximo 9223372036854775807)", t.line());
        }
    }

    /** {@code empty c} o {@code empty(c)}: se acepta con y sin parentesis. */
    private Expr parseEmpty() {
        Token kw = tokens.advance();
        boolean parenthesized = tokens.match("(");
        String queue = tokens.consumeIdent("Se esperaba el nombre de la cola después de 'empty'");
        if (tokens.match("[")) {
            // empty(turno[i]): solo puede ser una cond (no hay arreglos de colas); el
            // validador lo informa con el nombre
            parseExpr();
            tokens.consume("]", "Se esperaba ']' en el índice");
        }
        if (parenthesized) tokens.consume(")", "Se esperaba ')' después del nombre de la cola");
        return new Expr.EmptyQueue(queue, kw.line());
    }
}
