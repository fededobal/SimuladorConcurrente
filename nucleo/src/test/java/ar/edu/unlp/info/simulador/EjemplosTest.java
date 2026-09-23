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
class EjemplosTest {

    private static final Path DIR = Path.of("..", "ejemplos");
    private static final int SEMILLAS = 25;

    @TestFactory
    Stream<DynamicTest> cadaEjemploCumpleLoQueEspera() throws IOException {
        List<Path> archivos;
        try (Stream<Path> s = Files.list(DIR)) {
            archivos = s.filter(p -> p.toString().endsWith(".mon")).sorted().toList();
        }
        assertFalse(archivos.isEmpty(), "No hay ejemplos en " + DIR.toAbsolutePath());
        return archivos.stream().map(p -> DynamicTest.dynamicTest(
                p.getFileName().toString(), () -> verificar(Files.readString(p))));
    }

    private static void verificar(String codigo) {
        String[] espera = codigo.lines().skip(1).findFirst().orElse("")
                .replaceFirst("^//\\s*espera:\\s*", "").trim().split("\\s+");
        List<RunResult> corridas = new ArrayList<>();
        for (int seed = 0; seed < SEMILLAS; seed++) {
            corridas.add(TestSupport.run(codigo, SchedulingPolicy.RANDOM, seed, 20000));
        }
        corridas.add(TestSupport.run(codigo, SchedulingPolicy.ROUND_ROBIN, 0, 20000));

        for (RunResult r : corridas) {
            switch (espera[0]) {
                case "deadlock" -> assertTrue(r.deadlock(), "se esperaba deadlock");
                case "fin" -> {
                    assertTrue(r.finished(), "se esperaba que termine");
                    assertFalse(r.logs().stream().anyMatch(l -> l.kind().equals("ERROR")),
                            "hubo un error de ejecucion");
                    for (int i = 1; i < espera.length; i++) {
                        // Monitor.var=valor: se parte en el primer '.' y el primer '=', asi el
                        // valor puede tener puntos (M.d=2.5)
                        int punto = espera[i].indexOf('.');
                        int igual = espera[i].indexOf('=');
                        String monitor = espera[i].substring(0, punto);
                        String var = espera[i].substring(punto + 1, igual);
                        assertEquals(espera[i].substring(igual + 1),
                                TestSupport.finalVar(r, monitor, var), espera[i]);
                    }
                }
                default -> throw new AssertionError(
                        "Segunda linea sin '// espera: fin ...' ni '// espera: deadlock'");
            }
        }
    }
}
