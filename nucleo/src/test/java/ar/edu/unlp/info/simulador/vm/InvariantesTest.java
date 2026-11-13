package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.TestSupport;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Invariantes de la VM (skill semantica-concurrencia) chequeadas despues de cada step, con
 * varias semillas y las dos politicas, sobre {@link ProgramasCorpus}: exclusion mutua
 * seguida con los eventos, colas coherentes con el estado de cada proceso, ningun monitor
 * libre con cola de entrada, determinismo, deadlock honesto, topes, y el resultado que
 * declara cada ejemplo. No se corta en la primera violacion: las informa todas juntas.
 */
class InvariantesTest {

    /** En la verificacion del 23/09 se corrieron 200 semillas sin violaciones. */
    static final int SEMILLAS = 25;
    static final int MAX_PASOS = 4000;
    static final int TOPE_LOG = VirtualMachine.TOPE_LOG;
    /** La salida admite ademas una linea de aviso. */
    static final int TOPE_SALIDA = OutputBuffer.TOPE_SALIDA;

    private static final Set<String> EN_MONITOR = Set.of(
            "ASSIGN", "DECL", "SKIP", "WRITE", "PUSH", "POP", "SIGNAL", "SIGNAL_ALL");

    /** violacion -> primer caso que la mostro, y cantidad de ocurrencias. */
    private final Map<String, String> primera = new TreeMap<>();
    private final Map<String, Integer> cuenta = new TreeMap<>();

    private void violacion(String programa, String inv, String caso, String detalle) {
        String clave = programa + " | " + inv;
        cuenta.merge(clave, 1, Integer::sum);
        primera.putIfAbsent(clave, caso + " :: " + detalle);
    }

    @Test
    void invariantesEnCadaSnapshot() {
        for (Map.Entry<String, String> prog : ProgramasCorpus.todos().entrySet()) {
            for (SchedulingPolicy pol : SchedulingPolicy.values()) {
                for (int seed = 0; seed < SEMILLAS; seed++) {
                    correr(prog.getKey(), prog.getValue(), pol, seed);
                }
            }
        }
        StringBuilder sb = new StringBuilder();
        for (String k : primera.keySet()) {
            sb.append(k).append("  [x").append(cuenta.get(k)).append("]\n    ")
              .append(primera.get(k)).append('\n');
        }
        assertTrue(primera.isEmpty(), "Violaciones de invariantes:\n" + sb);
    }

    /** Control del propio chequeo: con snapshots armados a mano, tiene que ver las violaciones. */
    @Test
    void elChequeoDetectaViolacionesArmadas() {
        Snapshot.ProcRef p1 = new Snapshot.ProcRef(1, "A", "#000");
        Snapshot.ProcRef p2 = new Snapshot.ProcRef(2, "B", "#000");
        Snapshot.ProcessView a = new Snapshot.ProcessView(1, "A", "#000", "TERMINATED", null, null,
                null, -1, List.of(), null, false, -1);
        Snapshot.ProcessView b = new Snapshot.ProcessView(2, "B", "#000", "BLOCKED", "COND_WAIT",
                "M.c", "M.f", 3, List.of(), null, false, -1);
        Snapshot.MonitorView m = new Snapshot.MonitorView("M", List.of(),
                List.of(new Snapshot.CondView("c", List.of(p2))), p1, List.of(p2));
        Snapshot s = new Snapshot(1, List.of(a, b), List.of(m), List.of());
        chequearColas("control", "c", s);
        chequearExclusion("control", "c", List.of(), s, new HashMap<>());
        Snapshot libre = new Snapshot(1, List.of(a, b),
                List.of(new Snapshot.MonitorView("M", List.of(), List.of(), null, List.of(p2))), List.of());
        chequearSalidaDelMonitor("control", "c", libre);
        assertTrue(primera.containsKey("control | 2-colas"), primera.toString());
        assertTrue(primera.containsKey("control | 1-duenio-vivo"), primera.toString());
        assertTrue(primera.containsKey("control | 1-exclusion"), primera.toString());
        assertTrue(primera.containsKey("control | 3-libre-con-cola"), primera.toString());
    }

