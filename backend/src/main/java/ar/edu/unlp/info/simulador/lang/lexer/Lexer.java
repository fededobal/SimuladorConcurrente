package ar.edu.unlp.info.simulador.lang.lexer;

import ar.edu.unlp.info.simulador.lang.CompilationException;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Analizador lexico: convierte el texto fuente en una lista de {@link Token}.
 * Descarta espacios y comentarios ({@code //} y {@code /* *}{@code /}).
 */
public final class Lexer {

    /** Palabras reservadas del lenguaje de monitores. */
    public static final Set<String> KEYWORDS = Set.of(
            "monitor", "procedure", "cond", "process",
            "if", "else", "while", "for", "skip",
            "wait", "signal", "signal_all",
            "push", "pop", "empty",
            "in", "out",
            "true", "false",
            "int", "double", "boolean", "text", "Cola", "ColaOrdenada",
            "and", "or", "not"
    );

    private static final Set<String> TWO_CHAR = Set.of("==", "!=", "<=", ">=", "&&", "||", "++", "--", "..");
    private static final String SINGLE_CHAR = "+-*/%=<>(){}[];,:.!";

    private final String src;
    private int pos = 0;
    private int line = 1;
    private int col = 1;

    public Lexer(String source) {
        this.src = source == null ? "" : source;
    }

    public List<Token> tokenize() {
        List<Token> tokens = new ArrayList<>();
        while (!atEnd()) {
            char c = peek();

            if (c == '\n') { advance(); continue; }
            if (Character.isWhitespace(c)) { advance(); continue; }

            if (c == '/' && peekNext() == '/') { skipLineComment(); continue; }
            if (c == '/' && peekNext() == '*') { skipBlockComment(); continue; }

            if (c == '"') { tokens.add(readString()); continue; }
            if (Character.isDigit(c)) { tokens.add(readNumber()); continue; }
            if (Character.isLetter(c) || c == '_') { tokens.add(readIdentifier()); continue; }

            tokens.add(readSymbol());
        }
        tokens.add(new Token(TokenType.EOF, "", line, col));
        return tokens;
    }

    // ---------------------------------------------------------------- helpers

    private boolean atEnd() {
        return pos >= src.length();
    }

    private char peek() {
        return atEnd() ? '\0' : src.charAt(pos);
    }

    private char peekNext() {
        return pos + 1 >= src.length() ? '\0' : src.charAt(pos + 1);
    }

    private char advance() {
        char c = src.charAt(pos++);
        if (c == '\n') {
            line++;
            col = 1;
        } else {
            col++;
        }
        return c;
    }

    private void skipLineComment() {
        while (!atEnd() && peek() != '\n') advance();
    }

    private void skipBlockComment() {
        int startLine = line;
        advance(); // /
        advance(); // *
        while (!atEnd()) {
            if (peek() == '*' && peekNext() == '/') {
                advance();
                advance();
                return;
            }
            advance();
        }
        throw new CompilationException("Comentario de bloque sin cerrar", startLine);
    }

    private Token readString() {
        int startLine = line, startCol = col;
        advance(); // opening quote
        StringBuilder sb = new StringBuilder();
        while (!atEnd() && peek() != '"') {
            if (peek() == '\n') {
                throw new CompilationException("Cadena de texto sin cerrar", startLine);
            }
            sb.append(advance());
        }
        if (atEnd()) {
            throw new CompilationException("Cadena de texto sin cerrar", startLine);
        }
        advance(); // closing quote
        return new Token(TokenType.STRING, sb.toString(), startLine, startCol);
    }

    private Token readNumber() {
        int startLine = line, startCol = col;
        StringBuilder sb = new StringBuilder();
        while (!atEnd() && Character.isDigit(peek())) sb.append(advance());
        if (peek() == '.' && Character.isDigit(peekNext())) {
            sb.append(advance()); // .
            while (!atEnd() && Character.isDigit(peek())) sb.append(advance());
        }
        return new Token(TokenType.NUMBER, sb.toString(), startLine, startCol);
    }

    private Token readIdentifier() {
        int startLine = line, startCol = col;
        StringBuilder sb = new StringBuilder();
        while (!atEnd() && (Character.isLetterOrDigit(peek()) || peek() == '_')) {
            sb.append(advance());
        }
        String word = sb.toString();
        TokenType type = KEYWORDS.contains(word) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
        return new Token(type, word, startLine, startCol);
    }

    private Token readSymbol() {
        int startLine = line, startCol = col;
        char c = peek();
        char n = peekNext();
        String two = "" + c + n;
        if (TWO_CHAR.contains(two)) {
            advance();
            advance();
            return new Token(TokenType.SYMBOL, two, startLine, startCol);
        }
        if (SINGLE_CHAR.indexOf(c) >= 0) {
            advance();
            return new Token(TokenType.SYMBOL, String.valueOf(c), startLine, startCol);
        }
        throw new CompilationException("Caracter inesperado '" + c + "'", startLine);
    }
}
