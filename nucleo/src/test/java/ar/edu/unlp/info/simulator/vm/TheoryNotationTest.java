package ar.edu.unlp.info.simulator.vm;

import ar.edu.unlp.info.simulator.TestSupport;
import ar.edu.unlp.info.simulator.TestSupport.RunResult;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Formas de la notación de la cátedra (Teoría 4 y Explicación 3) que el simulador ejecuta
 * tal como están escritas: constantes como N, el orden de una cola ordenada, el else sin
 * ';' y {@code cola} como nombre de una variable condición.
 */
class TheoryNotationTest {

    private static final int SEEDS = 25;

    /** Una ColaOrdenada sin modificador, o con asc, entrega primero la clave menor. */
    @Test
    void sortedQueueIsAscendingByDefault() {
        for (String order : new String[] {"", " asc"}) {
            RunResult r = TestSupport.run("""
                    process P { ColaOrdenada c(int, text)%s; int k; text t;
                      push(c, 3, "c"); push(c, 1, "a"); push(c, 2, "b"); push(c, 1, "a2");
                      for (1..4) { pop(c, k, t); write(k, t); } }
                    """.formatted(order), SchedulingPolicy.ROUND_ROBIN, 0, 100);
            assertEquals("1a 1a2 2b 3c", outputOf(r));
        }
    }

    /**
     * Con desc sale primero la clave mayor (ejercicio 3 de la Explicación 3: prioridad por
     * edad, de mayor a menor). A igual clave se respeta el orden de llegada, como en asc.
     */
    @Test
    void descendingSortedQueuePopsLargestKeyFirst() {
        RunResult r = TestSupport.run("""
                monitor Cajero { ColaOrdenada fila(int, int) desc; int idAux = 0, edad = 0;
                  procedure cargar() { push(fila, 30, 0); push(fila, 70, 1); push(fila, 45, 2);
                                       push(fila, 70, 3); push(fila, 18, 4); }
                  procedure sacar(id: out int) { pop(fila, edad, idAux); id = idAux; } }
                process P { int id; Cajero.cargar(); for (1..5) { Cajero.sacar(id); write(id); } }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 200);
        assertEquals("1 3 2 0 4", outputOf(r));
    }

    /** El orden también vale para claves text y double, y el estado dice que la cola es desc. */
    @Test
    void descendingOrderAppliesToTextAndDoubleKeys() {
        VirtualMachine vm = TestSupport.compileAndBuild("""
                monitor M { ColaOrdenada t(text) desc; ColaOrdenada d(double) desc; ColaOrdenada a(int);
                  push(t, "b"); push(t, "c"); push(t, "a");
                  push(d, 1.5); push(d, 2); push(d, 0.5);
                  procedure f() { skip; } }
                process P { M.f(); }
                """, 0);
        Snapshot.MonitorView m = TestSupport.monitor(vm.snapshot(), "M");
        assertEquals("<c, b, a>", TestSupport.varValue(m, "t"));
        assertEquals("<2.0, 1.5, 0.5>", TestSupport.varValue(m, "d"));
        assertEquals("ColaOrdenada(text) desc", typeOf(m, "t"));
        assertEquals("ColaOrdenada(int)", typeOf(m, "a"));
    }

    /**
     * Una constante da el tamaño de un arreglo de cond, de una familia de procesos y de un
     * arreglo de monitores, y vale como número en cualquier expresión.
     */
    @Test
    void constantsSizeFamiliesArraysAndMonitors() {
        for (int seed = 0; seed < SEEDS; seed++) {
            RunResult r = TestSupport.run("""
                    #define N 4
                    monitor Cancha { int cant = 0; cond espera; int llegaron[N];
                      procedure llegada(id: in int) { cant ++; llegaron[id] = 1;
                        if (cant < N) wait (espera) else signal_all (espera); } }
                    monitor Caja[id: 0..N-1] { int usos = 0; procedure usar() { usos = usos + N; } }
                    process Jugador[id: 0..N-1] { Cancha.llegada(id); Caja[id].usar(); }
                    """, SchedulingPolicy.RANDOM, seed, 2000);
            assertTrue(r.finished(), "seed " + seed);
            assertEquals("4", TestSupport.finalVar(r, "Cancha", "cant"), "seed " + seed);
            assertEquals("[1, 1, 1, 1]", TestSupport.finalVar(r, "Cancha", "llegaron"));
            assertEquals("4", TestSupport.finalVar(r, "Caja[3]", "usos"));
            assertEquals(4, r.vm().snapshot().processes().size());
        }
    }

    /**
     * El semáforo con passing the condition de la Teoría 4, como está escrito: else sin ';'
     * antes. Con cualquier entrelazado el semáforo termina en 1.
     */
    @Test
    void theorySemaphoreRunsAsWritten() {
        for (int seed = 0; seed < SEEDS; seed++) {
            RunResult r = TestSupport.run("""
                    monitor Semaforo
                    { int s = 1, espera = 0; cond pos;
                      procedure P()
                      { if (s == 0) { espera ++; wait(pos);}
                        else s = s-1;
                      }
                      procedure V()
                      { if (espera == 0 ) s = s+1
                        else { espera --; signal(pos);}
                      }
                    }
                    process A[id: 0..3] { Semaforo.P(); delay(1); Semaforo.V(); }
                    """, SchedulingPolicy.RANDOM, seed, 2000);
            assertTrue(r.finished(), "seed " + seed);
            assertEquals("1", TestSupport.finalVar(r, "Semaforo", "s"), "seed " + seed);
            assertEquals("0", TestSupport.finalVar(r, "Semaforo", "espera"), "seed " + seed);
        }
    }

    /** El cajero del ejercicio 2 de la Explicación 3, con su variable condición llamada cola. */
    @Test
    void conditionVariableNamedColaWorks() {
        for (int seed = 0; seed < SEEDS; seed++) {
            RunResult r = TestSupport.run("""
                    Monitor Cajero{
                      bool libre = true;
                      cond cola;
                      int esperando = 0;
                      Procedure Pasar ()
                      { if (not libre) { esperando ++;
                                         wait (cola);
                                       }
                        else libre = false;
                      }
                      Procedure Salir ()
                      { if (esperando > 0 ) { esperando --;
                                              signal (cola);
                                            }
                        else libre = true;
                      }
                    }
                    Process Persona [id: 0..3]
                    { Cajero.Pasar ();
                      delay(1);
                      Cajero.Salir();
                    }
                    """, SchedulingPolicy.RANDOM, seed, 2000);
            assertTrue(r.finished(), "seed " + seed);
            assertEquals("true", TestSupport.finalVar(r, "Cajero", "libre"), "seed " + seed);
            assertTrue(r.logs().stream().anyMatch(l -> l.message().contains("wait(cola)")));
        }
    }

    private static String outputOf(RunResult r) {
        StringBuilder sb = new StringBuilder();
        for (var line : r.vm().snapshot().output()) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(line.text());
        }
        return sb.toString();
    }

    private static String typeOf(Snapshot.MonitorView m, String var) {
        return m.vars().stream().filter(v -> v.name().equals(var)).findFirst().orElseThrow().type();
    }
}