    /** @return resumen del final: fin/deadlock/corte, con o sin error. */
    private String correr(String nombre, String src, SchedulingPolicy pol, int seed) {
        String caso = pol + " seed=" + seed;
        VirtualMachine vm = TestSupport.compileAndBuild(src, seed);
        VirtualMachine gemela = TestSupport.compileAndBuild(src, seed);
        Map<String, Integer> duenio = new HashMap<>();   // monitor -> id, segun los eventos
        boolean deadlockVisto = false;
        int paso;
        for (paso = 1; paso <= MAX_PASOS; paso++) {
            if (vm.isFinished()) break;
            boolean estabaEnDeadlock = vm.isDeadlocked();
            List<LogEntry> ev;
            List<LogEntry> evGemela;
            try {
                ev = vm.step(null, pol);
            } catch (RuntimeError re) {
                violacion(nombre, "5-error-interno", caso + " paso=" + paso,
                        "RuntimeError escapo de step: " + re.getMessage());
                break;
            } catch (Throwable t) {
                violacion(nombre, "5-error-interno", caso + " paso=" + paso,
                        t.getClass().getSimpleName() + ": " + t.getMessage());
                break;
            }
            try {
                evGemela = gemela.step(null, pol);
            } catch (Throwable t) {
                evGemela = List.of();
            }
            Snapshot s = vm.snapshot();
            String c = caso + " paso=" + paso;

            // 4. determinismo
            if (!ev.equals(evGemela) || !s.equals(gemela.snapshot())) {
                violacion(nombre, "4-determinismo", c, "dos corridas iguales divergen");
            }
            chequearExclusion(nombre, c, ev, s, duenio);
            chequearColas(nombre, c, s);
            chequearSalidaDelMonitor(nombre, c, s);

            // 5. deadlock honesto
            boolean hayDeadlockEv = ev.stream().anyMatch(e -> e.kind().equals("DEADLOCK"));
            if (hayDeadlockEv && !vm.isDeadlocked()) {
                violacion(nombre, "5-deadlock", c, "evento DEADLOCK sin que isDeadlocked()");
            }
            if (vm.isDeadlocked()) {
                deadlockVisto = true;
                for (Snapshot.ProcessView p : s.processes()) {
                    if (p.state().equals("READY") || p.state().equals("RUNNING")) {
                        violacion(nombre, "5-deadlock", c, p.name() + " " + p.state() + " en deadlock");
                    }
                }
            }
            for (Snapshot.ProcessView p : s.processes()) {
                if (p.state().equals("RUNNING")) {
                    violacion(nombre, "2-running-tras-step", c, p.name() + " quedo RUNNING");
                }
            }
            // 6. topes
            if (vm.allLogs().size() > TOPE_LOG) {
                violacion(nombre, "6-tope-log", c, "log=" + vm.allLogs().size());
            }
            if (s.output().size() > TOPE_SALIDA + 1) {
                violacion(nombre, "6-tope-salida", c, "salida=" + s.output().size());
            }
            if (estabaEnDeadlock) break; // ya se forzo el evento DEADLOCK
        }

        Snapshot fin = vm.snapshot();
        boolean huboError = fin.processes().stream().anyMatch(p -> p.error() != null);
        String estado = vm.isFinished() ? "fin" : vm.isDeadlocked() ? "deadlock" : "corte";
        if (estado.equals("deadlock") && huboError) estado = "deadlock-tras-error";
        chequearEsperado(nombre, src, caso, vm, fin, huboError);
        if (deadlockVisto && !vm.isDeadlocked()) {
            violacion(nombre, "5-deadlock", caso, "salio del deadlock");
        }
        return estado + (huboError ? "+error" : "");
    }

    /** 1. exclusion mutua, seguida con los eventos, independiente del lockOwner de la VM. */
    private void chequearExclusion(String nombre, String c, List<LogEntry> ev, Snapshot s,
                                   Map<String, Integer> duenio) {
        Map<Integer, Snapshot.ProcessView> porId = new HashMap<>();
        for (Snapshot.ProcessView p : s.processes()) porId.put(p.id(), p);

        for (LogEntry e : ev) {
            Integer pid = e.processId();
            String mon = e.resource().contains(".")
                    ? e.resource().substring(0, e.resource().indexOf('.')) : e.resource();
            switch (e.kind()) {
                case "ENTER", "REENTER" -> {
                    Integer prev = duenio.get(mon);
                    if (prev != null) {
                        violacion(nombre, "1-exclusion", c, "P" + pid + " entra a " + mon
                                + " que tiene P" + prev + " (" + e.message() + ")");
                    }
                    duenio.put(mon, pid);
                }
                case "RETURN", "WAIT", "RELEASE" -> {
                    Integer prev = duenio.get(mon);
                    if (prev == null || !prev.equals(pid)) {
                        violacion(nombre, "1-exclusion", c, "P" + pid + " suelta " + mon
                                + " que tenia P" + prev + " (" + e.message() + ")");
                    }
                    duenio.remove(mon);
                }
                default -> { }
            }
        }
        // sentencias ejecutadas dentro de un monitor: el que las ejecuta tiene el lock
        for (LogEntry e : ev) {
            if (!EN_MONITOR.contains(e.kind()) || e.processId() == null) continue;
            Snapshot.ProcessView p = porId.get(e.processId());
            if (p == null || p.location() == null) continue;
            String mon = p.location().substring(0, p.location().indexOf('.'));
            if (!e.processId().equals(duenio.get(mon))) {
                violacion(nombre, "1-exclusion", c, p.name() + " ejecuta '" + e.message()
                        + "' en " + mon + " sin el lock (duenio P" + duenio.get(mon) + ")");
            }
        }
        for (Snapshot.MonitorView m : s.monitors()) {
            Integer segunEventos = duenio.get(m.name());
            Integer segunVm = m.lockOwner() == null ? null : m.lockOwner().id();
            if (segunEventos == null ? segunVm != null : !segunEventos.equals(segunVm)) {
                violacion(nombre, "1-exclusion", c, m.name() + ": eventos dicen P" + segunEventos
                        + ", snapshot dice P" + segunVm);
            }
            if (m.lockOwner() != null) {
                Snapshot.ProcessView o = porId.get(m.lockOwner().id());
                if (o.state().equals("TERMINATED")) {
                    violacion(nombre, "1-duenio-vivo", c, m.name() + " tomado por " + o.name() + " terminado");
                }
                if ("COND_WAIT".equals(o.blockReason()) && o.blockedOn() != null
                        && o.blockedOn().startsWith(m.name() + ".")) {
                    violacion(nombre, "1-duenio-en-cond", c, m.name() + " tomado por " + o.name()
                            + " que espera en " + o.blockedOn());
                }
            }
        }
    }

