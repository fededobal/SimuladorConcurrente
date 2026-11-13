package ar.edu.unlp.info.simulador.vm;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Instancia de un monitor en tiempo de ejecucion: estado (variables permanentes), variables
 * condicion, lock de exclusion mutua y cola de entrada.
 */
public final class Monitor {

    private final String name;
    /** Nombre del monitor en el programa: el mismo que {@code name}, o la familia si es un arreglo. */
    private final String definition;
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
     * Procesos que compiten por entrar (llamaron con el monitor ocupado, o fueron despertados).
     * Se guardan en orden de llegada solo para mostrarlos; al liberarse el monitor entra
     * cualquiera de ellos, elegido al azar (ADR 0006).
     */
    private final List<Process> entryQueue = new ArrayList<>();

    public Monitor(String name, String definition) {
        this.name = name;
        this.definition = definition;
    }

    public String name() { return name; }

    public String definition() { return definition; }

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

    /** El proceso pasa a competir por el monitor. */
    public void addEntrant(Process p) { entryQueue.add(p); }

    public int entrantCount() { return entryQueue.size(); }

    /** Saca de la cola de entrada al proceso de la posicion indicada. */
    public Process removeEntrant(int index) { return entryQueue.remove(index); }

    public List<Process> entryQueueSnapshot() { return new ArrayList<>(entryQueue); }
}
