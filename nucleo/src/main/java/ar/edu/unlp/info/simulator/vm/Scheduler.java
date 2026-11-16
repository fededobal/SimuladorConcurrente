package ar.edu.unlp.info.simulator.vm;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Decide que procesos avanzan en cada instante y en que orden, segun la politica elegida.
 * Usa el mismo {@link SeededRandom} que la maquina virtual: el orden en que se consume el azar es
 * parte del resultado de una semilla.
 */
final class Scheduler {

    /** Probabilidad (en %) de que un proceso listo avance en un instante dado. */
    private static final int ADVANCE_PROBABILITY = 80;

    /** Todos los procesos, en orden de id; la maquina virtual es la duena de la lista. */
    private final List<Process> processes;
    private final SeededRandom random;
    /** Posicion del ultimo proceso que arranco un turno de round robin. */
    private int rrCursor = -1;

    Scheduler(List<Process> processes, SeededRandom random) {
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
        List<Process> ready = processes.stream()
                .filter(Process::isReady)
                .collect(Collectors.toCollection(ArrayList::new));
        if (ready.isEmpty()) {
            return List.of();
        }
        // Paso a paso: el usuario eligio un proceso y quiere ver solo ese.
        if (chosenProcessId != null) {
            for (Process pr : ready) {
                if (pr.id() == chosenProcessId) return List.of(pr);
            }
        }

        return policy == SchedulingPolicy.ROUND_ROBIN ? roundRobinTurn() : randomTurn(ready);
    }

    /** Turnos parejos: todos los listos, empezando por el siguiente al ultimo que arranco. */
    private List<Process> roundRobinTurn() {
        int n = processes.size();
        List<Process> order = new ArrayList<>();
        for (int k = 1; k <= n; k++) {
            Process candidate = processes.get((rrCursor + k) % n);
            if (candidate.isReady()) order.add(candidate);
        }
        rrCursor = processes.indexOf(order.get(0));
        return order;
    }

    /**
     * Los listos en orden al azar; cada uno entra con probabilidad {@link #ADVANCE_PROBABILITY} y,
     * si no entra ninguno, avanza el primero.
     */
    private List<Process> randomTurn(List<Process> ready) {
        random.shuffle(ready);
        List<Process> turn = new ArrayList<>();
        for (Process pr : ready) {
            if (random.nextInt(100) < ADVANCE_PROBABILITY) turn.add(pr);
        }
        if (turn.isEmpty()) {
            turn.add(ready.get(0));   // el shuffle ya lo eligio al azar
        }
        return turn;
    }
}
