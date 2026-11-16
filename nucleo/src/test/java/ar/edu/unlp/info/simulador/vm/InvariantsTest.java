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
 * varias semillas y las dos politicas, sobre {@link ProgramCorpus}: exclusion mutua
 * seguida con los eventos, colas coherentes con el estado de cada proceso, ningun monitor
 * libre con cola de entrada, determinismo, deadlock honesto, topes, y el resultado que
 * declara cada ejemplo. No se corta en la primera violacion: las informa todas juntas.
 */
class InvariantsTest {

    /** En la verificacion del 23/09 se corrieron 200 semillas sin violaciones. */
    static final int SEEDS = 25;
    static final int MAX_STEPS = 4000;
    static final int MAX_ENTRIES = EventLog.MAX_ENTRIES;
    /** La salida admite ademas una linea de aviso. */
    static final int MAX_LINES = OutputBuffer.MAX_LINES;

    private static final Set<String> INSIDE_MONITOR = Set.of(
            "ASSIGN", "DECL", "SKIP", "WRITE", "PUSH", "POP", "SIGNAL", "SIGNAL_ALL");

    /** violacion -> primer caso que la mostro, y cantidad de ocurrencias. */
    private final Map<String, String> firstSeen = new TreeMap<>();
    private final Map<String, Integer> counts = new TreeMap<>();

    private void violation(String program, String inv, String testCase, String detail) {
        String key = program + " | " + inv;
        counts.merge(key, 1, Integer::sum);
        firstSeen.putIfAbsent(key, testCase + " :: " + detail);
    }

    @Test
    void invariantsHoldAfterEveryStep() {
        for (Map.Entry<String, String> prog : ProgramCorpus.allPrograms().entrySet()) {
            for (SchedulingPolicy pol : SchedulingPolicy.values()) {
                for (int seed = 0; seed < SEEDS; seed++) {
                    runOnce(prog.getKey(), prog.getValue(), pol, seed);
                }
            }
        }
        StringBuilder sb = new StringBuilder();
        for (String k : firstSeen.keySet()) {
            sb.append(k).append("  [x").append(counts.get(k)).append("]\n    ")
              .append(firstSeen.get(k)).append('\n');
        }
        assertTrue(firstSeen.isEmpty(), "Violaciones de invariantes:\n" + sb);
    }

    /** Control del propio chequeo: con snapshots armados a mano, tiene que ver las violaciones. */
    @Test
    void checkerDetectsPlantedViolations() {
        Snapshot.ProcRef p1 = new Snapshot.ProcRef(1, "A", "#000");
        Snapshot.ProcRef p2 = new Snapshot.ProcRef(2, "B", "#000");
        Snapshot.ProcessView a = new Snapshot.ProcessView(1, "A", "#000", "TERMINATED", null, null,
                null, -1, List.of(), null, false, -1, List.of(), null);
        Snapshot.ProcessView b = new Snapshot.ProcessView(2, "B", "#000", "BLOCKED", "COND_WAIT",
                "M.c", "M.f", 3, List.of(), null, false, -1, List.of(), null);
        Snapshot.MonitorView m = new Snapshot.MonitorView("M", List.of(),
                List.of(new Snapshot.CondView("c", List.of(p2))), p1, List.of(p2));
        Snapshot s = new Snapshot(1, List.of(a, b), List.of(m), List.of());
        checkQueues("control", "c", s);
        checkExclusion("control", "c", List.of(), s, new HashMap<>());
        Snapshot free = new Snapshot(1, List.of(a, b),
                List.of(new Snapshot.MonitorView("M", List.of(), List.of(), null, List.of(p2))), List.of());
        checkMonitorExit("control", "c", free);
        assertTrue(firstSeen.containsKey("control | 2-colas"), firstSeen.toString());
        assertTrue(firstSeen.containsKey("control | 1-duenio-vivo"), firstSeen.toString());
        assertTrue(firstSeen.containsKey("control | 1-exclusion"), firstSeen.toString());
        assertTrue(firstSeen.containsKey("control | 3-libre-con-cola"), firstSeen.toString());
    }

