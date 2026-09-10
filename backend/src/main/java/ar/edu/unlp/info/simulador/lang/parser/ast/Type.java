package ar.edu.unlp.info.simulador.lang.parser.ast;

/** Tipos de datos del lenguaje. */
public enum Type {
    INT, DOUBLE, BOOLEAN, TEXT, COLA;

    public static Type fromKeyword(String kw) {
        return switch (kw) {
            case "int" -> INT;
            case "double" -> DOUBLE;
            case "boolean" -> BOOLEAN;
            case "text" -> TEXT;
            case "Cola" -> COLA;
            default -> throw new IllegalArgumentException("Tipo desconocido: " + kw);
        };
    }

    public boolean isScalar() {
        return this != COLA;
    }
}
