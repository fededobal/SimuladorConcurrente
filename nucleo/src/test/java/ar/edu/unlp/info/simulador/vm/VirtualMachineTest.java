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
                bool hay = false;
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
                bool open = false;
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

    /** VI-7: con double, mod es el resto real y no trunca los operandos. */
    @Test
    void moduloConDouble() {
        RunResult r = TestSupport.run("""
                process P { write(5.5 mod 2, " ", 7.5 mod 2.5, " ", 5 mod 0.5, " ", -7 mod 2); }
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

    /**
     * VI-8: ordenar una ColaOrdenada por claves de clases distintas es error. Las comparaciones
     * del programa ({@code "10" == 10}) ya se rechazan al compilar (CompilerTest).
     */
    @Test
    void colaOrdenadaConClavesMezcladasEsError() {
        RunResult cola = TestSupport.run("""
                monitor M { ColaOrdenada c; procedure f() { push(c, 9); push(c, "10"); } }
                process P { M.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertTrue(cola.vm().snapshot().processes().get(0).error().contains("No se puede comparar"));
    }

    /** D-3: la cota del for de rango se evalua una sola vez, al entrar. */
    @Test
    void cotaDelForDeRangoSeEvaluaUnaVez() {
        RunResult r = TestSupport.run("""
                monitor M { int n = 3; int vueltas = 0; procedure f() { for (int i = 1..n) { n = 6; vueltas++; } } }
                process P { M.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 1000);
        assertEquals("3", TestSupport.finalVar(r, "M", "vueltas"));
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

    /**
     * ADR 0007, llamada cerrada: P llama de A a B y espera en B; Q necesita A para avisarle.
     * P retiene A mientras espera en B, asi que Q no entra nunca: es el interbloqueo del que
     * advierte la catedra, y el mensaje dice quien retiene que.
     */
    @Test
    void llamadaCerradaRetieneElMonitorDelLlamador() {
        String programa = """
                monitor B { bool listo = false; cond c;
                  procedure esperar() { while (not listo) wait(c); }
                  procedure abrir() { listo = true; signal(c); } }
                monitor A { int vueltas = 0;
                  procedure f() { vueltas++; B.esperar(); vueltas++; }
                  procedure g() { B.abrir(); } }
                process P { A.f(); }
                process Q { skip; skip; A.g(); }
                """;
        int interbloqueos = 0;
        for (int seed = 0; seed < 25; seed++) {
            RunResult r = TestSupport.run(programa, SchedulingPolicy.RANDOM, seed, 5000);
            // si Q llega a A antes que P, abre B primero y el programa termina
            if (!r.deadlock()) continue;
            interbloqueos++;
            String mensaje = r.logs().get(r.logs().size() - 1).message();
            assertTrue(mensaje.contains("P espera en B.c y retiene A"), mensaje);
            assertEquals(java.util.List.of("A"), r.vm().snapshot().processes().get(0).holding());
        }
        assertTrue(interbloqueos >= 20, "interbloqueos: " + interbloqueos);
        assertTrue(TestSupport.run(programa, SchedulingPolicy.ROUND_ROBIN, 0, 5000).deadlock());
    }

    /** ADR 0007: mientras dura la llamada a B, A sigue tomado y nadie mas entra. */
    @Test
    void llamadaCerradaNoSueltaElMonitorDelLlamador() {
        VirtualMachine vm = TestSupport.compileAndBuild("""
                monitor B { int n = 0; procedure f() { n++; n++; } }
                monitor A { procedure f() { B.f(); } procedure g() { skip; } }
                process P { A.f(); }
                process Q { skip; A.g(); }
                """, 0);
        for (int i = 0; i < 3; i++) vm.step(1, SchedulingPolicy.ROUND_ROBIN);   // P entra a A y a B
        vm.step(2, SchedulingPolicy.ROUND_ROBIN);
        vm.step(2, SchedulingPolicy.ROUND_ROBIN);   // Q pide A
        Snapshot s = vm.snapshot();
        assertEquals(1, TestSupport.monitor(s, "A").lockOwner().id());
        assertEquals(1, TestSupport.monitor(s, "B").lockOwner().id());
        assertEquals(java.util.List.of("B", "A"), s.processes().get(0).holding());
        assertEquals("MONITOR_ENTRY", s.processes().get(1).blockReason());
    }

    /** ADR 0007: un out hacia una permanente del llamador se escribe al retornar, sin soltar A. */
    @Test
    void outDeUnaLlamadaCerradaLlegaAlLlamador() {
        RunResult r = TestSupport.run("""
                monitor B { int n = 0; procedure dar(r: out int) { n++; r = 100 + n; } }
                monitor A { int guardado = 0; int copia = 0;
                  procedure f() { B.dar(guardado); copia = guardado; } }
                process P[i: 1..3] { A.f(); }
                """, SchedulingPolicy.RANDOM, 3, 5000);
        assertTrue(r.finished());
        assertEquals("103", TestSupport.finalVar(r, "A", "guardado"));
        assertEquals("103", TestSupport.finalVar(r, "A", "copia"));
        assertTrue(r.logs().stream().noneMatch(l -> l.kind().equals("RELEASE")));
    }

    /** Un ciclo entre monitores (A llama a B, que llama a A) es error del proceso, no un cuelgue. */
    @Test
    void cicloEntreMonitoresEsErrorDeEjecucion() {
        RunResult r = TestSupport.run("""
                monitor A { procedure f() { B.g(); } procedure h() { skip; } }
                monitor B { procedure g() { A.h(); } }
                process P { A.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        assertTrue(r.finished());
        assertEquals("P ya está dentro de A y no puede volver a llamarlo desde otro monitor",
                r.vm().snapshot().processes().get(0).error());
    }

    /** VS-11: el snapshot marca que procesos avanzaron en el ultimo instante. */
    @Test
    void snapshotMarcaLosProcesosQueAvanzaron() {
        VirtualMachine vm = TestSupport.compileAndBuild("""
                monitor M { cond c; procedure f() { wait(c); } }
                process A { M.f(); }
                process B { skip; skip; skip; }
                """, 0);
        vm.step(1, SchedulingPolicy.ROUND_ROBIN);
        java.util.List<Snapshot.ProcessView> ps = vm.snapshot().processes();
        assertTrue(ps.get(0).advanced());
        assertTrue(!ps.get(1).advanced());
    }

    /**
     * La linea de tiempo ordena a los que avanzaron segun su turno: advanceOrder numera sin
     * huecos (0, 1, ...) a los que avanzaron y deja -1 a los demas.
     */
    @Test
    void snapshotNumeraElTurnoDeLosQueAvanzaron() {
        for (long seed = 0; seed < 20; seed++) {
            VirtualMachine vm = TestSupport.compileAndBuild(
                    "process P[i: 0..4] { skip; skip; skip; }", seed);
            vm.step(null, SchedulingPolicy.RANDOM);
            java.util.List<Integer> turnos = new java.util.ArrayList<>();
            for (Snapshot.ProcessView p : vm.snapshot().processes()) {
                assertEquals(p.advanced(), p.advanceOrder() >= 0);
                if (p.advanced()) turnos.add(p.advanceOrder());
            }
            java.util.Collections.sort(turnos);
            for (int k = 0; k < turnos.size(); k++) {
                assertEquals(k, turnos.get(k));
            }
            assertTrue(!turnos.isEmpty());
        }
    }

    /**
     * Rojo, amarillo y verde son de los estados en la interfaz: ningun proceso los recibe.
     * Se controla el tono (HSL) de los colores de doce procesos, uno por color de la paleta.
     */
    @Test
    void coloresDeProcesoNoUsanLosDeLosEstados() {
        VirtualMachine vm = TestSupport.compileAndBuild("process P[i: 0..11] { skip; }", 0);
        for (Snapshot.ProcessView p : vm.snapshot().processes()) {
            double tono = tono(p.color());
            assertTrue(tono >= 180 && tono <= 335, p.name() + " tiene el color " + p.color());
        }
    }

    /** Tono en grados (0 rojo, 60 amarillo, 120 verde, 240 azul) de un color #rrggbb. */
    private static double tono(String hex) {
        double r = Integer.parseInt(hex.substring(1, 3), 16) / 255.0;
        double g = Integer.parseInt(hex.substring(3, 5), 16) / 255.0;
        double b = Integer.parseInt(hex.substring(5, 7), 16) / 255.0;
        double max = Math.max(r, Math.max(g, b));
        double d = max - Math.min(r, Math.min(g, b));
        double h;
        if (max == r) h = ((g - b) / d) % 6;
        else if (max == g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        return (h * 60 + 360) % 360;
    }

    // A entra primero; B y C quedan en la cola de entrada, en ese orden (ronda: A, B, C).
    private static final String COLA_DE_ENTRADA = """
            monitor M { int x = 0; procedure f() { x = x + 1; } }
            process A { M.f(); }
            process B { M.f(); }
            process C { M.f(); }
            """;

    /** ADR 0005: uno de los que esperan en la cola de entrada entra en el mismo instante. */
    @Test
    void alSalirDelMonitorEntraUnoDeLaColaEnElMismoInstante() {
        VirtualMachine vm = TestSupport.compileAndBuild(COLA_DE_ENTRADA, 0);
        vm.step(null, SchedulingPolicy.ROUND_ROBIN);   // A entra, B y C a la cola
        vm.step(null, SchedulingPolicy.ROUND_ROBIN);   // A: x = x + 1
        java.util.List<LogEntry> ev = vm.step(null, SchedulingPolicy.ROUND_ROBIN);

        Snapshot s = vm.snapshot();
        int dueno = s.monitors().get(0).lockOwner().id();
        assertTrue(dueno == 2 || dueno == 3, "entro " + dueno);
        java.util.List<String> kinds = ev.stream().map(e -> e.kind() + ":" + e.processId()).toList();
        int retorno = kinds.indexOf("RETURN:1");
        int entrada = kinds.indexOf("ENTER:" + dueno);
        assertTrue(retorno >= 0 && entrada > retorno, "eventos del instante: " + kinds);

        Snapshot.ProcessView entro = s.processes().get(dueno - 1);
        assertEquals("READY", entro.state());
        assertTrue(entro.advanced(), "la entrada por traspaso es su accion en este instante");
        int otro = dueno == 2 ? 3 : 2;
        assertEquals(java.util.List.of(otro),
                s.monitors().get(0).entryQueue().stream().map(Snapshot.ProcRef::id).toList());
    }

    /**
     * ADR 0006: cuando el monitor se libera compiten todos los de la cola de entrada y entra
     * cualquiera, no el que llego primero. B llega antes que C y aun asi, segun la semilla,
     * a veces entra C. Las semillas son como las del reloj que usa la interfaz: con turnos en
     * ronda este es el primer sorteo, y el generador (el de java.util.Random) da el mismo
     * primer valor para semillas chicas consecutivas.
     */
    @Test
    void laEntradaAlMonitorNoRespetaElOrdenDeLlegada() {
        java.util.Set<Integer> entraron = new java.util.HashSet<>();
        for (int k = 0; k < 25; k++) {
            long seed = 1_763_000_000_000L + k * 7_919L;
            VirtualMachine vm = TestSupport.compileAndBuild(COLA_DE_ENTRADA, seed);
            for (int i = 0; i < 3; i++) vm.step(null, SchedulingPolicy.ROUND_ROBIN);
            entraron.add(vm.snapshot().monitors().get(0).lockOwner().id());
        }
        assertEquals(java.util.Set.of(2, 3), entraron);
    }

    /** VI-1: un proceso que falla queda con su error y la linea donde ocurrio. */
    @Test
    void errorDeEjecucionQuedaConSuLinea() {
        RunResult r = TestSupport.run("""
                monitor M { int x = 0;
                  procedure f() {
                    x = 1 / x;
                  } }
                process P { M.f(); }
                """, SchedulingPolicy.ROUND_ROBIN, 0, 100);
        Snapshot.ProcessView p = r.vm().snapshot().processes().get(0);
        assertEquals("División por cero", p.error());
        assertEquals(3, p.line());
    }

    /** VS-6: los nombres internos (for (1..n), cota del rango) no aparecen en el snapshot. */
    @Test
    void variablesInternasNoSeMuestran() {
        VirtualMachine vm = TestSupport.compileAndBuild("process P { for (1..3) { skip; } }", 0);
        vm.step(null, SchedulingPolicy.ROUND_ROBIN);
        assertTrue(vm.snapshot().processes().get(0).locals().isEmpty());
    }
}