    /** @return resumen del final: fin/deadlock/corte, con o sin error. */
    private String runOnce(String programName, String src, SchedulingPolicy pol, int seed) {
        String testCase = pol + " seed=" + seed;
        VirtualMachine vm = TestSupport.compileAndBuild(src, seed);
        VirtualMachine twin = TestSupport.compileAndBuild(src, seed);
        Map<String, Integer> owner = new HashMap<>();   // monitor -> id, segun los eventos
        boolean deadlockSeen = false;
        int stepJson;
        for (stepJson = 1; stepJson <= MAX_STEPS; stepJson++) {
            if (vm.isFinished()) break;
            boolean wasDeadlocked = vm.isDeadlocked();
            List<LogEntry> ev;
            List<LogEntry> twinEvaluator;
            try {
                ev = vm.step(null, pol);
            } catch (RuntimeError re) {
                violation(programName, "5-error-interno", testCase + " paso=" + stepJson,
                        "RuntimeError escapo de step: " + re.getMessage());
                break;
            } catch (Throwable t) {
                violation(programName, "5-error-interno", testCase + " paso=" + stepJson,
                        t.getClass().getSimpleName() + ": " + t.getMessage());
                break;
            }
            try {
                twinEvaluator = twin.step(null, pol);
            } catch (Throwable t) {
                twinEvaluator = List.of();
            }
            Snapshot s = vm.snapshot();
            String c = testCase + " paso=" + stepJson;

            // 4. determinismo
            if (!ev.equals(twinEvaluator) || !s.equals(twin.snapshot())) {
                violation(programName, "4-determinismo", c, "dos corridas iguales divergen");
            }
            checkExclusion(programName, c, ev, s, owner);
            checkQueues(programName, c, s);
            checkMonitorExit(programName, c, s);

            // 5. deadlock honesto
            boolean deadlockEventSeen = ev.stream().anyMatch(e -> e.kind().equals("DEADLOCK"));
            if (deadlockEventSeen && !vm.isDeadlocked()) {
                violation(programName, "5-deadlock", c, "evento DEADLOCK sin que isDeadlocked()");
            }
            if (vm.isDeadlocked()) {
                deadlockSeen = true;
                for (Snapshot.ProcessView p : s.processes()) {
                    if (p.state().equals("READY") || p.state().equals("RUNNING")) {
                        violation(programName, "5-deadlock", c, p.name() + " " + p.state() + " en deadlock");
                    }
                }
            }
            for (Snapshot.ProcessView p : s.processes()) {
                if (p.state().equals("RUNNING")) {
                    violation(programName, "2-running-tras-step", c, p.name() + " quedo RUNNING");
                }
            }
            // 6. topes
            if (vm.allLogs().size() > MAX_ENTRIES) {
                violation(programName, "6-tope-log", c, "log=" + vm.allLogs().size());
            }
            if (s.output().size() > MAX_LINES + 1) {
                violation(programName, "6-tope-salida", c, "salida=" + s.output().size());
            }
            if (wasDeadlocked) break; // ya se forzo el evento DEADLOCK
        }

        Snapshot end = vm.snapshot();
        boolean hadError = end.processes().stream().anyMatch(p -> p.error() != null);
        String stateName = vm.isFinished() ? "fin" : vm.isDeadlocked() ? "deadlock" : "corte";
        if (stateName.equals("deadlock") && hadError) stateName = "deadlock-tras-error";
        checkExpected(programName, src, testCase, vm, end, hadError);
        if (deadlockSeen && !vm.isDeadlocked()) {
            violation(programName, "5-deadlock", testCase, "salio del deadlock");
        }
        return stateName + (hadError ? "+error" : "");
    }

    /** 1. exclusion mutua, seguida con los eventos, independiente del lockOwner de la VM. */
    private void checkExclusion(String programName, String c, List<LogEntry> ev, Snapshot s,
                                   Map<String, Integer> owner) {
        Map<Integer, Snapshot.ProcessView> byId = new HashMap<>();
        for (Snapshot.ProcessView p : s.processes()) byId.put(p.id(), p);

        for (LogEntry e : ev) {
            Integer pid = e.processId();
            String mon = e.resource().contains(".")
                    ? e.resource().substring(0, e.resource().indexOf('.')) : e.resource();
            switch (e.kind()) {
                case "ENTER", "REENTER" -> {
                    Integer prev = owner.get(mon);
                    if (prev != null) {
                        violation(programName, "1-exclusion", c, "P" + pid + " entra a " + mon
                                + " que tiene P" + prev + " (" + e.message() + ")");
                    }
                    owner.put(mon, pid);
                }
                case "RETURN", "WAIT", "RELEASE" -> {
                    Integer prev = owner.get(mon);
                    if (prev == null || !prev.equals(pid)) {
                        violation(programName, "1-exclusion", c, "P" + pid + " suelta " + mon
                                + " que tenia P" + prev + " (" + e.message() + ")");
                    }
                    owner.remove(mon);
                }
                default -> { }
            }
        }
        // sentencias ejecutadas dentro de un monitor: el que las ejecuta tiene el lock
        for (LogEntry e : ev) {
            if (!INSIDE_MONITOR.contains(e.kind()) || e.processId() == null) continue;
            Snapshot.ProcessView p = byId.get(e.processId());
            if (p == null || p.location() == null) continue;
            String mon = p.location().substring(0, p.location().indexOf('.'));
            if (!e.processId().equals(owner.get(mon))) {
                violation(programName, "1-exclusion", c, p.name() + " ejecuta '" + e.message()
                        + "' en " + mon + " sin el lock (duenio P" + owner.get(mon) + ")");
            }
        }
        for (Snapshot.MonitorView m : s.monitors()) {
            Integer fromEvents = owner.get(m.name());
            Integer fromVm = m.lockOwner() == null ? null : m.lockOwner().id();
            if (fromEvents == null ? fromVm != null : !fromEvents.equals(fromVm)) {
                violation(programName, "1-exclusion", c, m.name() + ": eventos dicen P" + fromEvents
                        + ", snapshot dice P" + fromVm);
            }
            if (m.lockOwner() != null) {
                Snapshot.ProcessView o = byId.get(m.lockOwner().id());
                if (o.state().equals("TERMINATED")) {
                    violation(programName, "1-duenio-vivo", c, m.name() + " tomado por " + o.name() + " terminado");
                }
                if ("COND_WAIT".equals(o.blockReason()) && o.blockedOn() != null
                        && o.blockedOn().startsWith(m.name() + ".")) {
                    violation(programName, "1-duenio-en-cond", c, m.name() + " tomado por " + o.name()
                            + " que espera en " + o.blockedOn());
                }
            }
        }
    }

