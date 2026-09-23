package ar.edu.unlp.info.simulador.vm;

/** Politica de seleccion del proceso que avanza en cada instante. */
public enum SchedulingPolicy {
    /**
     * En cada instante avanza un subconjunto al azar de los listos (al menos uno), en orden al
     * azar.
     */
    RANDOM,
    /**
     * Avanzan todos los listos, en orden circular empezando por el siguiente al del instante
     * anterior.
     */
    ROUND_ROBIN
}
