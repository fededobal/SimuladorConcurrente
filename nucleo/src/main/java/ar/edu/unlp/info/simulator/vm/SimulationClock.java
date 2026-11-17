package ar.edu.unlp.info.simulator.vm;

/**
 * El reloj de la simulacion: el instante logico. Es la unica unidad de tiempo del nucleo:
 * tambien {@code delay} se mide en instantes (ADR 0008), asi que la ejecucion no depende de
 * la hora real y una misma semilla la repite igual.
 */
final class SimulationClock {

    private int instant = 0;

    int instant() {
        return instant;
    }

    /** Empieza un instante nuevo. */
    void tick() {
        instant++;
    }
}
