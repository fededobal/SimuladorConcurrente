package ar.edu.unlp.info.simulador.vm;

/**
 * Error detectado durante la ejecucion de la simulacion (p. ej. {@code pop} sobre una cola
 * vacia, indice fuera de rango, division por cero). Aborta el proceso que lo provoco.
 */
public class RuntimeError extends RuntimeException {

    private final int line;

    public RuntimeError(String message, int line) {
        super(message);
        this.line = line;
    }

    /** Resultado entero que no entra en un {@code int} del lenguaje (64 bits). */
    public static RuntimeError overflow(int line) {
        return new RuntimeError("Desborde de entero: el resultado no entra en un int", line);
    }

    public int getLine() {
        return line;
    }
}
