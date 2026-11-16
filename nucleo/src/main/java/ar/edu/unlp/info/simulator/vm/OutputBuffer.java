package ar.edu.unlp.info.simulator.vm;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * Pantalla de salida de {@code write}. Conserva las ultimas lineas: un bucle largo no puede
 * comerse la memoria, y lo que el programa escribe ahora es lo que importa ver.
 */
final class OutputBuffer {

    /** Tope de lineas guardadas. */
    static final int MAX_LINES = 500;

    private final Deque<Snapshot.OutputLine> lines = new ArrayDeque<>();
    /** Lineas descartadas por el tope: se avisa al principio de la salida. */
    private int discarded = 0;

    void add(int instant, Process p, String text) {
        lines.addLast(new Snapshot.OutputLine(instant, p.name(), p.color(), text));
        if (lines.size() > MAX_LINES) {
            lines.removeFirst();
            discarded++;
        }
    }

    /** La salida guardada, con un aviso adelante si el tope descarto lineas anteriores. */
    List<Snapshot.OutputLine> view() {
        List<Snapshot.OutputLine> out = new ArrayList<>(lines.size() + 1);
        if (discarded > 0) {
            out.add(new Snapshot.OutputLine(lines.peekFirst().instant(), "", "#888888",
                    "… se descartaron " + discarded
                            + " líneas anteriores (se muestran las últimas " + MAX_LINES + ")"));
        }
        out.addAll(lines);
        return out;
    }
}
