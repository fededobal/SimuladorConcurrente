package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.lang.parser.ast.Type;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
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

    /** Cola FIFO. */
    final class QueueVal implements Value {
        private final Deque<Value> items;

        public QueueVal() { this.items = new ArrayDeque<>(); }
        private QueueVal(Deque<Value> items) { this.items = items; }

        public void push(Value v) { items.addLast(v); }
        public Value pop() { return items.pollFirst(); }
        public boolean isEmpty() { return items.isEmpty(); }
        public int size() { return items.size(); }
        public List<Value> snapshot() { return new ArrayList<>(items); }

        public QueueVal copy() {
            return new QueueVal(new ArrayDeque<>(items));
        }
    }

    // ---------------------------------------------------------------- helpers

    static Value defaultFor(Type type) {
        return switch (type) {
            case INT -> new IntVal(0);
            case DOUBLE -> new DoubleVal(0);
            case BOOLEAN -> new BoolVal(false);
            case TEXT -> new TextVal("");
            case COLA -> new QueueVal();
        };
    }

    /** Convierte este valor al tipo declarado de destino (int<->double, resto exacto). */
    default Value coerceTo(Type target) {
        return switch (target) {
            case INT -> new IntVal(asLong());
            case DOUBLE -> new DoubleVal(asDouble());
            case BOOLEAN -> new BoolVal(asBool());
            case TEXT -> new TextVal(asText());
            case COLA -> this;
        };
    }

    default long asLong() {
        return switch (this) {
            case IntVal i -> i.v();
            case DoubleVal d -> (long) d.v();
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
            case DoubleVal d -> Double.toString(d.v());
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
                if (d.v() == Math.rint(d.v()) && !Double.isInfinite(d.v())) {
                    yield Long.toString((long) d.v()) + ".0";
                }
                yield Double.toString(d.v());
            }
            case BoolVal b -> Boolean.toString(b.v());
            case TextVal t -> t.v();
            case ArrayVal a -> {
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < a.size(); i++) {
                    if (i > 0) sb.append(", ");
                    sb.append(a.get(i).display());
                }
                yield sb.append("]").toString();
            }
            case QueueVal q -> {
                StringBuilder sb = new StringBuilder("<");
                List<Value> items = q.snapshot();
                for (int i = 0; i < items.size(); i++) {
                    if (i > 0) sb.append(", ");
                    sb.append(items.get(i).display());
                }
                yield sb.append(">").toString();
            }
        };
    }
}
