package ar.edu.unlp.info.simulador;

import ar.edu.unlp.info.simulador.TestSupport.RunResult;
import ar.edu.unlp.info.simulador.vm.SchedulingPolicy;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Corre cada programa de {@code ejemplos/} (los mismos que ofrece la interfaz) y verifica
 * el resultado que declara su segunda linea:
 * <pre>
 * // espera: fin Monitor.var=valor ...
 * // espera: deadlock
 * </pre>
 * Asi un ejemplo que se muestra en clase es, por construccion, un ejemplo probado.
 */
class ExamplesTest {

    private static final Path DIR = Path.of("..", "ejemplos");
    private static final int SEEDS = 25;

    @TestFactory
    Stream<DynamicTest> eachExampleMeetsItsExpectation() throws IOException {
        List<Path> fileNames;
        try (Stream<Path> s = Files.list(DIR)) {
            fileNames = s.filter(p -> p.toString().endsWith(".mon")).sorted().toList();
        }
        assertFalse(fileNames.isEmpty(), "No hay ejemplos en " + DIR.toAbsolutePath());
        return fileNames.stream().map(p -> DynamicTest.dynamicTest(
                p.getFileName().toString(), () -> verify(Files.readString(p))));
    }

    private static void verify(String code) {
        String[] waiting = code.lines().skip(1).findFirst().orElse("")
                .replaceFirst("^//\\s*espera:\\s*", "").trim().split("\\s+");
        List<RunResult> corridas = new ArrayList<>();
        for (int seed = 0; seed < SEEDS; seed++) {
            corridas.add(TestSupport.run(code, SchedulingPolicy.RANDOM, seed, 20000));
        }
        corridas.add(TestSupport.run(code, SchedulingPolicy.ROUND_ROBIN, 0, 20000));

        for (RunResult r : corridas) {
            switch (waiting[0]) {
                case "deadlock" -> assertTrue(r.deadlock(), "se esperaba deadlock");
                case "fin" -> {
                    assertTrue(r.finished(), "se esperaba que termine");
                    assertFalse(r.logs().stream().anyMatch(l -> l.kind().equals("ERROR")),
                            "hubo un error de ejecucion");
                    for (int i = 1; i < waiting.length; i++) {
                        // Monitor.var=valor: se parte en el primer '.' y el primer '=', asi el
                        // valor puede tener puntos (M.d=2.5)
                        int punto = waiting[i].indexOf('.');
                        int igual = waiting[i].indexOf('=');
                        String monitor = waiting[i].substring(0, punto);
                        String var = waiting[i].substring(punto + 1, igual);
                        assertEquals(waiting[i].substring(igual + 1),
                                TestSupport.finalVar(r, monitor, var), waiting[i]);
                    }
                }
                default -> throw new AssertionError(
                        "Segunda linea sin '// espera: fin ...' ni '// espera: deadlock'");
            }
        }
    }
}
