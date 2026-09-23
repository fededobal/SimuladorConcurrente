package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.lang.parser.ast.Type;

import java.util.ArrayList;
import java.util.List;

/**
 * Valor en tiempo de ejecucion. Los escalares son inmutables; {@link ArrayVal} y
 * {@link QueueVal} tienen contenido mutable y se copian al tomar un snapshot.
 */
public sealed interface Value {

    record IntVal(long v) implements Value { }

    record DoubleVal(double v) implements Value { }

    record BoolVal(boolean v) implements Value { }

    record TextVal(String v) implements Value { }

    /** Arreglo homogeneo de escalares. */
    final class ArrayVal implements Value {
        private final Type elementType;
        private final Value[] elements;

        public ArrayVal(Type elementType, Value[] elements) {
            this.elementType = elementType;
            this.elements = elements;
        }

        public Type elementType() { return elementType; }
        public int size() { return elements.length; }
        public Value get(int i) { return elements[i]; }
        public void set(int i, Value val) { elements[i] = val; }
        public Value[] raw() { return elements; }

        public ArrayVal copy() {
            return new ArrayVal(elementType, elements.clone());
        }
    }

    /**
     * Cola FIFO ({@code Cola}) o cola de prioridad ({@code ColaOrdenada}). La ordenada
     * inserta segun la primera componente del elemento y, a igualdad, respeta el orden de
     * llegada (insercion estable): entre dos elementos con la misma clave sale antes el que
     * se encolo primero.
     */
    final class QueueVal implements Value {
        private final List<Value> items;
        private final boolean ordenada;

        public QueueVal() { this(false); }
        public QueueVal(boolean ordenada) { this(new ArrayList<>(), ordenada); }
        private QueueVal(List<Value> items, boolean ordenada) {
            this.items = items;
            this.ordenada = ordenada;
        }

        public boolean isOrdenada() { return ordenada; }

        public void push(Value v) {
            if (!ordenada) {
                items.add(v);
                return;
            }
            Value clave = claveDe(v);
            int i = 0;
            while (i < items.size() && comparar(claveDe(items.get(i)), clave) <= 0) i++;
            items.add(i, v);
        }

        public Value pop() { return items.isEmpty() ? null : items.remove(0); }
        public boolean isEmpty() { return items.isEmpty(); }
        public int size() { return items.size(); }
        public List<Value> snapshot() { return new ArrayList<>(items); }

        public QueueVal copy() {
            return new QueueVal(new ArrayList<>(items), ordenada);
        }

        /** El criterio de orden es la primera componente: la 'x' de push(c, x, y, z). */
        private static Value claveDe(Value v) {
            return v instanceof ArrayVal tupla && tupla.size() > 0 ? tupla.get(0) : v;
        }

        private static int comparar(Value a, Value b) {
            if (a instanceof TextVal || b instanceof TextVal) {
                return a.asText().compareTo(b.asText());
            }
            return Double.compare(a.asDouble(), b.asDouble());
        }
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Un double de modulo 2^53 o mayor en notacion cientifica con 15 cifras. No usa
     * Double.toString: para esos valores TeaVM elige otros digitos que la JVM (1.0E23 contra
     * 9.999999999999999E22). Solo divisiones y un redondeo, que dan igual en los dos lados.
     */
    private static String scientific(double d) {
        double m = Math.abs(d);
        int exp = 0;
        while (m >= 10.0) {
            m /= 10.0;
            exp++;
        }
        long digits = Math.round(m * 1e14);
        if (digits >= 1_000_000_000_000_000L) {
            digits /= 10;
            exp++;
        }
        String s = Long.toString(digits);
        int end = s.length();
        while (end > 2 && s.charAt(end - 1) == '0') end--;
        return (d < 0 ? "-" : "") + s.charAt(0) + "." + s.substring(1, end) + "E" + exp;
    }

    /** Elementos que se muestran de un arreglo o una cola; el resto se resume. */
    int MOSTRAR_ELEMENTOS = 50;

    /**
     * Lista de valores entre delimitadores. Un arreglo grande se abrevia: el snapshot se
     * serializa en cada instante y mostrarlo entero congelaria la interfaz.
     */
    private static String joined(String open, List<Value> items, String close) {
        StringBuilder sb = new StringBuilder(open);
        int shown = Math.min(items.size(), MOSTRAR_ELEMENTOS);
        for (int i = 0; i < shown; i++) {
            if (i > 0) sb.append(", ");
            sb.append(items.get(i).display());
        }
        if (shown < items.size()) {
            sb.append(", … (").append(items.size()).append(" elementos)");
        }
        return sb.append(close).toString();
    }

    static Value defaultFor(Type type) {
        return switch (type) {
            case INT -> new IntVal(0);
            case DOUBLE -> new DoubleVal(0);
            case BOOLEAN -> new BoolVal(false);
            case TEXT -> new TextVal("");
            case COLA -> new QueueVal(false);
            case COLA_ORDENADA -> new QueueVal(true);
        };
    }

    /** Convierte este valor al tipo declarado de destino (int<->double, resto exacto). */
    default Value coerceTo(Type target) {
        return switch (target) {
            case INT -> new IntVal(asLong());
            case DOUBLE -> new DoubleVal(asDouble());
            case BOOLEAN -> new BoolVal(asBool());
            case TEXT -> new TextVal(asText());
            case COLA, COLA_ORDENADA -> this;
        };
    }

    default long asLong() {
        return switch (this) {
            case IntVal i -> i.v();
            case DoubleVal d -> {
                // Fuera del rango de long, la JVM satura y TeaVM da otro numero: se corta aca.
                if (d.v() < -9.223372036854775808E18 || d.v() >= 9.223372036854775808E18) {
                    throw new RuntimeError("El valor " + display() + " no entra en un int", -1);
                }
                yield (long) d.v();
            }
            case BoolVal b -> b.v() ? 1 : 0;
            default -> throw new RuntimeError("Se esperaba un numero y se encontro " + display(), -1);
        };
    }

    default double asDouble() {
        return switch (this) {
            case IntVal i -> i.v();
            case DoubleVal d -> d.v();
            default -> throw new RuntimeError("Se esperaba un numero y se encontro " + display(), -1);
        };
    }

    default boolean asBool() {
        if (this instanceof BoolVal b) return b.v();
        throw new RuntimeError("Se esperaba un booleano y se encontro " + display(), -1);
    }

    default String asText() {
        return switch (this) {
            case TextVal t -> t.v();
            case IntVal i -> Long.toString(i.v());
            case DoubleVal d -> display();
            case BoolVal b -> Boolean.toString(b.v());
            default -> display();
        };
    }

    default boolean isNumeric() {
        return this instanceof IntVal || this instanceof DoubleVal;
    }

    /** Representacion legible para logs y para el frontend. */
    default String display() {
        return switch (this) {
            case IntVal i -> Long.toString(i.v());
            case DoubleVal d -> {
                // Enteros exactos (|d| < 2^53) sin notacion cientifica. No se usa Math.rint ni
                // se convierte a long un valor mayor: en TeaVM esas operaciones no dan lo mismo
                // que en la JVM.
                if (Math.abs(d.v()) >= 9007199254740992.0) yield scientific(d.v());
                if (Math.floor(d.v()) == d.v()) yield Long.toString((long) d.v()) + ".0";
                yield Double.toString(d.v());
            }
            case BoolVal b -> Boolean.toString(b.v());
            case TextVal t -> t.v();
            case ArrayVal a -> joined("[", List.of(a.raw()), "]");
            case QueueVal q -> joined("<", q.snapshot(), ">");
        };
    }
}
