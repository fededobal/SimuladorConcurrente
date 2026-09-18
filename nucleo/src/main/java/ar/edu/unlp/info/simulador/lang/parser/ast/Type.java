package ar.edu.unlp.info.simulador.lang.parser.ast;

/** Tipos de datos del lenguaje. */
public enum Type {
    INT, DOUBLE, BOOLEAN, TEXT, COLA, COLA_ORDENADA;

    public static Type fromKeyword(String kw) {
        return switch (kw) {
            case "int" -> INT;
            case "double" -> DOUBLE;
            case "boolean" -> BOOLEAN;
            case "text" -> TEXT;
            case "Cola" -> COLA;
            case "ColaOrdenada" -> COLA_ORDENADA;
            default -> throw new IllegalArgumentException("Tipo desconocido: " + kw);
        };
    }

    public boolean isScalar() {
        return !isQueue();
    }

    /** Cola FIFO o cola ordenada: mismas operaciones, distinto criterio de insercion. */
    public boolean isQueue() {
        return this == COLA || this == COLA_ORDENADA;
    }

    public String keyword() {
        return this == COLA_ORDENADA ? "ColaOrdenada" : "Cola";
    }
}
