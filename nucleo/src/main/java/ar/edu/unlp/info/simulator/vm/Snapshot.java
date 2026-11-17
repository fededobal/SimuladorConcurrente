package ar.edu.unlp.info.simulator.vm;

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

    /**
     * Variable con su valor renderizado, quien la escribio por ultima vez y en que instante
     * ({@code lastWriteInstant}; null si nunca se escribio o si es una local). Un arreglo o una
     * cola trae ademas sus elementos uno por uno (los primeros {@link Value#SHOWN_ELEMENTS};
     * {@code size} es el total), para que la interfaz los dibuje como celdas; en un escalar
     * {@code elements} es null y {@code size} 0.
     */
    public record VarView(String name, String type, String value, boolean isArray,
                          Integer lastWriterId, Integer lastWriteInstant,
                          List<String> elements, int size) { }

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
     * {@code delayRemaining} son los instantes que le quedan demorado por un delay (0: vuelve
     * a estar listo en el proximo), o null si no esta demorado.
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
                              List<String> holding,
                              Integer delayRemaining) { }
}
