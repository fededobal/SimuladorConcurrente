package ar.edu.unlp.info.simulator.vm;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Protocolo de los monitores: exclusion mutua implicita, cola de entrada, traspaso del
 * monitor al liberarse y variables condicion con la disciplina <em>signal and continue</em>.
 * Lo usa {@link VirtualMachine} al llamar a un procedure, al retornar, en wait/signal y
 * cuando un proceso termina con error.
 */
final class MonitorProtocol {

    /** Donde se registran los eventos del protocolo, en el instante en curso. */
    @FunctionalInterface
    interface EventSink {
        void event(Process p, EventKind kind, String resource, String message);
    }

    private final Map<String, Monitor> monitors;
    /** El mismo azar que el scheduler: el orden en que se consume es parte de la semilla. */
    private final SeededRandom random;
    /**
     * Los procesos que avanzaron en el instante (la lista es de la VM): el que recibe el
     * monitor por traspaso cuenta como que avanzo.
     */
    private final List<Integer> advancedLastStep;
    private final EventSink events;

    MonitorProtocol(Map<String, Monitor> monitors, SeededRandom random,
            List<Integer> advancedLastStep, EventSink events) {
        this.monitors = monitors;
        this.random = random;
        this.advancedLastStep = advancedLastStep;
        this.events = events;
    }

    /**
     * Termina el proceso con error, lo registra en el log y suelta sus monitores. Sin esto el
     * lock queda en manos de un proceso muerto y los demas se bloquean para siempre: la UI
     * mostraria un DEADLOCK que el programa del alumno no tiene.
     */
    void fail(Process p, String message) {
        p.fail(message);
        event(p, EventKind.ERROR, "", p.name() + ": error de ejecución - " + message);
        for (Monitor m : heldBy(p)) {
            event(p, EventKind.RELEASE, m.name(),
                    p.name() + ": libera " + m.name() + " al terminar con error");
            release(m);
        }
    }

    /**
     * Toma el monitor de la activacion o espera en su cola de entrada. Sirve para las dos
     * situaciones en que un proceso compite por un monitor: la primera entrada a un
     * procedure y la vuelta de un wait.
     */
    void acquire(Process p, Activation act) {
        Monitor m = monitors.get(act.monitorName());
        if (!m.isFree()) {
            enqueueEntrant(p, m);
            event(p, EventKind.BLOCKED, m.name(), p.name() + ": espera para "
                    + (act.isEntering() ? "entrar a " : "reingresar a ") + destination(act, m));
            return;
        }
        takeMonitor(p, act, m);
    }

    /** El proceso toma el monitor libre para la activacion que lo necesitaba. */
    private void takeMonitor(Process p, Activation act, Monitor m) {
        String target = destination(act, m);
        m.setLockOwner(p);
        act.setNeedsLock(false);
        if (act.isEntering()) {
            act.setEntering(false);
            event(p, EventKind.ENTER, m.name(), p.name() + ": entra a " + target);
        } else {
            event(p, EventKind.REENTER, m.name(), p.name() + ": reingresa a " + target);
        }
    }

    /**
     * Como lo nombran los eventos: {@code Monitor.procedure} al entrar a un procedure, y solo
     * el monitor al volver de un wait.
     */
    private static String destination(Activation act, Monitor m) {
        return act.isEntering() ? m.name() + "." + act.procedureName() : m.name();
    }

    /** El proceso pasa a competir por el monitor desde su cola de entrada. */
    private static void enqueueEntrant(Process p, Monitor m) {
        m.addEntrant(p);
        p.block(Process.BlockReason.MONITOR_ENTRY, m.name());
    }

    /** Los monitores que tiene tomados el proceso, en orden de declaracion. */
    List<Monitor> heldBy(Process p) {
        List<Monitor> held = new ArrayList<>();
        for (Monitor m : monitors.values()) {
            if (m.lockOwner() == p) held.add(m);
        }
        return held;
    }

    /**
     * Suelta el monitor y se lo pasa a uno de los que compiten por el, que entra en ese
     * momento: esa entrada es su accion del instante (ADR 0005). Cual entra se elige al azar
     * entre todos los de la cola de entrada, sin importar el orden de llegada, porque asi lo
     * explica la catedra (ADR 0006). Si hay uno solo no se sortea, para no consumir azar.
     *
     * <p>El que llama ya registro su evento de salida (RETURN, WAIT o RELEASE): el ENTER del
     * que entra tiene que quedar despues en el log.
     */
    void release(Monitor m) {
        m.setLockOwner(null);
        while (m.isFree() && m.entrantCount() > 0) {
            int n = m.entrantCount();
            Process w = m.removeEntrant(n == 1 ? 0 : random.nextInt(n));
            w.unblock();
            if (!advancedLastStep.contains(w.id())) advancedLastStep.add(w.id());
            try {
                takeMonitor(w, w.current(), m);
            } catch (RuntimeError re) {
                // un out que falla al escribirse al reingresar es un error de w, no del que
                // solto el monitor; fail vuelve a soltarlo para el siguiente
                fail(w, re.getMessage());
            }
        }
    }

    /** El proceso se demora en la cond y suelta el monitor; al despertar tendra que retomarlo. */
    void waitOn(Process p, Activation act, Monitor m, ConditionVariable cv, String key) {
        cv.enqueue(p);
        p.block(Process.BlockReason.COND_WAIT, m.name() + "." + key);
        act.setNeedsLock(true);
        event(p, EventKind.WAIT, m.name() + "." + key,
                p.name() + ": wait(" + key + ") - libera el monitor y se demora");
        release(m);
    }

    /** Signal and continue: el despertado pasa a competir por el monitor y el que senala sigue. */
    void signal(Process p, Monitor m, ConditionVariable cv, String key) {
        if (cv.isEmpty()) {
            event(p, EventKind.SIGNAL, m.name() + "." + key,
                    p.name() + ": signal(" + key + ") - sin efecto (cola vacía)");
            return;
        }
        Process w = cv.dequeue();
        enqueueEntrant(w, m);
        event(p, EventKind.SIGNAL, m.name() + "." + key,
                p.name() + ": signal(" + key + ") - despierta a " + w.name()
                        + " (compite por el monitor)");
    }

    void signalAll(Process p, Monitor m, ConditionVariable cv, String key) {
        List<Process> all = cv.drain();
        for (Process w : all) enqueueEntrant(w, m);
        event(p, EventKind.SIGNAL_ALL, m.name() + "." + key,
                p.name() + ": signal_all(" + key + ") - despierta a " + all.size()
                        + " proceso(s)");
    }

    private void event(Process p, EventKind kind, String resource, String message) {
        events.event(p, kind, resource, message);
    }
}
