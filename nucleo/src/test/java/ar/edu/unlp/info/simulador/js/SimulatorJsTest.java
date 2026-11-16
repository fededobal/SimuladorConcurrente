package ar.edu.unlp.info.simulador.js;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Contrato del puente Java -> navegador. Corre en la JVM (las anotaciones de TeaVM son solo
 * marcas), asi que prueba la logica del puente sin compilar a JS. Lo que TeaVM traduce se
 * prueba aparte con scripts/smoke-motor.mjs.
 *
 * Regla del puente: NINGUNA funcion exportada lanza. Todo error vuelve como
 * {"error": "...", "line": n|null}, que es lo que api.ts sabe mostrar.
 */
class SimulatorJsTest {

    private static final String BUFFER = """
            monitor B { int x = 0; procedure f() { x = x + 1; write("x=", x); } }
            process P[i: 0..1] { B.f(); }
            """;

    @Test
    void createReturnsSimulationCreatedShape() {
        String json = SimulatorJs.create(BUFFER, 1);
        assertTrue(json.startsWith("{\"id\":\"local\""), json);
        assertTrue(json.contains("\"seed\":1,"), json);
        assertTrue(json.contains("\"snapshot\":{\"instant\":0,"), json);
    }

    @Test
    void stepReturnsStepResponseShape() {
        SimulatorJs.create(BUFFER, 1);
        String json = SimulatorJs.step("ROUND_ROBIN", -1, 0);
        assertTrue(json.startsWith("{\"entries\":["), json);
        assertTrue(json.contains("\"snapshot\":{"), json);
        assertTrue(json.contains("\"finished\":"), json);
        assertTrue(json.contains("\"deadlock\":"), json);
        assertTrue(json.contains("\"output\":["), json);
    }

    @Test
    void compileErrorComesBackWithLine() {
        String json = SimulatorJs.create("monitor M {\n procedure f() { y = 1; } }\nprocess P { M.f(); }", 1);
        assertTrue(json.startsWith("{\"error\":"), json);
        assertTrue(json.contains("\"line\":2"), json);
    }

    @Test
    void monitorInitErrorComesBackAsError() {
        String json = assertDoesNotThrow(() -> SimulatorJs.create("""
                monitor M { int x = 0; x = 5 / x; procedure f() { x = 1; } }
                process A { M.f(); }
                """, 1));
        assertTrue(json.startsWith("{\"error\":"), json);
    }

    @Test
    void stepNeverThrows() {
        SimulatorJs.create("""
                monitor M { int x = 9223372036854775807; procedure f() { x = x + 1; } }
                process A { M.f(); }
                """, 1);
        assertDoesNotThrow(() -> {
            for (int i = 0; i < 20; i++) SimulatorJs.step("ROUND_ROBIN", -1, 0);
        });
    }

    /** VI-13: ningun programa, por patologico que sea, hace lanzar a una funcion exportada. */
    @Test
    void pathologicalProgramsComeBackAsErrors() {
        String[] programs = {
            "process P { int a[2000000000]; skip; }",
            "process P[i: 0..100000] { skip; }",
            "process P { int x = " + "(".repeat(3000) + "1" + ")".repeat(3000) + "; }",
            "monitor M { int x = 0; while (true) { } procedure f() { skip; } } process P { M.f(); }",
        };
        for (String code : programs) {
            String createdJson = assertDoesNotThrow(() -> SimulatorJs.create(code, 1));
            if (createdJson.startsWith("{\"error\"")) continue;
            assertDoesNotThrow(() -> {
                for (int i = 0; i < 5; i++) SimulatorJs.step("RANDOM", -1, 0);
                SimulatorJs.state();
            });
        }
    }
}