    /** 2. cada BLOCKED en exactamente una cola, coherente con blockReason/blockedOn. */
    private void chequearColas(String nombre, String c, Snapshot s) {
        Map<Integer, List<String>> dondeEsta = new HashMap<>();
        for (Snapshot.MonitorView m : s.monitors()) {
            for (Snapshot.ProcRef r : m.entryQueue()) {
                dondeEsta.computeIfAbsent(r.id(), k -> new ArrayList<>()).add("ENTRY:" + m.name());
            }
            for (Snapshot.CondView cv : m.conds()) {
                for (Snapshot.ProcRef r : cv.queue()) {
                    dondeEsta.computeIfAbsent(r.id(), k -> new ArrayList<>())
                            .add("COND:" + m.name() + "." + cv.name());
                }
            }
        }
        for (Snapshot.ProcessView p : s.processes()) {
            List<String> colas = dondeEsta.getOrDefault(p.id(), List.of());
            if (!p.state().equals("BLOCKED")) {
                if (!colas.isEmpty()) {
                    violacion(nombre, "2-colas", c, p.name() + " " + p.state() + " figura en " + colas);
                }
                continue;
            }
            String esperado = "MONITOR_ENTRY".equals(p.blockReason()) ? "ENTRY:" + p.blockedOn()
                    : "COND_WAIT".equals(p.blockReason()) ? "COND:" + p.blockedOn() : "?";
            if (colas.size() != 1 || !colas.get(0).equals(esperado)) {
                violacion(nombre, "2-colas", c, p.name() + " BLOCKED(" + p.blockReason() + ", "
                        + p.blockedOn() + ") pero esta en " + colas);
            }
        }
    }

    /** 3. monitor libre con cola de entrada no vacia: nadie los va a despertar. */
    private void chequearSalidaDelMonitor(String nombre, String c, Snapshot s) {
        for (Snapshot.MonitorView m : s.monitors()) {
            if (m.lockOwner() == null && !m.entryQueue().isEmpty()) {
                violacion(nombre, "3-libre-con-cola", c, m.name() + " libre con cola " + m.entryQueue());
            }
        }
    }

    /** 7. los ejemplos cumplen su "// espera:" en todas las semillas. */
    private void chequearEsperado(String nombre, String src, String caso, VirtualMachine vm,
                                  Snapshot fin, boolean huboError) {
        if (!nombre.startsWith("ejemplo/")) return;
        String[] espera = src.lines().skip(1).findFirst().orElse("")
                .replaceFirst("^//\\s*espera:\\s*", "").trim().split("\\s+");
        if (espera[0].equals("deadlock")) {
            if (!vm.isDeadlocked()) violacion(nombre, "7-esperado", caso, "no llego a deadlock");
            return;
        }
        if (!vm.isFinished() || huboError) {
            violacion(nombre, "7-esperado", caso, "no termino limpio (fin=" + vm.isFinished()
                    + ", error=" + huboError + ")");
            return;
        }
        for (int i = 1; i < espera.length; i++) {
            int punto = espera[i].indexOf('.');
            int igual = espera[i].indexOf('=');
            String mon = espera[i].substring(0, punto);
            String var = espera[i].substring(punto + 1, igual);
            String val = espera[i].substring(igual + 1);
            String real = TestSupport.varValue(TestSupport.monitor(fin, mon), var);
            if (!real.equals(val)) {
                violacion(nombre, "7-esperado", caso, mon + "." + var + "=" + real + " (esperado " + val + ")");
            }
        }
    }
}
