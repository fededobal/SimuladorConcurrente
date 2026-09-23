package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.TestSupport;
import ar.edu.unlp.info.simulador.TestSupport.RunResult;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VirtualMachineTest {

    // Cada proceso llama una vez a sumar(); si hubiera dos procesos a la vez dentro del
    // monitor, 'dentro' llegaria a 2. La exclusion mutua implicita garantiza maxDentro == 1.
    private static final String EXCLUSION = """
            monitor Cuenta {
                int x = 0;
                int dentro = 0;
                int maxDentro = 0;
                procedure sumar() {
                    dentro = dentro + 1;
                    if (dentro > maxDentro) maxDentro = dentro;
                    x = x + 1;
                    dentro = dentro - 1;
                }
            }
            process P[i: 0..3] { Cuenta.sumar(); }
            """;

    @Test
    void exclusionMutuaImplicita_random() {
        for (int seed = 0; seed < 25; seed++) {
            RunResult r = TestSupport.run(EXCLUSION, SchedulingPolicy.RANDOM, seed, 5000);
            assertTrue(r.finished(), "seed " + seed + " no termino");
            assertEquals("4", TestSupport.finalVar(r, "Cuenta", "x"), "seed " + seed);
            assertEquals("1", TestSupport.finalVar(r, "Cuenta", "maxDentro"), "seed " + seed);
        }
    }

    @Test
    void exclusionMutuaImplicita_roundRobin() {
        RunResult r = TestSupport.run(EXCLUSION, SchedulingPolicy.ROUND_ROBIN, 1, 5000);
        assertTrue(r.finished());
        assertEquals("4", TestSupport.finalVar(r, "Cuenta", "x"));
        assertEquals("1", TestSupport.finalVar(r, "Cuenta", "maxDentro"));
    }

    // Buffer de un dato con cond P/C: un productor envia 1..5, un consumidor los recibe.
    // Independiente del interleaving: suma == 15, recibidos == 5.
    private static final String BUFFER = """
            monitor Buf {
                int dato = 0;
                boolean hay = false;
                int recibidos = 0;
                int suma = 0;
                cond p;
                cond c;
                procedure enviar(d: in int) {
                    while (hay) wait(p);
                    dato = d; hay = true;
                    signal(c);
                }
                procedure recibir() {
                    while (not hay) wait(c);
                    suma = suma + dato;
                    recibidos = recibidos + 1;
                    hay = false;
                    signal(p);
                }
            }
            process Prod { for (int i = 1..5) { Buf.enviar(i); } }
            process Cons { int k = 0; for (k = 1; k <= 5; k++) { Buf.recibir(); } }
            """;

    @Test
    void bufferUnDato_signalAndContinue() {
        for (int seed = 0; seed < 25; seed++) {
            RunResult r = TestSupport.run(BUFFER, SchedulingPolicy.RANDOM, seed, 20000);
            assertTrue(r.finished(), "seed " + seed + " no termino");
            assertEquals("5", TestSupport.finalVar(r, "Buf", "recibidos"), "seed " + seed);
            assertEquals("15", TestSupport.finalVar(r, "Buf", "suma"), "seed " + seed);
        }
    }

    // signal_all despierta a todos: los 5 W pasan la barrera.
    private static final String BROADCAST = """
            monitor Gate {
                boolean open = false;
                int through = 0;
                cond g;
                procedure esperar() {
                    while (not open) wait(g);
                    through = through + 1;
                }
                procedure abrir() {
                    open = true;
                    signal_all(g);
                }
            }
            process W[i: 0..4] { Gate.esperar(); }
            process Opener { Gate.abrir(); }
            """;

    @Test
    void broadcastSignalDespiertaATodos() {
        for (int seed = 0; seed < 25; seed++) {
            RunResult r = TestSupport.run(BROADCAST, SchedulingPolicy.RANDOM, seed, 20000);
            assertTrue(r.finished(), "seed " + seed + " no termino");
            assertEquals("5", TestSupport.finalVar(r, "Gate", "through"), "seed " + seed);
        }
    }

    @Test
    void detectaDeadlock() {
        RunResult r = TestSupport.run("""
                monitor M { cond c; procedure bloquear() { wait(c); } }
                process P { M.bloquear(); }
                """, SchedulingPolicy.RANDOM, 0, 1000);
        assertTrue(r.deadlock());
        assertTrue(r.logs().stream().anyMatch(l -> l.kind().equals("DEADLOCK")));
    }

    @Test
    void parametroOutDevuelveValor() {
        RunResult r = TestSupport.run("""
                monitor TOTAL {
                    int cant = 0;
                    procedure incrementar() { cant = cant + 1; }
                    procedure verificar(R: out int) { R = cant; }
                }
                process Suma { for (int i = 1..3) { TOTAL.incrementar(); } }
                process Chequeo {
                    int leido = 0;
                    TOTAL.verificar(leido);
                    TOTAL.verificar(leido);
                }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 5000);
        assertTrue(r.finished());
        assertEquals("3", TestSupport.finalVar(r, "TOTAL", "cant"));
    }

    @Test
    void colaFifoDentroDeMonitor() {
        RunResult r = TestSupport.run("""
                monitor BufferN {
                    Cola items;
                    int suma = 0;
                    cond noVacio;
                    procedure poner(v: in int) { push(items, v); signal(noVacio); }
                    procedure sacar() {
                        while (empty items) wait(noVacio);
                        int x = 0;
                        pop(items, x);
                        suma = suma + x;
                    }
                }
                process Prod { for (int i = 1..4) { BufferN.poner(i * 10); } }
                process Cons { for (int i = 1..4) { BufferN.sacar(); } }
                """, SchedulingPolicy.RANDOM, 3, 20000);
        assertTrue(r.finished());
        assertEquals("100", TestSupport.finalVar(r, "BufferN", "suma"));
    }

    @Test
    void familiaDeProcesosSeExpande() {
        VirtualMachine vm = TestSupport.compileAndBuild("""
                monitor M { int x = 0; procedure inc() { x = x + 1; } }
                process W[k: 1..6] { M.inc(); }
                """, 0);
        assertEquals(6, vm.snapshot().processes().size());
    }

    /** En {@code int a, b = 5;} el valor inicial es solo de {@code b}; {@code a} queda en 0. */
    @Test
    void declaracionConListaInicializaCadaNombreAparte() {
        RunResult r = TestSupport.run("""
                monitor M {
                    int a, b = 5;
                    int recibido = 0;
                    procedure guardar(v: in int) { recibido = v; }
                }
                process P { int x, y = 7; M.guardar(x + y); }
                """, SchedulingPolicy.RANDOM, 1, 1000);
        assertTrue(r.finished());
        assertEquals("0", TestSupport.finalVar(r, "M", "a"));
        assertEquals("5", TestSupport.finalVar(r, "M", "b"));
        assertEquals("7", TestSupport.finalVar(r, "M", "recibido"));
    }

    /** VI-7: con double, % es el resto real y no trunca los operandos. */
    @Test
    void moduloConDouble() {
        RunResult r = TestSupport.run("""
                process P { write(5.5 % 2, " ", 7.5 % 2.5, " ", 5 % 0.5, " ", -7 % 2); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertEquals("1.5 0.0 0.0 -1", r.vm().snapshot().output().get(0).text());
    }

    /** VI-8: dos int se comparan exactos, aun por encima de 2^53. */
    @Test
    void comparacionDeEnterosGrandesEsExacta() {
        RunResult r = TestSupport.run("""
                process P { int a = 9007199254740993; int b = 9007199254740992;
                            write(a == b, " ", a > b, " ", 1 == 1.0, " ", "b" > "a"); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertEquals("false true true true", r.vm().snapshot().output().get(0).text());
    }

    /** VI-8: comparar clases distintas, u ordenar por boolean, es error y no un resultado arbitrario. */
    @Test
    void compararTiposDistintosEsError() {
        for (String expr : new String[] {"\"10\" == 10", "true == 1", "true < false", "\"a\" < 1"}) {
            RunResult r = TestSupport.run("process P { boolean b = " + expr + "; }",
                    SchedulingPolicy.ROUND_ROBIN, 0, 100);
            String error = r.vm().snapshot().processes().get(0).error();
            assertTrue(error != null && error.contains("No se puede comparar"), expr + " -> " + error);
        }
        RunResult cola = TestSupport.run("""
                monitor M { ColaOrdenada c; procedure f() { push(c, 9); push(c, "10"); } }
                process P { M.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertTrue(cola.vm().snapshot().processes().get(0).error().contains("No se puede comparar"));
    }

    /** VI-8: un boolean no es un numero (antes int x = true valia 1 y double d = true fallaba). */
    @Test
    void booleanNoSeUsaComoNumero() {
        for (String sentencia : new String[] {"int x = true;", "int a[2]; a[true] = 1;", "int y = -true;"}) {
            RunResult r = TestSupport.run("process P { " + sentencia + " }",
                    SchedulingPolicy.ROUND_ROBIN, 0, 100);
            assertTrue(r.vm().snapshot().processes().get(0).error() != null, sentencia);
        }
    }

    /** VI-10: la salida conserva las ultimas lineas y avisa cuantas descarto. */
    @Test
    void salidaConservaLasUltimasLineas() {
        RunResult r = TestSupport.run("process P { for (int i = 1..600) { write(\"linea \", i); } }",
                SchedulingPolicy.ROUND_ROBIN, 0, 5000);
        java.util.List<Snapshot.OutputLine> out = r.vm().snapshot().output();
        assertEquals(501, out.size());
        assertTrue(out.get(0).text().contains("se descartaron 100"), out.get(0).text());
        assertEquals("linea 101", out.get(1).text());
        assertEquals("linea 600", out.get(500).text());
    }
}