    /** 2. cada BLOCKED en exactamente una cola, coherente con blockReason/blockedOn. */
    private void checkQueues(String programName, String c, Snapshot s) {
        Map<Integer, List<String>> whereIs = new HashMap<>();
        for (Snapshot.MonitorView m : s.monitors()) {
            for (Snapshot.ProcRef r : m.entryQueue()) {
                whereIs.computeIfAbsent(r.id(), k -> new ArrayList<>()).add("ENTRY:" + m.name());
            }
            for (Snapshot.CondView cv : m.conds()) {
                for (Snapshot.ProcRef r : cv.queue()) {
                    whereIs.computeIfAbsent(r.id(), k -> new ArrayList<>())
                            .add("COND:" + m.name() + "." + cv.name());
                }
            }
        }
        for (Snapshot.ProcessView p : s.processes()) {
            List<String> queues = whereIs.getOrDefault(p.id(), List.of());
            if (!p.state().equals("BLOCKED")) {
                if (!queues.isEmpty()) {
                    violation(programName, "2-colas", c, p.name() + " " + p.state() + " figura en " + queues);
                }
                continue;
            }
            if ("DELAY".equals(p.blockReason())) {
                // demorado por un delay: no esta en ninguna cola
                if (!queues.isEmpty()) {
                    violation(programName, "2-colas", c, p.name() + " en delay figura en " + queues);
                }
                continue;
            }
            String expected = "MONITOR_ENTRY".equals(p.blockReason()) ? "ENTRY:" + p.blockedOn()
                    : "COND_WAIT".equals(p.blockReason()) ? "COND:" + p.blockedOn() : "?";
            if (queues.size() != 1 || !queues.get(0).equals(expected)) {
                violation(programName, "2-colas", c, p.name() + " BLOCKED(" + p.blockReason() + ", "
                        + p.blockedOn() + ") pero esta en " + queues);
            }
        }
    }

    /** 3. monitor libre con cola de entrada no vacia: nadie los va a despertar. */
    private void checkMonitorExit(String programName, String c, Snapshot s) {
        for (Snapshot.MonitorView m : s.monitors()) {
            if (m.lockOwner() == null && !m.entryQueue().isEmpty()) {
                violation(programName, "3-libre-con-cola", c, m.name() + " libre con cola " + m.entryQueue());
            }
        }
    }

    /** 7. los ejemplos cumplen su "// espera:" en todas las semillas. */
    private void checkExpected(String programName, String src, String testCase, VirtualMachine vm,
                                  Snapshot end, boolean hadError) {
        if (!programName.startsWith("example/")) return;
        String[] waiting = src.lines().skip(1).findFirst().orElse("")
                .replaceFirst("^//\\s*espera:\\s*", "").trim().split("\\s+");
        if (waiting[0].equals("deadlock")) {
            if (!vm.isDeadlocked()) violation(programName, "7-esperado", testCase, "no llego a deadlock");
            return;
        }
        if (!vm.isFinished() || hadError) {
            violation(programName, "7-esperado", testCase, "no termino limpio (fin=" + vm.isFinished()
                    + ", error=" + hadError + ")");
            return;
        }
        for (int i = 1; i < waiting.length; i++) {
            int punto = waiting[i].indexOf('.');
            int igual = waiting[i].indexOf('=');
            String mon = waiting[i].substring(0, punto);
            String var = waiting[i].substring(punto + 1, igual);
            String val = waiting[i].substring(igual + 1);
            String real = TestSupport.varValue(TestSupport.monitor(end, mon), var);
            if (!real.equals(val)) {
                violation(programName, "7-esperado", testCase, mon + "." + var + "=" + real + " (esperado " + val + ")");
            }
        }
    }
}
