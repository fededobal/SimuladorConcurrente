package ar.edu.unlp.info.simulador.vm;

/**
 * Los dos relojes de la simulacion: el instante logico, que cuenta los pasos en que avanzo
 * algun proceso, y la hora en ms, que solo usa delay. La hora no la lee el nucleo (es
 * determinista): la informa quien pide cada paso, y nunca retrocede.
 */
final class SimulationClock {

    private int instant = 0;
    private long nowMs = 0;

    int instant() {
        return instant;
    }

    /** Empieza un instante nuevo. */
    void tick() {
        instant++;
    }

    long nowMs() {
        return nowMs;
    }

    /** Adelanta la hora a {@code ms}; una hora anterior a la actual se ignora. */
    void advanceTo(long ms) {
        nowMs = Math.max(nowMs, ms);
    }
}
