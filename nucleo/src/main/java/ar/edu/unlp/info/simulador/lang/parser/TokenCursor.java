package ar.edu.unlp.info.simulador.lang.parser;

import ar.edu.unlp.info.simulador.lang.CompilationException;
import ar.edu.unlp.info.simulador.lang.lexer.Token;
import ar.edu.unlp.info.simulador.lang.lexer.TokenType;

import java.util.List;

/**
 * Recorrido de la lista de tokens para el parser: mirar el actual y el siguiente, consumir
 * lo esperado o fallar con un error que dice que se encontro, y volver atras despues de una
 * mirada hacia adelante. Lleva tambien la profundidad de anidamiento, que se controla en la
 * posicion del texto donde se pasa del tope.
 */
final class TokenCursor {

    /**
     * Tope de anidamiento de sentencias y expresiones. El parser, el validador y el evaluador
     * son recursivos, y la pila del navegador es mas chica que la de la JVM: sin tope, un
     * programa que en los tests anda termina en "Error interno" para el alumno.
     */
    private static final int MAX_NESTING = 100;

    private static final List<String> SCALAR_TYPES = List.of("int", "double", "bool", "text");

    private final List<Token> tokens;
    private int position = 0;
    private int nesting = 0;

    TokenCursor(List<Token> tokens) {
        this.tokens = tokens;
    }

    Token peek() {
        return tokens.get(position);
    }

    /** Token siguiente al actual, para decidir con un simbolo de anticipacion. */
    Token next() {
        return tokens.get(Math.min(position + 1, tokens.size() - 1));
    }

    Token previous() {
        return tokens.get(position - 1);
    }

    boolean atEnd() {
        return peek().is(TokenType.EOF);
    }

    Token advance() {
        if (!atEnd()) position++;
        return previous();
    }

    boolean check(String lexeme) {
        return !atEnd() && peek().is(lexeme);
    }

    boolean checkAny(String... lexemes) {
        for (String l : lexemes) {
            if (check(l)) return true;
        }
        return false;
    }

    boolean match(String lexeme) {
        if (check(lexeme)) {
            advance();
            return true;
        }
        return false;
    }

    boolean matchAny(String... lexemes) {
        for (String l : lexemes) {
            if (check(l)) {
                advance();
                return true;
            }
        }
        return false;
    }

    Token consume(String lexeme, String message) {
        if (check(lexeme)) return advance();
        throw error(message + " (se encontró '" + describe(peek()) + "')");
    }

    String consumeIdent(String message) {
        return consumeIdentToken(message).lexeme();
    }

    Token consumeIdentToken(String message) {
        if (peek().is(TokenType.IDENTIFIER)) return advance();
        throw error(message + " (se encontró '" + describe(peek()) + "')");
    }

    /**
     * true si el token siguiente abre corchetes y, una vez cerrados (con los que haya
     * adentro), viene {@code lexeme}. No consume nada.
     */
    boolean bracketsAheadFollowedBy(String lexeme) {
        if (!next().is("[")) return false;
        int depth = 0;
        for (int i = position + 1; i < tokens.size(); i++) {
            Token t = tokens.get(i);
            if (t.is(TokenType.EOF)) return false;
            if (t.is("[")) depth++;
            if (t.is("]") && --depth == 0) {
                return i + 1 < tokens.size() && tokens.get(i + 1).is(lexeme);
            }
        }
        return false;
    }

    /** La posicion actual, para volver a ella con {@link #reset} tras mirar hacia adelante. */
    int mark() {
        return position;
    }

    void reset(int mark) {
        position = mark;
    }

    /** Entra a un nivel de anidamiento; pasarse del tope es error de compilacion. */
    void enterNesting() {
        if (++nesting > MAX_NESTING) {
            throw error("El programa tiene demasiados niveles de anidamiento (máximo "
                    + MAX_NESTING + ")");
        }
    }

    void exitNesting() {
        nesting--;
    }

    /** Un error de compilacion en la linea del token actual. */
    CompilationException error(String message) {
        return new CompilationException(message, peek().line());
    }

    /** true si el token es uno de los tipos escalares: int, double, bool o text. */
    static boolean isScalarType(Token t) {
        return t.is(TokenType.KEYWORD) && SCALAR_TYPES.contains(t.lexeme());
    }

    /** true si el token empieza una declaracion: un tipo escalar o un tipo de cola. */
    static boolean isDeclStart(Token t) {
        return isScalarType(t) || t.is("Cola") || t.is("ColaOrdenada");
    }

    /** Como se nombra un token en un mensaje de error. */
    static String describe(Token t) {
        return t.is(TokenType.EOF) ? "fin del archivo" : t.lexeme();
    }
}
