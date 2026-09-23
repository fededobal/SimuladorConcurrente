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
final class Azar {

    private static final long MULTIPLICADOR = 0x5DEECE66DL;
    private static final long INCREMENTO = 0xBL;
    private static final long MASCARA = (1L << 48) - 1;

    private long estado;

    Azar(long semilla) {
        this.estado = (semilla ^ MULTIPLICADOR) & MASCARA;
    }

    private int siguiente(int bits) {
        estado = (estado * MULTIPLICADOR + INCREMENTO) & MASCARA;
        return (int) (estado >>> (48 - bits));
    }

    /** Entero uniforme en [0, cota), con el mismo algoritmo que {@code Random.nextInt(int)}. */
    int nextInt(int cota) {
        int r = siguiente(31);
        int m = cota - 1;
        if ((cota & m) == 0) {
            return (int) ((cota * (long) r) >> 31);
        }
        int u = r;
        while (u - (r = u % cota) + m < 0) {
            u = siguiente(31);
        }
        return r;
    }

    /** Mezcla la lista en el lugar, como {@code Collections.shuffle(lista, random)}. */
    <T> void mezclar(List<T> lista) {
        for (int i = lista.size(); i > 1; i--) {
            int j = nextInt(i);
            T tmp = lista.get(i - 1);
            lista.set(i - 1, lista.get(j));
            lista.set(j, tmp);
        }
    }
}
