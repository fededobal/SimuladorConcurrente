package ar.edu.unlp.info.simulator.vm;

import ar.edu.unlp.info.simulator.TestSupport;
import ar.edu.unlp.info.simulator.TestSupport.RunResult;
import ar.edu.unlp.info.simulator.lang.CompilationException;
import ar.edu.unlp.info.simulator.lang.Compiler;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Bugs verificados en la revision del 18/09/2026 (docs/informe-revision.md, seccion 3) y en
 * la verificacion del 23/09/2026 (docs/verificacion-2026-09-23.md, identificadores VB y VI).
 * Cada test describe el comportamiento CORRECTO.
 */
class VmRegressionTest {

    @Test
    void logDoesNotGrowUnboundedInLongRun() {
        VirtualMachine vm = TestSupport.compileAndBuild("""
                monitor M { int x = 0; procedure f() { x = x + 1; } }
                process P[i: 1..20] { while (true) { M.f(); } }
                """, 3);
        for (int i = 0; i < 3000; i++) vm.step(null, SchedulingPolicy.RANDOM);
        assertFalse(vm.isFinished());
        assertEquals(EventLog.MAX_ENTRIES, vm.allLogs().size());
        // Se conservan los ultimos: el evento mas nuevo es del instante actual.
        assertEquals(vm.instant(), vm.allLogs().get(EventLog.MAX_ENTRIES - 1).instant());
    }

