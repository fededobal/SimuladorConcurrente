package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.TestSupport;
import ar.edu.unlp.info.simulador.TestSupport.RunResult;
import ar.edu.unlp.info.simulador.lang.CompilationException;
import ar.edu.unlp.info.simulador.lang.Compiler;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Bugs verificados en la revision del 18/09/2026 (docs/informe-revision.md, seccion 3),
 * reproducidos sobre el motor compilado por TeaVM. Cada test describe el comportamiento
 * CORRECTO: al arreglar el bug, sacar el @Disabled y mover el caso de CONOCIDOS a CANONICOS
 * en scripts/smoke-motor.mjs.
 */
class RegresionesVmTest {

    @Test
    void errorDentroDelMonitorLiberaElLock() {
        RunResult r = TestSupport.run("""
                monitor M {
                    int x = 0;
                    procedure f() { x = 10 / x; }
                    procedure g() { x = x + 1; }
                }
                process A { M.f(); }
                process B { M.g(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 1000);
        assertFalse(r.deadlock(), "A fallo por division por cero; no es un interbloqueo");
        assertTrue(r.finished());
        assertEquals("1", TestSupport.finalVar(r, "M", "x"), "B tuvo que poder entrar");
        assertTrue(r.logs().stream().anyMatch(l -> l.kind().equals("ERROR")));
    }

    @Test
    void incrementoDeDoubleNoTrunca() {
        RunResult r = TestSupport.run("""
                monitor M { double d = 1.5; procedure f() { d++; } }
                process A { M.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertEquals("2.5", TestSupport.finalVar(r, "M", "d"));
    }

    @Test
    void decrementoDeElementoDoubleNoTrunca() {
        RunResult r = TestSupport.run("""
                monitor M { double a[2] = ([2] 1.5); double d = 0; procedure f() { a[0]--; d = a[0]; } }
                process A { M.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertEquals("0.5", TestSupport.finalVar(r, "M", "d"));
    }

    @Test
    void overflowEsErrorDeEjecucion() {
        RunResult r = assertDoesNotThrow(() -> TestSupport.run("""
                monitor M { int x = 9223372036854775807; procedure f() { x = x + 1; } }
                process A { M.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100));
        assertTrue(r.logs().stream().anyMatch(l -> l.kind().equals("ERROR")));
    }

    @Test
    @Disabled("B4: Long.parseLong en el parser lanza NumberFormatException sin linea")
    void literalFueraDeRangoEsErrorDeCompilacion() {
        CompilationException ex = assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { int x = 99999999999999999999; procedure f() { x = 1; } }
                process A { M.f(); }
                """));
        assertEquals(1, ex.getLine());
    }
}
