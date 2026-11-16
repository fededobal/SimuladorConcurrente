package ar.edu.unlp.info.simulator.lang.lexer;

import ar.edu.unlp.info.simulator.lang.CompilationException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
            "push", "pop", "empty", "write", "delay",
            "in", "out",
            "true", "false",
            "int", "double", "bool", "text", "Cola", "ColaOrdenada",
            "and", "or", "not", "mod"
    );

    /**
     * Cada palabra reservada en minuscula, con su forma canonica. La catedra mezcla mayusculas
     * ({@code Monitor}, {@code OR}, {@code OUT}, {@code colaOrdenada}): las palabras reservadas
     * se aceptan con cualquier combinacion y se normalizan, para que el parser compare siempre
     * contra una sola forma. Los identificadores del alumno, en cambio, distinguen mayusculas.
     */
    private static final Map<String, String> CANONICAL_KEYWORDS = canonicalKeywords();

    private static Map<String, String> canonicalKeywords() {
        Map<String, String> canonical = new HashMap<>();
        for (String kw : KEYWORDS) canonical.put(kw.toLowerCase(Locale.ROOT), kw);
        return canonical;
    }

    private static final Set<String> TWO_CHAR =
            Set.of("==", "!=", "<=", ">=", "&&", "||", "++", "--", "..");
    private static final String SINGLE_CHAR = "+-*/=<>(){}[];,:.!";

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
            if (Character.isWhitespace(c) || c == '\u00A0'
                    || c == '\uFEFF') { advance(); continue; }

            if (c == '/' && peekNext() == '/') { skipLineComment(); continue; }
            if (c == '/' && peekNext() == '*') { skipBlockComment(); continue; }

            if (c == '"') { tokens.add(readString()); continue; }
            if (isDigit(c)) { tokens.add(readNumber()); continue; }
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

    /**
     * Solo los digitos ASCII, como dice la gramatica. Character.isDigit acepta tambien los de
     * otros alfabetos (por ejemplo, el arabe), que la JVM sabe convertir y TeaVM no.
     */
    private static boolean isDigit(char c) {
        return c >= '0' && c <= '9';
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
        while (!atEnd() && isDigit(peek())) sb.append(advance());
        if (peek() == '.' && isDigit(peekNext())) {
            sb.append(advance()); // .
            while (!atEnd() && isDigit(peek())) sb.append(advance());
        }
        return new Token(TokenType.NUMBER, sb.toString(), startLine, startCol);
    }

    private Token readIdentifier() {
        int startLine = line, startCol = col;
        StringBuilder sb = new StringBuilder();
        while (!atEnd() && (Character.isLetter(peek()) || isDigit(peek()) || peek() == '_')) {
            sb.append(advance());
        }
        String word = sb.toString();
        String lower = word.toLowerCase(Locale.ROOT);
        if (lower.equals("boolean")) {
            throw new CompilationException("El tipo se llama bool, no " + word, startLine);
        }
        String keyword = CANONICAL_KEYWORDS.get(lower);
        if (keyword != null) {
            return new Token(TokenType.KEYWORD, keyword, startLine, startCol);
        }
        return new Token(TokenType.IDENTIFIER, word, startLine, startCol);
    }

    private Token readSymbol() {
        int startLine = line, startCol = col;
        char c = peek();
        if (c == '\u201C' || c == '\u201D' || c == '\u2018' || c == '\u2019') {
            // frecuentes al copiar el enunciado de un PDF o de un procesador de texto
            throw new CompilationException("Comilla tipográfica " + c + ": las cadenas van entre "
                    + "comillas rectas (\")", startLine);
        }
        char n = peekNext();
        String two = "" + c + n;
        if (TWO_CHAR.contains(two)) {
            advance();
            advance();
            return new Token(TokenType.SYMBOL, two, startLine, startCol);
        }
        if (c == '%') {
            throw new CompilationException("El resto de la división se escribe mod, no %",
                    startLine);
        }
        if (SINGLE_CHAR.indexOf(c) >= 0) {
            advance();
            return new Token(TokenType.SYMBOL, String.valueOf(c), startLine, startCol);
        }
        throw new CompilationException("Carácter inesperado '" + c + "'", startLine);
    }
}
