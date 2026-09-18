package ar.edu.unlp.info.simulador.vm;

/** Politica de seleccion del proceso que avanza en cada instante. */
public enum SchedulingPolicy {
    /** Uno al azar entre los listos. */
    RANDOM,
    /** El siguiente en orden circular entre los listos. */
    ROUND_ROBIN
}
