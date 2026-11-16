package ar.edu.unlp.info.simulator.vm;

import ar.edu.unlp.info.simulator.lang.parser.ast.Stmt;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Marco de activacion: el cuerpo de un proceso o de un procedure de monitor en ejecucion.
 * La ejecucion avanza consumiendo sentencias de {@link #pending}.
 */
public final class Activation {

    /** Nombre del monitor si es la activacion de un procedure; null si es el cuerpo del proceso. */
    private final String monitorName;
    private final String procedureName;

    /** Variables visibles en este marco (parametros + locales + iterador de for). */
    private final Map<String, Value> locals = new LinkedHashMap<>();

    /** Sentencias pendientes de ejecutar (se consumen del frente). */
    private final Deque<Stmt> pending = new ArrayDeque<>();

    /** Parametros out: nombre del parametro -> lugar del llamador donde copiar al retornar. */
    private final Map<String, LValue> outBindings = new LinkedHashMap<>();

    /**
     * true si el proceso tiene que tomar el monitor de esta activacion antes de seguir: al
     * entrar al procedure o al volver de un wait.
     */
    private boolean needsLock = false;

    /** true mientras el proceso todavia no entro al procedure (espera en la cola de entrada). */
    private boolean entering = false;

    private int currentLine = -1;

    public Activation(String monitorName, String procedureName) {
        this.monitorName = monitorName;
        this.procedureName = procedureName;
    }

    public static Activation processFrame() {
        return new Activation(null, null);
    }

    public String monitorName() { return monitorName; }
    public String procedureName() { return procedureName; }
    public boolean isProcedure() { return monitorName != null; }

    public Map<String, Value> locals() { return locals; }
    public Deque<Stmt> pending() { return pending; }
    public Map<String, LValue> outBindings() { return outBindings; }

    public void pushFront(List<Stmt> stmts) {
        for (int i = stmts.size() - 1; i >= 0; i--) {
            pending.addFirst(stmts.get(i));
        }
    }

    public void pushFront(Stmt stmt) {
        pending.addFirst(stmt);
    }

    public boolean needsLock() { return needsLock; }
    public void setNeedsLock(boolean v) { this.needsLock = v; }

    public boolean isEntering() { return entering; }
    public void setEntering(boolean v) { this.entering = v; }

    public int currentLine() { return currentLine; }
    public void setCurrentLine(int line) { this.currentLine = line; }
}