    @Test
    void errorInsideMonitorReleasesLock() {
        RunResult r = TestSupport.run("""
                monitor M {
                    int x = 0;
                    procedure f() { x = 10 / x; }
                    procedure g() { x = x + 1; }
                }
                process A { M.f(); }
                process B { M.g(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 1000);
        assertFalse(r.deadlock(), "A fallo por division por cero; no es un deadlock");
        assertTrue(r.finished());
        assertEquals("1", TestSupport.finalVar(r, "M", "x"), "B tuvo que poder entrar");
        assertTrue(r.logs().stream().anyMatch(l -> l.kind().equals("ERROR")));
    }

    @Test
    void doubleIncrementDoesNotTruncate() {
        RunResult r = TestSupport.run("""
                monitor M { double d = 1.5; procedure f() { d++; } }
                process A { M.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertEquals("2.5", TestSupport.finalVar(r, "M", "d"));
    }

    @Test
    void doubleElementDecrementDoesNotTruncate() {
        RunResult r = TestSupport.run("""
                monitor M { double a[2] = ([2] 1.5); double d = 0; procedure f() { a[0]--; d = a[0]; } }
                process A { M.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertEquals("0.5", TestSupport.finalVar(r, "M", "d"));
    }

    @Test
    void overflowIsRuntimeError() {
        RunResult r = assertDoesNotThrow(() -> TestSupport.run("""
                monitor M { int x = 9223372036854775807; procedure f() { x = x + 1; } }
                process A { M.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100));
        assertTrue(r.logs().stream().anyMatch(l -> l.kind().equals("ERROR")));
    }

    @Test
    void outOfRangeLiteralIsCompileError() {
        CompilationException ex = assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { int x = 99999999999999999999; procedure f() { x = 1; } }
                process A { M.f(); }
                """));
        assertEquals(1, ex.getLine());
    }

    /** VI-3: un tamano negativo es error del alumno con su linea, no un "Error interno". */
    @Test
    void negativeSizeIsRuntimeErrorWithLine() {
        RunResult local = TestSupport.run("""
                process P {
                  int a[-1];
                }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertTrue(local.finished());
        assertFalse(local.deadlock());
        Snapshot.ProcessView p = local.vm().snapshot().processes().get(0);
        assertTrue(p.error().contains("Tamaño de arreglo inválido: -1"), p.error());
        assertEquals(2, p.line());

        RuntimeError perm = assertThrows(RuntimeError.class, () -> TestSupport.compileAndBuild("""
                monitor M {
                  int a[-1];
                  procedure f() { skip; }
                }
                process P { M.f(); }
                """, 0));
        assertEquals(2, perm.getLine());

        assertThrows(RuntimeError.class, () -> TestSupport.compileAndBuild("""
                monitor M { cond c[-1]; procedure f() { skip; } }
                process P { M.f(); }
                """, 0));
    }

    /** VI-4: un indice mayor que un int no se trunca (a[4294967296] no es a[0]). */
    @Test
    void indexBeyondIntIsOutOfRange() {
        for (String access : new String[] {"r = a[4294967296];", "a[4294967297] = 1;",
                                           "a[-4294967295]++;", "M.dar(a[4294967297]);"}) {
            RunResult r = TestSupport.run("""
                    monitor M { procedure dar(x: out int) { x = 1; } }
                    process P { int a[3]; int r; %s }
                    """.formatted(access), SchedulingPolicy.ROUND_ROBIN, 0, 100);
            String error = r.vm().snapshot().processes().get(0).error();
            assertTrue(error != null && error.contains("fuera de rango"), access + " -> " + error);
        }
        RunResult cond = TestSupport.run("""
                monitor M { cond c[2]; procedure f() { wait(c[4294967296]); } }
                process P { M.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        String error = cond.vm().snapshot().processes().get(0).error();
        assertTrue(error.contains("fuera de rango para la cond 'c'"), error);
    }

    @Test
    void familyWithLargeBoundsIsNotTruncated() {
        VirtualMachine vm = TestSupport.compileAndBuild("""
                process P[i: 4294967296..4294967297] { skip; }
                """, 0);
        assertEquals("P[4294967296]", vm.snapshot().processes().get(0).name());
    }

    /** VI-11: topes de tamano con error claro en lugar de colgar la pestana. */
    @Test
    void tooLargeArraysAndFamiliesAreErrors() {
        RuntimeError array = assertThrows(RuntimeError.class, () -> TestSupport.compileAndBuild("""
                monitor M { int a[2000000000]; procedure f() { skip; } }
                process P { M.f(); }
                """, 0));
        assertTrue(array.getMessage().contains("100000"), array.getMessage());
        RuntimeError family = assertThrows(RuntimeError.class,
                () -> TestSupport.compileAndBuild("process P[i: 0..100000] { skip; }", 0));
        assertTrue(family.getMessage().contains("Demasiados procesos"), family.getMessage());
        assertDoesNotThrow(() -> TestSupport.compileAndBuild("process P[i: 1..5000] { skip; }", 0));
    }

    @Test
    void longArrayIsAbbreviatedWhenShown() {
        VirtualMachine vm = TestSupport.compileAndBuild("""
                monitor M { int a[1000]; procedure f() { skip; } }
                process P { M.f(); }
                """, 0);
        String value = TestSupport.varValue(TestSupport.monitor(vm.snapshot(), "M"), "a");
        assertTrue(value.endsWith("… (1000 elementos)]"), value);
        assertTrue(value.length() < 300, value);
    }

    /** VI-9: la inicializacion de un monitor que no termina es un error, no un corte silencioso. */
    @Test
    void endlessInitializationIsError() {
        RuntimeError ex = assertThrows(RuntimeError.class, () -> TestSupport.compileAndBuild("""
                monitor M {
                  int x = 0;
                  while (true) x = x + 1;
                  procedure f() { skip; }
                }
                process P { M.f(); }
                """, 0));
        assertTrue(ex.getMessage().contains("no terminó"), ex.getMessage());
        assertEquals(3, ex.getLine());
    }

    /** VB-2: Infinity y NaN son error de ejecucion; el motor del navegador no los soporta. */
    @Test
    void nonFiniteDoubleIsRuntimeError() {
        RunResult r = TestSupport.run("""
                process P {
                  double d = 10000000000.0;
                  for (1..40) { d = d * d; }
                }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 1000);
        assertTrue(r.finished());
        String error = r.vm().snapshot().processes().get(0).error();
        assertTrue(error != null && error.contains("no representable"), error);
    }

    /** Sin saturar a Long.MAX_VALUE ni depender de Math.rint (distintos en TeaVM). */
    @Test
    void largeDoublesShowTheSameAsInTheBrowser() {
        RunResult r = TestSupport.run("""
                process P { write(100000000000000000000.0, " ", 3.0, " ", 0.1 + 0.2); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertEquals("1.0E20 3.0 0.30000000000000004",
                r.vm().snapshot().output().get(0).text());
    }

    /** VB-1/VB-2: los double grandes y los literales largos no dependen de Double.toString/parseDouble. */
    @Test
    void largeDoublesAndLongLiteralsFormatWithoutTheLibrary() {
        RunResult r = TestSupport.run("""
                process P {
                  double m = 9223372036854775807.0 * 4.0;
                  write(m, " ", -100000000000000000000000.0, " ", 0.1, " ", 0000000000000000000001.25,
                        " ", 4503599627370497.5, " ", 123456789.125);
                }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertEquals(DOUBLE_FORMAT,
                r.vm().snapshot().output().get(0).text());
    }

    /** Mismo texto que espera scripts/smoke-motor.mjs en el navegador. */
    static final String DOUBLE_FORMAT =
            "3.68934881474191E19 -1.0E23 0.1 1.25 4503599627370498.0 1.23456789125E8";
}
