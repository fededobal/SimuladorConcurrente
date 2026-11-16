package ar.edu.unlp.info.simulador.vm;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * Registro de eventos de la ejecucion: los del instante en curso, que devuelve cada paso, y
 * los ultimos de toda la ejecucion, para el historial. Numera los eventos en el orden en que
 * ocurren.
 */
final class EventLog {

    /**
     * Tope de eventos guardados. Los eventos no llevan el estado completo (se pide aparte con
     * {@link VirtualMachine#snapshot()}), pero igual un programa que no termina los acumularia
     * sin fin: se conservan solo los ultimos.
     */
    static final int MAX_ENTRIES = 2000;

    private final Deque<LogEntry> log = new ArrayDeque<>();
    /** Eventos del instante en curso. */
    private List<LogEntry> stepEntries = new ArrayList<>();
    private int nextEventId = 0;
    /** false mientras corre el codigo de inicializacion de los monitores, que no se registra. */
    private boolean enabled = true;

    /** Empieza un instante: los eventos que siguen son los que devuelve {@link #stepEntries}. */
    void startStep() {
        stepEntries = new ArrayList<>();
    }

    List<LogEntry> stepEntries() {
        return stepEntries;
    }

    /** Los ultimos eventos (a lo sumo {@link #MAX_ENTRIES}), del mas viejo al mas nuevo. */
    List<LogEntry> all() {
        return List.copyOf(log);
    }

    void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    /** Un evento de un proceso; los del codigo de inicializacion (id negativo) van sin proceso. */
    void processEvent(int instant, Process p, EventKind kind, String resource, String message) {
        if (!enabled) return;
        record(new LogEntry("e" + nextEventId++, instant, p.isSystem() ? null : p.id(),
                p.isSystem() ? null : p.color(), kind.name(), resource, message));
    }

    /** Un evento de la simulacion, sin proceso (el interbloqueo). Se registra siempre. */
    void systemEvent(int instant, EventKind kind, String message) {
        record(new LogEntry("e" + nextEventId++, instant, null, null, kind.name(), "", message));
    }

    private void record(LogEntry e) {
        log.addLast(e);
        if (log.size() > MAX_ENTRIES) log.removeFirst();
        stepEntries.add(e);
    }
}
