package ar.edu.unlp.info.simulator.vm;

import ar.edu.unlp.info.simulator.lang.parser.ast.Expr;
import ar.edu.unlp.info.simulator.lang.parser.ast.Type;

import java.util.Map;
import java.util.function.Function;

/**
 * Lectura y escritura de variables desde una activacion: primero las locales del marco y,
 * si la activacion es de un procedure, las permanentes de su monitor. Concentra los
 * controles de ejecucion (indice fuera de rango, tipo del destino) para que la maquina
 * virtual solo decida que ejecutar.
 */
final class VariableAccess {

    private final Map<String, Monitor> monitors;
    /** Para anotar en que instante se escribe cada variable permanente. */
    private final SimulationClock clock;

    /** El generador de la maquina virtual: de el sale el azar de {@code random}. */
    private final SeededRandom random;

    VariableAccess(Map<String, Monitor> monitors, SimulationClock clock, SeededRandom random) {
        this.monitors = monitors;
        this.clock = clock;
        this.random = random;
    }

    ExprEvaluator evaluator(Activation act) {
        return new ExprEvaluator(scopeOf(act), random);
    }

    private Function<String, Value> scopeOf(Activation act) {
        return name -> {
            if (act.locals().containsKey(name)) return act.locals().get(name);
            if (act.isProcedure()) {
                Monitor m = monitors.get(act.monitorName());
                if (m.hasVar(name)) return m.getVar(name);
            }
            return null;
        };
    }

    Value read(Activation act, String name, int line) {
        Value v = scopeOf(act).apply(name);
        if (v == null) throw new RuntimeError("Variable no definida: " + name, line);
        return v;
    }

    /** Asigna una variable simple; {@code writerId} queda como ultimo escritor si es permanente. */
    void assignScalar(int writerId, Activation act, String name, Value value, int line) {
        if (act.locals().containsKey(name)) {
            act.locals().put(name, coerceLike(act.locals().get(name), value, name, line));
            return;
        }
        if (act.isProcedure()) {
            Monitor m = monitors.get(act.monitorName());
            if (m.hasVar(name)) {
                m.setVar(name, coerceLike(m.getVar(name), value, name, line), writerId,
                        clock.instant());
                return;
            }
        }
        throw new RuntimeError("Variable no definida: " + name, line);
    }

    /**
     * La variable {@code name} o, si hay indice, el elemento {@code name[index]}. El indice se
     * evalua y se controla ahora; leer y escribir el lugar despues ya no lo vuelve a evaluar.
     */
    Place place(Activation act, String name, Expr index, int line) {
        if (index == null) return new VariablePlace(act, name, line);
        return new ElementPlace(act, name, arraySlot(act, name, index, line), line);
    }

    /** Una variable simple: local del marco o permanente del monitor. */
    private final class VariablePlace implements Place {
        private final Activation act;
        private final String name;
        private final int line;

        VariablePlace(Activation act, String name, int line) {
            this.act = act;
            this.name = name;
            this.line = line;
        }

        @Override public String label() { return name; }

        @Override public Value read() { return VariableAccess.this.read(act, name, line); }

        @Override public void write(Process writer, Value value) {
            assignScalar(writer.id(), act, name, value, line);
        }
    }

    /** Un elemento de arreglo, con el indice ya controlado. */
    private final class ElementPlace implements Place {
        private final Activation act;
        private final String name;
        private final ArraySlot slot;
        private final int line;

        ElementPlace(Activation act, String name, ArraySlot slot, int line) {
            this.act = act;
            this.name = name;
            this.slot = slot;
            this.line = line;
        }

        @Override public String label() { return name + "[" + slot.index() + "]"; }

        @Override public Value read() { return slot.array().get(slot.index()); }

        @Override public void write(Process writer, Value value) {
            slot.array().set(slot.index(),
                    value.assignTo(slot.array().elementType(), label(), line));
            touchIfMonitorVar(writer.id(), act, name);
        }
    }

    /** Un elemento de un arreglo, con el indice ya controlado. */
    record ArraySlot(Value.ArrayVal array, int index) { }

    /**
     * El elemento {@code name[indexExpr]}: evalua el indice, busca el arreglo y controla el
     * rango, en ese orden.
     */
    ArraySlot arraySlot(Activation act, String name, Expr indexExpr, int line) {
        long index = evaluator(act).evalLong(indexExpr);
        Value.ArrayVal arr = asArray(act, name, line);
        return new ArraySlot(arr, checkIndex(arr, index, name, line));
    }

    Value.ArrayVal asArray(Activation act, String name, int line) {
        Value v = read(act, name, line);
        if (v instanceof Value.ArrayVal arr) return arr;
        throw new RuntimeError("'" + name + "' no es un arreglo", line);
    }

    Value.QueueVal asQueue(Activation act, String name, int line) {
        Value v = read(act, name, line);
        if (v instanceof Value.QueueVal q) return q;
        throw new RuntimeError("'" + name + "' no es una cola", line);
    }

    /** @return el indice como int, una vez controlado que esta dentro del arreglo */
    static int checkIndex(Value.ArrayVal arr, long idx, String name, int line) {
        if (idx < 0 || idx >= arr.size()) {
            throw RuntimeError.indexOutOfRange(idx, name, arr.size(), line);
        }
        return (int) idx;
    }

    /**
     * Marca como escrita una permanente que cambio por dentro (un elemento de arreglo, una
     * cola), para que la interfaz pinte al ultimo escritor.
     */
    void touchIfMonitorVar(int writerId, Activation act, String name) {
        if (act.isProcedure()) {
            Monitor m = monitors.get(act.monitorName());
            if (m.hasVar(name)) {
                m.setVar(name, m.getVar(name), writerId, clock.instant());
            }
        }
    }

    /**
     * El valor a guardar en una variable que hoy vale {@code prev}: su tipo es el de la
     * declaracion. Un arreglo o una cola no se reemplazan enteros (el compilador ya lo
     * rechaza; esto cubre lo que llega en ejecucion).
     */
    private static Value coerceLike(Value prev, Value value, String name, int line) {
        return switch (prev) {
            case Value.IntVal ignored -> value.assignTo(Type.INT, name, line);
            case Value.DoubleVal ignored -> value.assignTo(Type.DOUBLE, name, line);
            case Value.BoolVal ignored -> value.assignTo(Type.BOOLEAN, name, line);
            case Value.TextVal ignored -> value.assignTo(Type.TEXT, name, line);
            case Value.ArrayVal ignored -> throw new RuntimeError("No se puede asignar el arreglo '"
                    + name + "' completo: hay que indicar el índice", line);
            case Value.QueueVal ignored -> throw new RuntimeError("No se puede asignar la cola '"
                    + name + "': se usa con push y pop", line);
        };
    }
}
