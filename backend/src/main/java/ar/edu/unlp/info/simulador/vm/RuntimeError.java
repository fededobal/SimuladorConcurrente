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

    public int getLine() {
        return line;
    }
}
