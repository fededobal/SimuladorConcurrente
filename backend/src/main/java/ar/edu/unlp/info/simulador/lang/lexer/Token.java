package ar.edu.unlp.info.simulador.lang.lexer;

/**
 * Un token del pseudocodigo.
 *
 * @param type   categoria lexica
 * @param lexeme texto exacto (para STRING, sin las comillas)
 * @param line   linea 1-based donde empieza el token
 * @param column columna 1-based
 */
public record Token(TokenType type, String lexeme, int line, int column) {

    public boolean is(TokenType t) {
        return this.type == t;
    }

    public boolean is(String lexeme) {
        return this.lexeme.equals(lexeme);
    }

    public boolean isKeyword(String kw) {
        return type == TokenType.KEYWORD && lexeme.equals(kw);
    }

    @Override
    public String toString() {
        return type + "(" + lexeme + ")@" + line + ":" + column;
    }
}
