package ar.edu.unlp.info.simulador.vm;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/** Arma la {@link Snapshot} del estado de la maquina virtual en un instante. */
final class SnapshotBuilder {

    private SnapshotBuilder() { }

    /**
     * @param advanced ids de los procesos que avanzaron en el ultimo instante, en orden de turno
     */
    static Snapshot build(int instant, List<Process> processes, Collection<Monitor> monitors,
                          List<Integer> advanced, List<Snapshot.OutputLine> output) {
        List<Snapshot.ProcessView> pv = new ArrayList<>();
        for (Process p : processes) {
            pv.add(processView(p, advanced, monitors));
        }
        List<Snapshot.MonitorView> mv = new ArrayList<>();
        for (Monitor m : monitors) {
            mv.add(monitorView(m));
        }
        return new Snapshot(instant, pv, mv, output);
    }

    private static Snapshot.ProcessView processView(Process p, List<Integer> advanced,
                                                    Collection<Monitor> monitors) {
        List<String> holding = new ArrayList<>();
        for (Monitor m : monitors) {
            if (m.lockOwner() == p) holding.add(m.name());
        }
        Activation act = p.current();
        List<Snapshot.VarView> locals = new ArrayList<>();
        if (act != null) {
            for (Map.Entry<String, Value> e : act.locals().entrySet()) {
                // los nombres con '#' son internos (iterador de for (1..n), cota de rango)
                if (e.getKey().indexOf('#') >= 0) continue;
                locals.add(varView(e.getKey(), e.getValue(), null));
            }
        }
        return new Snapshot.ProcessView(
                p.id(), p.name(), p.color(),
                p.state().name(),
                p.blockReason() == null ? null : p.blockReason().name(),
                p.blockedOn(),
                p.currentLocation(),
                p.currentLine(),
                locals,
                p.errorMessage(),
                advanced.contains(p.id()),
                advanced.indexOf(p.id()),
                holding,
                p.isDelayed() ? p.delayEndsAt() : null);
    }

    private static Snapshot.MonitorView monitorView(Monitor m) {
        List<Snapshot.VarView> vars = new ArrayList<>();
        for (Map.Entry<String, Value> e : m.vars().entrySet()) {
            vars.add(varView(e.getKey(), e.getValue(), m.lastWriter(e.getKey())));
        }
        List<Snapshot.CondView> conds = new ArrayList<>();
        for (ConditionVariable cv : m.conds().values()) {
            conds.add(new Snapshot.CondView(cv.name(), refs(cv.waiting())));
        }
        return new Snapshot.MonitorView(
                m.name(), vars, conds,
                m.lockOwner() == null || m.lockOwner().id() < 0 ? null : ref(m.lockOwner()),
                refs(m.entryQueueSnapshot()));
    }

    private static Snapshot.VarView varView(String name, Value v, Integer writer) {
        boolean isArray = v instanceof Value.ArrayVal;
        return new Snapshot.VarView(name, v.typeName(), v.display(), isArray, writer);
    }

    private static Snapshot.ProcRef ref(Process p) {
        return new Snapshot.ProcRef(p.id(), p.name(), p.color());
    }

    private static List<Snapshot.ProcRef> refs(List<Process> ps) {
        List<Snapshot.ProcRef> out = new ArrayList<>();
        for (Process p : ps) out.add(ref(p));
        return out;
    }
}
