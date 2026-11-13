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
class SimuladorJsTest {

    private static final String BUFFER = """
            monitor B { int x = 0; procedure f() { x = x + 1; write("x=", x); } }
            process P[i: 0..1] { B.f(); }
            """;

    @Test
    void crearDevuelveLaFormaDeSimulationCreated() {
        String json = SimuladorJs.crear(BUFFER, 1);
        assertTrue(json.startsWith("{\"id\":\"local\""), json);
        assertTrue(json.contains("\"seed\":1,"), json);
        assertTrue(json.contains("\"snapshot\":{\"instant\":0,"), json);
    }

    @Test
    void pasoDevuelveLaFormaDeStepResponse() {
        SimuladorJs.crear(BUFFER, 1);
        String json = SimuladorJs.paso("ROUND_ROBIN", -1, 0);
        assertTrue(json.startsWith("{\"entries\":["), json);
        assertTrue(json.contains("\"snapshot\":{"), json);
        assertTrue(json.contains("\"finished\":"), json);
        assertTrue(json.contains("\"deadlock\":"), json);
        assertTrue(json.contains("\"output\":["), json);
    }

    @Test
    void errorDeCompilacionVuelveConLinea() {
        String json = SimuladorJs.crear("monitor M {\n procedure f() { y = 1; } }\nprocess P { M.f(); }", 1);
        assertTrue(json.startsWith("{\"error\":"), json);
        assertTrue(json.contains("\"line\":2"), json);
    }

    @Test
    void errorEnLaInicializacionDelMonitorVuelveComoError() {
        String json = assertDoesNotThrow(() -> SimuladorJs.crear("""
                monitor M { int x = 0; x = 5 / x; procedure f() { x = 1; } }
                process A { M.f(); }
                """, 1));
        assertTrue(json.startsWith("{\"error\":"), json);
    }

    @Test
    void pasoNuncaLanza() {
        SimuladorJs.crear("""
                monitor M { int x = 9223372036854775807; procedure f() { x = x + 1; } }
                process A { M.f(); }
                """, 1);
        assertDoesNotThrow(() -> {
            for (int i = 0; i < 20; i++) SimuladorJs.paso("ROUND_ROBIN", -1, 0);
        });
    }

    /** VI-13: ningun programa, por patologico que sea, hace lanzar a una funcion exportada. */
    @Test
    void programasPatologicosVuelvenComoError() {
        String[] programas = {
            "process P { int a[2000000000]; skip; }",
            "process P[i: 0..100000] { skip; }",
            "process P { int x = " + "(".repeat(3000) + "1" + ")".repeat(3000) + "; }",
            "monitor M { int x = 0; while (true) { } procedure f() { skip; } } process P { M.f(); }",
        };
        for (String codigo : programas) {
            String creado = assertDoesNotThrow(() -> SimuladorJs.crear(codigo, 1));
            if (creado.startsWith("{\"error\"")) continue;
            assertDoesNotThrow(() -> {
                for (int i = 0; i < 5; i++) SimuladorJs.paso("RANDOM", -1, 0);
                SimuladorJs.estado();
            });
        }
    }
}
