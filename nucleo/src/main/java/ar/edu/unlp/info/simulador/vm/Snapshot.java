package ar.edu.unlp.info.simulador.vm;

import java.util.List;

/**
 * Fotografia inmutable del estado completo de la simulacion en un instante. Se pide con
 * {@link VirtualMachine#snapshot()} despues de cada paso; los eventos no la llevan.
 */
public record Snapshot(int instant,
                       List<ProcessView> processes,
                       List<MonitorView> monitors,
                       List<OutputLine> output) {

    /** Linea escrita con {@code write}, con el proceso que la escribio (para pintarla). */
    public record OutputLine(int instant, String process, String color, String text) { }

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

    /**
     * Estado de un proceso. {@code advanceOrder} es su posicion en el turno del ultimo
     * instante (0 el primero que avanzo) o -1 si no avanzo. {@code holding} son los monitores
     * que tiene tomados: con llamadas cerradas puede retener uno mientras espera en otro.
     */
    public record ProcessView(int id,
                              String name,
                              String color,
                              String state,
                              String blockReason,
                              String blockedOn,
                              String location,
                              int line,
                              List<VarView> locals,
                              String error,
                              boolean advanced,
                              int advanceOrder,
                              List<String> holding) { }
}
