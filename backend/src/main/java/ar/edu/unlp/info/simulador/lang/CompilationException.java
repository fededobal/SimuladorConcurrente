package ar.edu.unlp.info.simulador.lang;

/**
 * Error de compilacion del pseudocodigo: lexico, sintactico o semantico.
 * Lleva el numero de linea (1-based) cuando se conoce, o -1 si no aplica.
 */
public class CompilationException extends RuntimeException {

    private final int line;

    public CompilationException(String message, int line) {
        super(message);
        this.line = line;
    }

    public CompilationException(String message) {
        this(message, -1);
    }

    public int getLine() {
        return line;
    }

    @Override
    public String getMessage() {
        return line > 0 ? "Linea " + line + ": " + super.getMessage() : super.getMessage();
    }
}
