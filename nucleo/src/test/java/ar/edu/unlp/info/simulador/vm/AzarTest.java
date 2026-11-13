package ar.edu.unlp.info.simulador.vm;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * {@link Azar} tiene que dar exactamente lo mismo que java.util.Random en la JVM: asi las
 * semillas de los tests no cambian y el navegador, que compila este mismo codigo, coincide.
 * La coincidencia con el navegador la controla el smoke (traza fija del ejemplo 02).
 */
class AzarTest {

    @Test
    void nextIntCoincideConJavaUtilRandom() {
        for (long semilla : new long[] {0, 1, 7, 42, 123456789L, -5, 1695480000000L}) {
            Azar azar = new Azar(semilla);
            Random random = new Random(semilla);
            for (int i = 0; i < 2000; i++) {
                int cota = 1 + (i % 150);
                assertEquals(random.nextInt(cota), azar.nextInt(cota), "semilla " + semilla);
            }
        }
    }

    @Test
    void mezclarCoincideConCollectionsShuffle() {
        for (long semilla = 0; semilla < 50; semilla++) {
            List<Integer> a = new ArrayList<>();
            for (int i = 0; i < 1 + semilla % 30; i++) a.add(i);
            List<Integer> b = new ArrayList<>(a);
            new Azar(semilla).mezclar(a);
            Collections.shuffle(b, new Random(semilla));
            assertEquals(b, a, "semilla " + semilla);
        }
    }

    /** Misma traza que scripts/smoke-motor.mjs: si cambia aca, cambia en el navegador. */
    @Test
    void trazaDelEjemploDeExclusionConSemillaFija() throws Exception {
        String codigo = java.nio.file.Files.readString(java.nio.file.Path.of("..", "ejemplos",
                "02-exclusion-mutua.mon"));
        VirtualMachine vm = ar.edu.unlp.info.simulador.TestSupport.compileAndBuild(codigo, 0);
        StringBuilder traza = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            for (LogEntry e : vm.step(null, SchedulingPolicy.RANDOM)) {
                traza.append(e.processId()).append(e.kind().charAt(0)).append(' ');
            }
            traza.append("| ");
        }
        assertEquals(TRAZA_02_SEMILLA_0, traza.toString().trim());
    }

    static final String TRAZA_02_SEMILLA_0 = "4E 1B 2B | 4A 3B | 4A | 4A | 4A | 4R 3E |";
}
