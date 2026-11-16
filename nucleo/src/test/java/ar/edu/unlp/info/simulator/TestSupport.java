package ar.edu.unlp.info.simulator;

import ar.edu.unlp.info.simulator.lang.Compiler;
import ar.edu.unlp.info.simulator.vm.LogEntry;
import ar.edu.unlp.info.simulator.vm.SchedulingPolicy;
import ar.edu.unlp.info.simulator.vm.Snapshot;
import ar.edu.unlp.info.simulator.vm.VirtualMachine;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.fail;

/** Utilidades compartidas por los tests del nucleo. */
public final class TestSupport {

    private TestSupport() { }

    public record RunResult(VirtualMachine vm, List<LogEntry> logs, boolean finished, boolean deadlock) { }

    public static VirtualMachine compileAndBuild(String src, long seed) {
        return new VirtualMachine(Compiler.compile(src), seed);
    }

    /** Ejecuta hasta terminar o quedar en deadlock, con un tope de instantes. */
    public static RunResult run(String src, SchedulingPolicy policy, long seed, int maxSteps) {
        VirtualMachine vm = compileAndBuild(src, seed);
        List<LogEntry> all = new ArrayList<>();
        int steps = 0;
        while (!vm.isFinished() && !vm.isDeadlocked() && steps < maxSteps) {
            all.addAll(vm.step(null, policy));
            steps++;
        }
        if (vm.isDeadlocked()) {
            all.addAll(vm.step(null, policy)); // fuerza el evento DEADLOCK
        }
        if (steps >= maxSteps && !vm.isFinished() && !vm.isDeadlocked()) {
            fail("La simulacion no termino en " + maxSteps + " instantes");
        }
        return new RunResult(vm, all, vm.isFinished(), vm.isDeadlocked());
    }

    public static Snapshot.MonitorView monitor(Snapshot s, String name) {
        return s.monitors().stream().filter(m -> m.name().equals(name)).findFirst().orElseThrow();
    }

    public static String varValue(Snapshot.MonitorView m, String var) {
        return m.vars().stream().filter(v -> v.name().equals(var)).findFirst().orElseThrow().value();
    }

    /** Valor de una variable permanente al terminar la ejecucion. */
    public static String finalVar(RunResult r, String monitorName, String var) {
        return varValue(monitor(r.vm().snapshot(), monitorName), var);
    }
}
