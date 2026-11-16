package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.lang.parser.ast.Expr;
import ar.edu.unlp.info.simulador.lang.parser.ast.Type;

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

    VariableAccess(Map<String, Monitor> monitors) {
        this.monitors = monitors;
    }

    ExprEvaluator evaluator(Activation act) {
        return new ExprEvaluator(scopeOf(act));
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
                m.setVar(name, coerceLike(m.getVar(name), value, name, line), writerId);
                return;
            }
        }
        throw new RuntimeError("Variable no definida: " + name, line);
    }

    /** Escribe el valor de un parametro {@code out} en el lugar del llamador. */
    void writeLValue(int writerId, LValue lv, Value value) {
        Activation act = lv.callerActivation();
        int line = act.currentLine();   // la de la llamada, que sigue siendo la sentencia actual
        if (lv.index() == null) {
            assignScalar(writerId, act, lv.name(), value, line);
        } else {
            Value.ArrayVal arr = asArray(act, lv.name(), line);
            checkIndex(arr, lv.index(), lv.name(), line);
            arr.set(lv.index(), value.assignTo(arr.elementType(), lv.name(), line));
            touchIfMonitorVar(writerId, act, lv.name());
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
                m.setVar(name, m.getVar(name), writerId);
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
