package ar.edu.unlp.info.simulator.lang.lexer;

import ar.edu.unlp.info.simulator.lang.CompilationException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
            "int", "double", "bool", "text", "Cola", "ColaOrdenada", "asc", "desc",
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

    /**
     * {@code cola}, en minúscula: como tipo es palabra reservada ({@code Cola c(int);}), pero
     * también se acepta como nombre de variable ({@code cond cola;}).
     */
    private static final String QUEUE_WORD = "cola";

    /** Intercambio de la catedra ({@code v_actual :=: v_proxima}): el unico simbolo de tres caracteres. */
    public static final String SWAP = ":=:";

    private static final Set<String> TWO_CHAR =
            Set.of("==", "!=", "<=", ">=", "&&", "||", "++", "--", "..");
    private static final String SINGLE_CHAR = "+-*/=<>(){}[];,:.!";

    /** La única directiva: {@code #define NOMBRE valor}, una constante del programa. */
    private static final String DEFINE = "define";

    /**
     * Constantes del programa, en el orden en que se definieron: nombre y valor como se
     * escribió. No son variables: cada vez que el programa nombra una, el lexer entrega el
     * número en su lugar, de modo que el resto del compilador nunca las ve.
     */
    private final Map<String, String> constants = new LinkedHashMap<>();

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

            if (c == '#') { readDirective(tokens.isEmpty()); continue; }
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
        String word = readWord();
        String lower = word.toLowerCase(Locale.ROOT);
        if (lower.equals("boolean")) {
            throw new CompilationException("El tipo se llama bool, no " + word, startLine);
        }
        if (lower.equals(QUEUE_WORD) && !declaresQueueAhead()) {
            return new Token(TokenType.IDENTIFIER, word, startLine, startCol);
        }
        String keyword = CANONICAL_KEYWORDS.get(lower);
        if (keyword != null) {
            return new Token(TokenType.KEYWORD, keyword, startLine, startCol);
        }
        String value = constants.get(word);
        if (value != null) {
            return new Token(TokenType.NUMBER, value, startLine, startCol, word);
        }
        return new Token(TokenType.IDENTIFIER, word, startLine, startCol);
    }

    /** Letras, dígitos y guiones bajos seguidos, desde la posición actual. */
    private String readWord() {
        StringBuilder sb = new StringBuilder();
        while (!atEnd() && isWordChar(peek())) sb.append(advance());
        return sb.toString();
    }

    private static boolean isWordChar(char c) {
        return Character.isLetter(c) || isDigit(c) || c == '_';
    }

    /**
     * true si la palabra {@code cola} que se acaba de leer es el tipo y no un nombre. La
     * cátedra la usa de las dos formas ({@code cola elibres;} y {@code cond cola;}), y no se
     * confunden: el tipo va siempre seguido del nombre que declara, y un nombre nunca va
     * seguido de otro. Mira hacia adelante sin consumir nada.
     */
    private boolean declaresQueueAhead() {
        int i = skipBlanksAndComments(pos);
        if (i >= src.length() || !(Character.isLetter(src.charAt(i)) || src.charAt(i) == '_')) {
            return false;
        }
        int end = i;
        while (end < src.length() && isWordChar(src.charAt(end))) end++;
        String next = src.substring(i, end).toLowerCase(Locale.ROOT);
        // "cola mod 2" o "cola and listo": lo que sigue es un operador, no un nombre
        return next.equals(QUEUE_WORD) || !CANONICAL_KEYWORDS.containsKey(next);
    }

    /** La posición del primer carácter, desde {@code i}, que no es espacio ni comentario. */
    private int skipBlanksAndComments(int i) {
        while (i < src.length()) {
            char c = src.charAt(i);
            if (Character.isWhitespace(c) || c == '\u00A0' || c == '\uFEFF') {
                i++;
            } else if (src.startsWith("//", i)) {
                while (i < src.length() && src.charAt(i) != '\n') i++;
            } else if (src.startsWith("/*", i)) {
                int close = src.indexOf("*/", i + 2);
                if (close < 0) return src.length();
                i = close + 2;
            } else {
                break;
            }
        }
        return i;
    }

    /**
     * {@code #define NOMBRE valor}: una constante del programa, como la N de la cátedra. Ocupa
     * una línea y va al principio, antes de los monitores y los procesos. El valor es un
     * entero sin signo.
     *
     * @param atProgramStart true si todavía no se leyó ningún token
     */
    private void readDirective(boolean atProgramStart) {
        int startLine = line;
        advance(); // #
        String directive = readWord();
        if (!directive.toLowerCase(Locale.ROOT).equals(DEFINE)) {
            throw new CompilationException("Directiva desconocida '#" + directive
                    + "': la única es #define, por ejemplo #define N 5", startLine);
        }
        if (!atProgramStart) {
            throw new CompilationException("Las constantes (#define) se escriben al principio "
                    + "del programa, antes de los monitores y los procesos", startLine);
        }
        skipBlanksInLine();
        String name = readWord();
        if (name.isEmpty() || isDigit(name.charAt(0))) {
            throw new CompilationException("Después de #define va el nombre de la constante, "
                    + "por ejemplo #define N 5", startLine);
        }
        String lower = name.toLowerCase(Locale.ROOT);
        if (CANONICAL_KEYWORDS.containsKey(lower) || lower.equals("boolean")) {
            throw new CompilationException("'" + name + "' es una palabra reservada: no puede "
                    + "ser el nombre de una constante", startLine);
        }
        if (constants.containsKey(name)) {
            throw new CompilationException("La constante '" + name + "' ya está definida",
                    startLine);
        }
        skipBlanksInLine();
        StringBuilder value = new StringBuilder();
        while (!atEnd() && isDigit(peek())) value.append(advance());
        if (value.length() == 0 || !atEnd() && (isWordChar(peek()) || peek() == '.')) {
            throw new CompilationException("La constante '" + name + "' necesita un valor "
                    + "entero sin signo, por ejemplo #define " + name + " 5", startLine);
        }
        skipBlanksInLine();
        if (peek() == '/' && peekNext() == '/') skipLineComment();
        if (!atEnd() && peek() != '\n') {
            throw new CompilationException("Después del valor de la constante '" + name
                    + "' no va nada más en la línea (un #define no lleva ';')", startLine);
        }
        constants.put(name, value.toString());
    }

    /** Saltea espacios y tabulaciones sin pasar de línea. */
    private void skipBlanksInLine() {
        while (!atEnd() && peek() != '\n'
                && (Character.isWhitespace(peek()) || peek() == '\u00A0')) {
            advance();
        }
    }

    private Token readSymbol() {
        int startLine = line, startCol = col;
        char c = peek();
        if (c == '\u201C' || c == '\u201D' || c == '\u2018' || c == '\u2019') {
            // frecuentes al copiar el enunciado de un PDF o de un procesador de texto
            throw new CompilationException("Comilla tipográfica " + c + ": las cadenas van entre "
                    + "comillas rectas (\")", startLine);
        }
        if (c == ':' && peekNext() == '=' && pos + 2 < src.length() && src.charAt(pos + 2) == ':') {
            advance();
            advance();
            advance();
            return new Token(TokenType.SYMBOL, SWAP, startLine, startCol);
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
