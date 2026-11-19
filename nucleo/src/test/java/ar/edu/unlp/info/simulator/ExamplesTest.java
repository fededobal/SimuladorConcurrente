package ar.edu.unlp.info.simulator;

import ar.edu.unlp.info.simulator.TestSupport.RunResult;
import ar.edu.unlp.info.simulator.vm.SchedulingPolicy;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
    /** Una linea "#define NOMBRE valor": lo que el alumno cambia desde el menu Constantes. */
    private static final Pattern DEFINE = Pattern.compile("(?m)^(#define\\s+\\w+\\s+)\\d+");
    /** Valores que se le dan a cada constante, y semillas con las que se corre cada uno. */
    private static final int MAX_CONSTANT = 8;
    private static final int CONSTANT_SEEDS = 8;

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

    /**
     * Un ejemplo no depende del valor que trae su constante: con otra cantidad de procesos
     * termina igual (o da deadlock igual, si es el de deadlock). El banco atendia una
     * cantidad fija de clientes y con otro N quedaba un empleado dormido para siempre.
     */
    @TestFactory
    Stream<DynamicTest> eachExampleHoldsWithOtherConstantValues() throws IOException {
        List<Path> fileNames;
        try (Stream<Path> s = Files.list(DIR)) {
            fileNames = s.filter(p -> p.toString().endsWith(".mon")).sorted().toList();
        }
        List<DynamicTest> tests = new ArrayList<>();
        for (Path p : fileNames) {
            String code = Files.readString(p);
            if (!DEFINE.matcher(code).find()) {
                continue;
            }
            for (int value = 1; value <= MAX_CONSTANT; value++) {
                int v = value;
                tests.add(DynamicTest.dynamicTest(p.getFileName() + " con la constante en " + v,
                        () -> verifyOutcome(withConstants(code, v))));
            }
        }
        assertFalse(tests.isEmpty(), "Ningun ejemplo declara constantes");
        return tests.stream();
    }

    /** El programa con todas sus constantes en ese valor. */
    private static String withConstants(String code, int value) {
        Matcher m = DEFINE.matcher(code);
        return m.replaceAll(r -> Matcher.quoteReplacement(r.group(1) + value));
    }

    /** Solo el desenlace (termina o deadlock): los valores finales dependen de la constante. */
    private static void verifyOutcome(String code) {
        boolean deadlock = code.lines().skip(1).findFirst().orElse("").contains("deadlock");
        for (int seed = 0; seed < CONSTANT_SEEDS; seed++) {
            for (SchedulingPolicy policy : SchedulingPolicy.values()) {
                RunResult r = TestSupport.run(code, policy, seed, 20000);
                if (deadlock) {
                    assertTrue(r.deadlock(), "se esperaba deadlock");
                } else {
                    assertTrue(r.finished(), "se esperaba que termine (" + policy + ", semilla " + seed + ")");
                    assertFalse(r.logs().stream().anyMatch(l -> l.kind().equals("ERROR")),
                            "hubo un error de ejecucion");
                }
            }
        }
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
