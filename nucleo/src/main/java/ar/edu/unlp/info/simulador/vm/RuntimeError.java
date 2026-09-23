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

    /** Resultado double infinito o indefinido (NaN). */
    public static RuntimeError notRepresentable(int line) {
        return new RuntimeError("Resultado no representable: la cuenta con double se desborda "
                + "o no está definida", line);
    }

    /** Indice fuera de los limites de un arreglo, con el valor tal como se calculo. */
    public static RuntimeError indexOutOfRange(long index, String name, int size, int line) {
        return new RuntimeError("Índice " + index + " fuera de rango para '" + name
                + "' (tamaño " + size + ")", line);
    }

    public int getLine() {
        return line;
    }
}
