package ar.edu.unlp.info.simulador.vm;

import java.util.List;

/**
 * Generador pseudoaleatorio del scheduler. Reproduce el algoritmo de {@link java.util.Random}
 * (congruencial de 48 bits) y el de {@link java.util.Collections#shuffle}, pero escrito aca.
 *
 * <p>Por que no usar la biblioteca: TeaVM trae su propia {@code Random}, con el mismo
 * generador pero otro {@code nextInt(bound)}. Con la misma semilla, el navegador ejecutaba
 * otro entrelazado que la JVM, y los tests probaban corridas que ningun alumno veia. Este
 * codigo se compila igual en los dos lados.
 */
final class SeededRandom {

    private static final long MULTIPLIER = 0x5DEECE66DL;
    private static final long INCREMENT = 0xBL;
    private static final long MASK = (1L << 48) - 1;

    private long state;

    SeededRandom(long seed) {
        this.state = (seed ^ MULTIPLIER) & MASK;
    }

    private int next(int bits) {
        state = (state * MULTIPLIER + INCREMENT) & MASK;
        return (int) (state >>> (48 - bits));
    }

    /** Entero uniforme en [0, cota), con el mismo algoritmo que {@code Random.nextInt(int)}. */
    int nextInt(int bound) {
        int r = next(31);
        int m = bound - 1;
        if ((bound & m) == 0) {
            return (int) ((bound * (long) r) >> 31);
        }
        int u = r;
        while (u - (r = u % bound) + m < 0) {
            u = next(31);
        }
        return r;
    }

    /** Mezcla la lista en el lugar, como {@code Collections.shuffle(lista, random)}. */
    <T> void shuffle(List<T> list) {
        for (int i = list.size(); i > 1; i--) {
            int j = nextInt(i);
            T tmp = list.get(i - 1);
            list.set(i - 1, list.get(j));
            list.set(j, tmp);
        }
    }
}
