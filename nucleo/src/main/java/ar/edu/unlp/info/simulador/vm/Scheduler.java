package ar.edu.unlp.info.simulador.vm;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Decide que procesos avanzan en cada instante y en que orden, segun la politica elegida.
 * Usa el mismo {@link Azar} que la maquina virtual: el orden en que se consume el azar es
 * parte del resultado de una semilla.
 */
final class Scheduler {

    /** Probabilidad (en %) de que un proceso listo avance en un instante dado. */
    private static final int PROB_AVANCE = 80;

    /** Todos los procesos, en orden de id; la maquina virtual es la duena de la lista. */
    private final List<Process> processes;
    private final Azar random;
    /** Posicion del ultimo proceso que arranco un turno de round robin. */
    private int rrCursor = -1;

    Scheduler(List<Process> processes, Azar random) {
        this.processes = processes;
        this.random = random;
    }

    /**
     * Los procesos que avanzan en este instante, en el orden en que lo hacen.
     *
     * <p>No avanzan siempre todos: cada proceso listo entra al turno con probabilidad alta
     * pero no segura, y siempre entra al menos uno. Si avanzaran todos en cada instante el
     * programa correria en lockstep y los alumnos verian siempre el mismo entrelazado; que
     * unos avancen mas rapido que otros es lo que hace aparecer los casos raros.
     */
    List<Process> nextTurn(Integer chosenProcessId, SchedulingPolicy policy) {
        List<Process> listos = processes.stream()
                .filter(Process::isReady)
                .collect(Collectors.toCollection(ArrayList::new));
        if (listos.isEmpty()) {
            return List.of();
        }
        // Paso a paso: el usuario eligio un proceso y quiere ver solo ese.
        if (chosenProcessId != null) {
            for (Process pr : listos) {
                if (pr.id() == chosenProcessId) return List.of(pr);
            }
        }

        if (policy == SchedulingPolicy.ROUND_ROBIN) {
            // Turnos parejos: se empieza por el siguiente al ultimo que arranco.
            int n = processes.size();
            List<Process> orden = new ArrayList<>();
            for (int k = 1; k <= n; k++) {
                Process cand = processes.get((rrCursor + k) % n);
                if (cand.isReady()) orden.add(cand);
            }
            rrCursor = processes.indexOf(orden.get(0));
            return orden;
        }

        random.mezclar(listos);
        List<Process> turno = new ArrayList<>();
        for (Process pr : listos) {
            if (random.nextInt(100) < PROB_AVANCE) turno.add(pr);
        }
        if (turno.isEmpty()) {
            turno.add(listos.get(0));   // el shuffle ya lo eligio al azar
        }
        return turno;
    }
}
