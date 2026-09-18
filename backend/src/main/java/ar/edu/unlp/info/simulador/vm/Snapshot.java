package ar.edu.unlp.info.simulador.vm;

import java.util.List;

/**
 * Fotografia inmutable del estado completo de la simulacion en un instante. Cada
 * {@link LogEntry} lleva una; el frontend las acumula para el time-travel.
 */
public record Snapshot(int instant,
                       List<ProcessView> processes,
                       List<MonitorView> monitors,
                       List<VarView> constants) {

    /** Referencia liviana a un proceso (para colas). */
    public record ProcRef(int id, String name, String color) { }

    /** Variable con su valor renderizado y quien la escribio por ultima vez. */
    public record VarView(String name, String type, String value, boolean isArray, Integer lastWriterId) { }

    public record CondView(String name, List<ProcRef> queue) { }

    public record MonitorView(String name,
                              List<VarView> vars,
                              List<CondView> conds,
                              ProcRef lockOwner,
                              List<ProcRef> entryQueue) { }

    public record ProcessView(int id,
                              String name,
                              String color,
                              String state,
                              String blockReason,
                              String blockedOn,
                              String location,
                              int line,
                              List<VarView> locals,
                              String error) { }
}
