package ar.edu.unlp.info.simulator.lang;

import ar.edu.unlp.info.simulator.js.SimulatorJs;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Golden master de la compilacion: fija el mensaje y la linea exactos de cada error que el
 * alumno puede ver, tal como los devuelve el puente al navegador. Cubre un programa por
 * mensaje del lexer, el parser, el validador y el tipado; los que compilan guardan la
 * respuesta entera, con el snapshot inicial (y con el, el valor de los literales).
 *
 * <p>Si un cambio de mensajes es intencional, se regenera con
 * {@code mvn test -Dcharacterization.regenerate=true} y el diff se revisa en el commit.
 */
class CompileErrorsCharacterizationTest {

    private static final Path DIR = Path.of("src", "test", "resources", "characterization");
    private static final Path PROGRAMS = DIR.resolve("compile-errors.mon");
    private static final Path EXPECTED = DIR.resolve("compile-errors.txt");
    private static final boolean REGENERATE = Boolean.getBoolean("characterization.regenerate");

    @Test
    void compilerAnswersTheSameAsWhenTheReferenceWasRecorded() throws IOException {
        StringBuilder actual = new StringBuilder();
        for (Map.Entry<String, String> program : programs().entrySet()) {
            actual.append("### ").append(program.getKey()).append('\n')
                  .append(SimulatorJs.create(program.getValue(), 0)).append('\n');
        }
        if (REGENERATE) {
            Files.writeString(EXPECTED, actual, StandardCharsets.UTF_8);
            return;
        }
        String expected = Files.exists(EXPECTED)
                ? Files.readString(EXPECTED, StandardCharsets.UTF_8) : "";
        assertEquals(expected, actual.toString());
    }

    /** Los del archivo de programas, separados por {@code ### nombre}, y los generados. */
    private static Map<String, String> programs() throws IOException {
        Map<String, String> programs = new LinkedHashMap<>();
        String name = null;
        List<String> lines = new ArrayList<>();
        for (String line : Files.readAllLines(PROGRAMS, StandardCharsets.UTF_8)) {
            if (line.startsWith("### ")) {
                if (name != null) programs.put(name, String.join("\n", lines));
                name = line.substring(4);
                lines.clear();
            } else {
                lines.add(line);
            }
        }
        if (name != null) programs.put(name, String.join("\n", lines));
        programs.putAll(generated());
        return programs;
    }

    /** Programas que no conviene escribir a mano: anidamientos y literales muy largos. */
    private static Map<String, String> generated() {
        Map<String, String> p = new LinkedHashMap<>();
        p.put("generado/bloques-anidados-de-mas",
                "process P " + "{ ".repeat(101) + "skip; " + "} ".repeat(101));
        p.put("generado/bloques-anidados-al-limite",
                "process P " + "{ ".repeat(98) + "skip; " + "} ".repeat(98));
        p.put("generado/parentesis-anidados-de-mas",
                "process P { int a = " + "(".repeat(101) + "1" + ")".repeat(101) + "; }");
        p.put("generado/not-anidados-de-mas",
                "process P { bool b = " + "not ".repeat(101) + "true; }");
        p.put("generado/menos-anidados-de-mas",
                "process P { int a = " + "- ".repeat(101) + "1; }");
        p.put("generado/suma-demasiado-larga",
                "process P { int a = 1" + " + 1".repeat(200) + "; }");
        p.put("generado/suma-al-limite",
                "process P { int a = 1" + " + 1".repeat(199) + "; }");
        p.put("generado/decimal-infinito",
                "process P { double d = 1" + "0".repeat(400) + ".0; }");
        p.put("generado/literales-decimales", """
                monitor M {
                  double a = 0.1; double b = 2.5; double c = 0.000000000000000000000000123;
                  double d = 123456789012345678901234.5; double e = 3.14159265358979323846264;
                  double f = 007.50; double g = 0.0; double h = 1%s.0;
                  int i = 9223372036854775807;
                }
                process P { skip; }
                """.formatted("0".repeat(300)));
        return p;
    }
}
