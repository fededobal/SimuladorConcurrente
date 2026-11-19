package ar.edu.unlp.info.simulator.vm;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * {@link SeededRandom} tiene que dar exactamente lo mismo que java.util.Random en la JVM: asi las
 * semillas de los tests no cambian y el navegador, que compila este mismo codigo, coincide.
 * La coincidencia con el navegador la controla el smoke (traza fija del ejemplo 02).
 */
class SeededRandomTest {

    @Test
    void nextIntMatchesJavaUtilRandom() {
        for (long seed : new long[] {0, 1, 7, 42, 123456789L, -5, 1695480000000L}) {
            SeededRandom rng = new SeededRandom(seed);
            Random random = new Random(seed);
            for (int i = 0; i < 2000; i++) {
                int bound = 1 + (i % 150);
                assertEquals(random.nextInt(bound), rng.nextInt(bound), "semilla " + seed);
            }
        }
    }

    @Test
    void shuffleMatchesCollectionsShuffle() {
        for (long seed = 0; seed < 50; seed++) {
            List<Integer> a = new ArrayList<>();
            for (int i = 0; i < 1 + seed % 30; i++) a.add(i);
            List<Integer> b = new ArrayList<>(a);
            new SeededRandom(seed).shuffle(a);
            Collections.shuffle(b, new Random(seed));
            assertEquals(b, a, "semilla " + seed);
        }
    }

    /** Misma traza que scripts/smoke-motor.mjs: si cambia aca, cambia en el navegador. */
    @Test
    void exclusionExampleTraceWithFixedSeed() throws Exception {
        String code = java.nio.file.Files.readString(java.nio.file.Path.of("..", "ejemplos",
                "01-exclusion-mutua.mon"));
        VirtualMachine vm = ar.edu.unlp.info.simulator.TestSupport.compileAndBuild(code, 0);
        StringBuilder trace = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            for (LogEntry e : vm.step(null, SchedulingPolicy.RANDOM)) {
                trace.append(e.processId()).append(e.kind().charAt(0)).append(' ');
            }
            trace.append("| ");
        }
        assertEquals(TRACE_01_SEED_0, trace.toString().trim());
    }

    static final String TRACE_01_SEED_0 = "5E 3B 4B 1B | 2B 5D | | | 5A | 5R 2E |";

    /** Con una cota que no entra en un int, coincide con {@code Random.nextLong(cota)}. */
    @Test
    void nextLongWithLargeBoundMatchesJavaUtilRandom() {
        long[] bounds = {1L << 31, (1L << 31) + 1, 4_000_000_006L, 1L << 40, Long.MAX_VALUE};
        for (long seed : new long[] {0, 1, 7, 42, -5, 1695480000000L}) {
            SeededRandom rng = new SeededRandom(seed);
            Random random = new Random(seed);
            for (int i = 0; i < 500; i++) {
                long bound = bounds[i % bounds.length];
                assertEquals(random.nextLong(bound), rng.nextLong(bound), "semilla " + seed);
            }
        }
    }

    /** Con una cota chica es la misma tirada que nextInt. */
    @Test
    void nextLongWithSmallBoundIsNextInt() {
        SeededRandom a = new SeededRandom(9);
        SeededRandom b = new SeededRandom(9);
        for (int bound = 1; bound < 300; bound++) {
            assertEquals(a.nextInt(bound), b.nextLong(bound));
        }
    }

    /**
     * Los valores de random(inf, sup) con una semilla fija. Misma traza que
     * scripts/smoke-motor.mjs: si cambia aca, tiene que cambiar en el navegador.
     */
    @Test
    void randomValuesWithFixedSeed() {
        VirtualMachine vm = ar.edu.unlp.info.simulator.TestSupport.compileAndBuild(RANDOM_PROGRAM, 0);
        for (int i = 0; i < 200 && !vm.isFinished(); i++) vm.step(null, SchedulingPolicy.ROUND_ROBIN);
        String values = vm.snapshot().monitors().get(0).vars().get(0).value();
        assertEquals(RANDOM_VALUES_SEED_0, values);
    }

    static final String RANDOM_PROGRAM = """
            monitor M { text valores = ""; procedure anotar(v: in int) { valores = valores + v + " "; } }
            process P { for (1..10) { M.anotar(random(1, 100)); } M.anotar(random(-5, 4000000000)); }
            """;
    static final String RANDOM_VALUES_SEED_0 = "61 49 30 48 16 54 92 62 20 55 1431678132 ";
}
