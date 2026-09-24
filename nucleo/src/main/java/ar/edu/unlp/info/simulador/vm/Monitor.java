package ar.edu.unlp.info.simulador.vm;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Instancia de un monitor en tiempo de ejecucion: estado (variables permanentes), variables
 * condicion, lock de exclusion mutua y cola de entrada.
 */
public final class Monitor {

    private final String name;
    private final Map<String, Value> vars = new LinkedHashMap<>();
    private final Map<String, ConditionVariable> conds = new LinkedHashMap<>();
    /**
     * Tamano de cada arreglo de cond ({@code cond turno[5]}), para informar un indice fuera de
     * rango.
     */
    private final Map<String, Integer> condArraySizes = new LinkedHashMap<>();
    /** Ultimo proceso que escribio cada variable permanente (para el color-coding de la UI). */
    private final Map<String, Integer> lastWriter = new LinkedHashMap<>();

    /** Proceso que tiene el acceso exclusivo, o null si el monitor esta libre. */
    private Process lockOwner;
    /**
     * Procesos que compiten por entrar (llamaron con el monitor ocupado, o fueron despertados),
     * en orden de llegada: al liberarse el monitor, entra el primero (ADR 0005).
     */
    private final Deque<Process> entryQueue = new ArrayDeque<>();

    public Monitor(String name) {
        this.name = name;
    }

    public String name() { return name; }

    public Map<String, Value> vars() { return vars; }

    public Map<String, ConditionVariable> conds() { return conds; }

    public Value getVar(String n) { return vars.get(n); }

    public void setVar(String n, Value v, int writerId) {
        vars.put(n, v);
        lastWriter.put(n, writerId);
    }

    public boolean hasVar(String n) { return vars.containsKey(n); }

    public Integer lastWriter(String n) { return lastWriter.get(n); }

    public ConditionVariable cond(String n) { return conds.get(n); }

    public Map<String, Integer> condArraySizes() { return condArraySizes; }

    public Process lockOwner() { return lockOwner; }

    public void setLockOwner(Process p) { this.lockOwner = p; }

    public boolean isFree() { return lockOwner == null; }

    public Deque<Process> entryQueue() { return entryQueue; }

    public List<Process> entryQueueSnapshot() { return new ArrayList<>(entryQueue); }
}
