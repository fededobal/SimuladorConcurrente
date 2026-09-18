package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.lang.parser.ast.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.function.Function;

/**
 * Maquina virtual del simulador de monitores. Ejecuta un {@link Program} paso a paso: en
 * cada instante avanza exactamente un proceso una sentencia (accion atomica). Implementa la
 * exclusion mutua implicita de los monitores y la disciplina <em>signal and continue</em>.
 */
public final class VirtualMachine {

    private static final String[] PALETTE = {
            "#ef4444", "#3b82f6", "#10b981", "#f59e0b",
            "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
            "#84cc16", "#a855f7", "#14b8a6", "#eab308"
    };

    /** Tope de iteraciones estructurales (bloques anidados) por instante, corta busy-waits. */
    /** Probabilidad (en %) de que un proceso listo avance en un instante dado. */
    private static final int PROB_AVANCE = 80;

    /** Tope de lineas guardadas: un bucle largo no puede comerse la memoria. */
    private static final int TOPE_SALIDA = 500;

    private static final int STRUCTURAL_CAP = 4000;

    private final Program program;
    private final Random random;

    private final List<Process> processes = new ArrayList<>();
    private final List<Snapshot.OutputLine> salida = new ArrayList<>();
    private final Map<String, Monitor> monitors = new LinkedHashMap<>();
    private final Map<String, MonitorDef> monitorDefs = new LinkedHashMap<>();

    private final List<LogEntry> log = new ArrayList<>();

    private int instant = 0;
    private int rrCursor = -1;
    private boolean logging = true;
    private boolean deadlockLogged = false;

    public VirtualMachine(Program program, long seed) {
        this.program = program;
        this.random = new Random(seed);
        initialize();
    }

    // ================================================================= init

    private void initialize() {
        for (MonitorDef md : program.monitors()) {
            monitorDefs.put(md.name(), md);
            Monitor m = new Monitor(md.name());
            monitors.put(md.name(), m);

            ExprEvaluator ev = new ExprEvaluator(m::getVar);

            for (VarDecl vd : md.permanentVars()) {
                m.vars().put(vd.name(), buildInitialValue(vd, ev));
            }
            for (CondDecl cd : md.conds()) {
                if (cd.isArray()) {
                    int size = ev.evalInt(cd.sizeExpr());
                    for (int i = 0; i < size; i++) {
                        String key = cd.name() + "[" + i + "]";
                        m.conds().put(key, new ConditionVariable(key));
                    }
                } else {
                    m.conds().put(cd.name(), new ConditionVariable(cd.name()));
                }
            }
        }

        // codigo de inicializacion de cada monitor (sin registrar eventos)
        logging = false;
        for (MonitorDef md : program.monitors()) {
            if (md.initStmts().isEmpty()) continue;
            Monitor m = monitors.get(md.name());
            Process sys = new Process(-1, "«init " + md.name() + "»", "#888888");
            Activation act = new Activation(md.name(), "«init»");
            act.pushFront(md.initStmts());
            sys.push(act);
            m.setLockOwner(sys);
            int guard = 0;
            while (!sys.isFinished() && guard++ < 100_000) {
                advance(sys);
            }
            m.setLockOwner(null);
        }
        logging = true;

        int colorIdx = 0;
        for (ProcessDef pd : program.processes()) {
            if (pd.isFamily()) {
                ExprEvaluator ev = new ExprEvaluator(name -> null);
                int from = ev.evalInt(pd.quant().from());
                int to = ev.evalInt(pd.quant().to());
                for (int i = from; i <= to; i++) {
                    Process p = new Process(processes.size() + 1, pd.name() + "[" + i + "]",
                            PALETTE[colorIdx++ % PALETTE.length]);
                    Activation frame = Activation.processFrame();
                    frame.locals().put(pd.quant().iterator(), new Value.IntVal(i));
                    frame.pushFront(pd.body().statements());
                    p.push(frame);
                    processes.add(p);
                }
            } else {
                Process p = new Process(processes.size() + 1, pd.name(),
                        PALETTE[colorIdx++ % PALETTE.length]);
                Activation frame = Activation.processFrame();
                frame.pushFront(pd.body().statements());
                p.push(frame);
                processes.add(p);
            }
        }
    }

    private Value buildInitialValue(VarDecl vd, ExprEvaluator ev) {
        if (vd.type().isQueue()) {
            return Value.defaultFor(vd.type());
        }
        if (vd.isArray()) {
            int size = ev.evalInt(vd.sizeExpr());
            Value fill = vd.initExpr() == null
                    ? Value.defaultFor(vd.type())
                    : ev.eval(vd.initExpr()).coerceTo(vd.type());
            Value[] elems = new Value[size];
            for (int i = 0; i < size; i++) elems[i] = fill;
            return new Value.ArrayVal(vd.type(), elems);
        }
        return vd.initExpr() == null
                ? Value.defaultFor(vd.type())
                : ev.eval(vd.initExpr()).coerceTo(vd.type());
    }

    // ================================================================= scheduling

    /**
     * Avanza un instante. Los procesos corren en paralelo de verdad: en un mismo instante
     * avanzan varios, no uno solo. Eso es lo que hace visible la contencion — dos procesos
     * que piden el mismo monitor a la vez, y uno se queda en la cola de entrada.
     *
     * <p>Cual avanza y en que orden lo decide la politica. El orden dentro del instante
     * importa: es el que resuelve quien gana el monitor cuando varios lo piden a la vez.
     *
     * <p>Si se pide un proceso puntual ({@code chosenProcessId}), avanza solo ese: es el
     * modo paso a paso, para seguir a un proceso sin que el resto se mueva.
     *
     * @return los eventos generados por este instante
     */
    public List<LogEntry> step(Integer chosenProcessId, SchedulingPolicy policy) {
        int mark = log.size();

        if (isFinished()) {
            return List.of();
        }
        List<Process> turno = elegirTurno(chosenProcessId, policy);
        if (turno.isEmpty()) {
            if (!deadlockLogged) {
                deadlockLogged = true;
                instant++;
                systemLog("DEADLOCK", "Interbloqueo: ningun proceso puede avanzar");
            }
            return tail(mark);
        }

        instant++;
        for (Process p : turno) {
            // Entre que se armo el turno y le toca, otro pudo haberlo bloqueado tomando el
            // monitor que este queria: solo avanza si sigue listo.
            if (p.state() != Process.State.READY) {
                continue;
            }
            p.setState(Process.State.RUNNING);
            try {
                advance(p);
            } catch (RuntimeError re) {
                p.fail(re.getMessage());
                event(p, "ERROR", "", p.name() + ": error de ejecucion - " + re.getMessage());
            }
            if (p.state() == Process.State.RUNNING) {
                p.setState(Process.State.READY);
            }
        }
        if (isDeadlocked() && !deadlockLogged) {
            deadlockLogged = true;
            systemLog("DEADLOCK", "Interbloqueo: ningun proceso puede avanzar");
        }
        return tail(mark);
    }

    /**
     * Los procesos que avanzan en este instante, en el orden en que lo hacen.
     *
     * <p>No avanzan siempre todos: cada proceso listo entra al turno con probabilidad alta
     * pero no segura, y siempre entra al menos uno. Si avanzaran todos en cada instante el
     * programa correria en lockstep y los alumnos verian siempre el mismo entrelazado; que
     * unos avancen mas rapido que otros es lo que hace aparecer los casos raros.
     */
    private List<Process> elegirTurno(Integer chosenProcessId, SchedulingPolicy policy) {
        List<Process> listos = processes.stream()
                .filter(pr -> pr.state() == Process.State.READY)
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        if (listos.isEmpty()) {
            return List.of();
        }
        // Paso a paso: el usuario eligio un proceso y quiere ver solo ese.
        if (chosenProcessId != null) {
            for (Process pr : listos) {
                if (pr.id() == chosenProcessId) return List.of(pr);
            }
        }

        if (policy == SchedulingPolicy.ROUND_ROBIN) {
            // Turnos parejos: se empieza por el siguiente al ultimo que arranco.
            int n = processes.size();
            List<Process> orden = new ArrayList<>();
            for (int k = 1; k <= n; k++) {
                Process cand = processes.get((rrCursor + k) % n);
                if (cand.state() == Process.State.READY) orden.add(cand);
            }
            rrCursor = processes.indexOf(orden.get(0));
            return orden;
        }

        java.util.Collections.shuffle(listos, random);
        List<Process> turno = new ArrayList<>();
        for (Process pr : listos) {
            if (random.nextInt(100) < PROB_AVANCE) turno.add(pr);
        }
        if (turno.isEmpty()) {
            turno.add(listos.get(0));   // el shuffle ya lo eligio al azar
        }
        return turno;
    }

    private List<LogEntry> tail(int fromIndex) {
        return new ArrayList<>(log.subList(fromIndex, log.size()));
    }

    // ================================================================= ejecucion de un proceso

    private void advance(Process p) {
        int guard = 0;
        while (true) {
            if (++guard > STRUCTURAL_CAP) {
                event(p, "SPIN", "", p.name() + ": espera activa (bucle sin avanzar)");
                return;
            }
            Activation act = p.current();
            if (act == null) {
                p.setState(Process.State.TERMINATED);
                return;
            }
            if (act.needsLock()) {
                reacquireMonitor(p, act);
                return;
            }
            if (act.pending().isEmpty()) {
                finalizeActivation(p, act);
                return;
            }
            Stmt s = act.pending().pollFirst();
            act.setCurrentLine(s.line());
            boolean consumed = executeStmt(p, act, s);
            if (consumed || p.state() != Process.State.RUNNING) {
                return;
            }
        }
    }

    private void reacquireMonitor(Process p, Activation act) {
        Monitor m = monitors.get(act.monitorName());
        if (m.isFree()) {
            m.setLockOwner(p);
            act.setNeedsLock(false);
            event(p, "REENTER", m.name(), p.name() + ": reingresa a " + m.name());
        } else {
            m.entryQueue().addLast(p);
            p.block(Process.BlockReason.MONITOR_ENTRY, m.name());
            event(p, "BLOCKED", m.name(), p.name() + ": espera para reingresar a " + m.name());
        }
    }

    private void finalizeActivation(Process p, Activation act) {
        p.pop();
        if (act.isProcedure()) {
            Monitor m = monitors.get(act.monitorName());
            for (Map.Entry<String, LValue> e : act.outBindings().entrySet()) {
                writeLValue(p, e.getValue(), act.locals().get(e.getKey()));
            }
            m.setLockOwner(null);
            wakeEntryQueue(m);
            event(p, "RETURN", m.name(),
                    p.name() + ": retorna de " + m.name() + "." + act.procedureName()
                            + ", libera el monitor");
        }
        if (p.callStack().isEmpty()) {
            p.setState(Process.State.TERMINATED);
            event(p, "TERMINATED", "", p.name() + ": termina");
        }
    }

    private void wakeEntryQueue(Monitor m) {
        while (!m.entryQueue().isEmpty()) {
            Process w = m.entryQueue().pollFirst();
            w.unblock();
        }
    }

    /** @return true si la sentencia consumio el instante (accion observable); false si es estructural. */
    private boolean executeStmt(Process p, Activation act, Stmt s) {
        return switch (s) {
            case Stmt.Block b -> {
                act.pushFront(b.statements());
                yield false;
            }
            case Stmt.IfStmt iff -> {
                boolean cond = evaluator(p, act).evalBool(iff.condition());
                act.pushFront((cond ? iff.thenBranch() : iff.elseBranch() == null
                        ? new Stmt.Block(List.of(), s.line()) : iff.elseBranch()).statements());
                yield false;
            }
            case Stmt.WhileStmt w -> {
                if (evaluator(p, act).evalBool(w.condition())) {
                    act.pushFront(w);
                    act.pushFront(w.body().statements());
                }
                yield false;
            }
            case Stmt.ForStmt f -> {
                if (f.init() instanceof VarDecl vd) {
                    Value v = vd.initExpr() == null
                            ? Value.defaultFor(vd.type())
                            : evaluator(p, act).eval(vd.initExpr()).coerceTo(vd.type());
                    act.locals().put(vd.name(), v);
                } else {
                    Stmt.Assign asg = (Stmt.Assign) f.init();
                    assignScalar(p, act, asg.target(),
                            evaluator(p, act).eval(asg.value()), asg.line());
                }
                List<Stmt> loopBody = new ArrayList<>(f.body().statements());
                loopBody.add(f.step());
                act.pushFront(new Stmt.WhileStmt(f.condition(),
                        new Stmt.Block(loopBody, f.line()), f.line()));
                yield false;
            }
            case Stmt.Skip ignored -> {
                event(p, "SKIP", "", p.name() + ": skip");
                yield true;
            }
            case VarDecl vd -> {
                execLocalDecl(p, act, vd);
                yield true;
            }
            case Stmt.Assign a -> {
                execAssign(p, act, a);
                yield true;
            }
            case Stmt.IncDec inc -> {
                execIncDec(p, act, inc);
                yield true;
            }
            case Stmt.MonitorCall call -> execMonitorCall(p, act, call);
            case Stmt.CondOp co -> {
                execCondOp(p, act, co);
                yield true;
            }
            case Stmt.Write w -> {
                execWrite(p, act, w);
                yield true;
            }
            case Stmt.QueuePush qp -> {
                execQueuePush(p, act, qp);
                yield true;
            }
            case Stmt.QueuePop qp -> {
                execQueuePop(p, act, qp);
                yield true;
            }
        };
    }

    // ---------------------------------------------------------------- sentencias leaf

    private void execLocalDecl(Process p, Activation act, VarDecl vd) {
        ExprEvaluator ev = evaluator(p, act);
        Value v;
        if (vd.type().isQueue()) {
            v = Value.defaultFor(vd.type());
        } else if (vd.isArray()) {
            int size = ev.evalInt(vd.sizeExpr());
            Value fill = vd.initExpr() == null ? Value.defaultFor(vd.type())
                    : ev.eval(vd.initExpr()).coerceTo(vd.type());
            Value[] elems = new Value[size];
            for (int i = 0; i < size; i++) elems[i] = fill;
            v = new Value.ArrayVal(vd.type(), elems);
        } else {
            v = vd.initExpr() == null ? Value.defaultFor(vd.type())
                    : ev.eval(vd.initExpr()).coerceTo(vd.type());
        }
        act.locals().put(vd.name(), v);
        event(p, "DECL", vd.name(), p.name() + ": " + vd.type().name().toLowerCase()
                + " " + vd.name() + " = " + v.display());
    }

    private void execAssign(Process p, Activation act, Stmt.Assign a) {
        ExprEvaluator ev = evaluator(p, act);
        Value value = ev.eval(a.value());
        if (a.index() == null) {
            assignScalar(p, act, a.target(), value, a.line());
            event(p, "ASSIGN", a.target(), p.name() + ": " + a.target() + " = " + value.display());
        } else {
            int idx = ev.evalInt(a.index());
            Value.ArrayVal arr = asArray(p, act, a.target(), a.line());
            checkIndex(arr, idx, a.target(), a.line());
            arr.set(idx, value.coerceTo(arr.elementType()));
            touchIfMonitorVar(p, act, a.target());
            event(p, "ASSIGN", a.target(),
                    p.name() + ": " + a.target() + "[" + idx + "] = " + value.display());
        }
    }

    private void execIncDec(Process p, Activation act, Stmt.IncDec inc) {
        ExprEvaluator ev = evaluator(p, act);
        if (inc.index() == null) {
            Value cur = readName(p, act, inc.target(), inc.line());
            Value next = new Value.IntVal(cur.asLong() + (inc.increment() ? 1 : -1));
            assignScalar(p, act, inc.target(), next, inc.line());
            event(p, "ASSIGN", inc.target(),
                    p.name() + ": " + inc.target() + (inc.increment() ? "++" : "--")
                            + " => " + next.display());
        } else {
            int idx = ev.evalInt(inc.index());
            Value.ArrayVal arr = asArray(p, act, inc.target(), inc.line());
            checkIndex(arr, idx, inc.target(), inc.line());
            long nv = arr.get(idx).asLong() + (inc.increment() ? 1 : -1);
            arr.set(idx, new Value.IntVal(nv));
            touchIfMonitorVar(p, act, inc.target());
            event(p, "ASSIGN", inc.target(),
                    p.name() + ": " + inc.target() + "[" + idx + "]"
                            + (inc.increment() ? "++" : "--") + " => " + nv);
        }
    }

    private boolean execMonitorCall(Process p, Activation callerAct, Stmt.MonitorCall call) {
        Monitor m = monitors.get(call.monitor());
        MonitorDef md = monitorDefs.get(call.monitor());
        ProcedureDef pd = md.procedure(call.procedure());

        if (!m.isFree() && m.lockOwner() != p) {
            m.entryQueue().addLast(p);
            p.block(Process.BlockReason.MONITOR_ENTRY, m.name());
            callerAct.pushFront(call);
            event(p, "BLOCKED", m.name(),
                    p.name() + ": espera para entrar a " + m.name() + "." + call.procedure());
            return true;
        }
        if (m.lockOwner() == p) {
            throw new RuntimeError("Llamada reentrante al monitor '" + m.name()
                    + "': el proceso ya esta dentro (deadlock)", call.line());
        }

        ExprEvaluator ev = evaluator(p, callerAct);
        List<Value> argValues = new ArrayList<>();
        for (Expr arg : call.args()) argValues.add(ev.eval(arg));

        m.setLockOwner(p);
        Activation newAct = new Activation(m.name(), pd.name());
        for (int i = 0; i < pd.params().size(); i++) {
            Param param = pd.params().get(i);
            Expr argExpr = call.args().get(i);
            if (param.isInput()) {
                newAct.locals().put(param.name(), argValues.get(i).coerceTo(param.type()));
            } else {
                newAct.locals().put(param.name(), Value.defaultFor(param.type()));
            }
            if (param.isOutput()) {
                String targetName;
                Integer idx = null;
                if (argExpr instanceof Expr.VarRef vr) {
                    targetName = vr.name();
                } else {
                    Expr.ArrayAccess aa = (Expr.ArrayAccess) argExpr;
                    targetName = aa.name();
                    idx = ev.evalInt(aa.index());
                }
                newAct.outBindings().put(param.name(), new LValue(callerAct, targetName, idx));
            }
        }
        newAct.pushFront(pd.body().statements());
        p.push(newAct);
        event(p, "ENTER", m.name(), p.name() + ": entra a " + m.name() + "." + pd.name());
        return true;
    }

    private void execCondOp(Process p, Activation act, Stmt.CondOp co) {
        Monitor m = monitors.get(act.monitorName());
        String key = co.cond();
        if (co.index() != null) {
            key = co.cond() + "[" + evaluator(p, act).evalInt(co.index()) + "]";
        }
        ConditionVariable cv = m.conds().get(key);
        if (cv == null) {
            throw new RuntimeError("Variable condicion no declarada: " + key, co.line());
        }
        switch (co.kind()) {
            case WAIT -> {
                m.setLockOwner(null);
                wakeEntryQueue(m);
                cv.enqueue(p);
                p.block(Process.BlockReason.COND_WAIT, m.name() + "." + key);
                act.setNeedsLock(true);
                event(p, "WAIT", m.name() + "." + key,
                        p.name() + ": wait(" + key + ") - libera el monitor y se demora");
            }
            case SIGNAL -> {
                if (cv.isEmpty()) {
                    event(p, "SIGNAL", m.name() + "." + key,
                            p.name() + ": signal(" + key + ") - sin efecto (cola vacia)");
                } else {
                    Process w = cv.dequeue();
                    m.entryQueue().addLast(w);
                    w.block(Process.BlockReason.MONITOR_ENTRY, m.name());
                    event(p, "SIGNAL", m.name() + "." + key,
                            p.name() + ": signal(" + key + ") - despierta a " + w.name()
                                    + " (compite por el monitor)");
                }
            }
            case SIGNAL_ALL -> {
                List<Process> all = cv.drain();
                for (Process w : all) {
                    m.entryQueue().addLast(w);
                    w.block(Process.BlockReason.MONITOR_ENTRY, m.name());
                }
                event(p, "SIGNAL_ALL", m.name() + "." + key,
                        p.name() + ": signal_all(" + key + ") - despierta a " + all.size()
                                + " proceso(s)");
            }
        }
    }

    /** Concatena los argumentos y deja una linea en la pantalla de salida. */
    private void execWrite(Process p, Activation act, Stmt.Write w) {
        ExprEvaluator ev = evaluator(p, act);
        StringBuilder sb = new StringBuilder();
        for (Expr e : w.args()) sb.append(ev.eval(e).display());
        String texto = sb.toString();
        if (salida.size() < TOPE_SALIDA) {
            salida.add(new Snapshot.OutputLine(instant, p.name(), p.color(), texto));
        } else if (salida.size() == TOPE_SALIDA) {
            salida.add(new Snapshot.OutputLine(instant, p.name(), p.color(),
                    "... salida truncada en " + TOPE_SALIDA + " lineas"));
        }
        event(p, "WRITE", "", p.name() + ": write(" + texto + ")");
    }

    private void execQueuePush(Process p, Activation act, Stmt.QueuePush qp) {
        ExprEvaluator ev = evaluator(p, act);
        Value.QueueVal q = asQueue(p, act, qp.queue(), qp.line());
        List<Value> vals = new ArrayList<>();
        for (Expr e : qp.elements()) vals.add(ev.eval(e));
        Value pushed = vals.size() == 1
                ? vals.get(0)
                : new Value.ArrayVal(Type.INT, vals.toArray(new Value[0]));
        q.push(pushed);
        touchIfMonitorVar(p, act, qp.queue());
        event(p, "PUSH", qp.queue(),
                p.name() + ": push(" + qp.queue() + ", " + pushed.display() + ")");
    }

    private void execQueuePop(Process p, Activation act, Stmt.QueuePop qp) {
        Value.QueueVal q = asQueue(p, act, qp.queue(), qp.line());
        if (q.isEmpty()) {
            throw new RuntimeError("pop sobre la cola vacia '" + qp.queue() + "'", qp.line());
        }
        Value v = q.pop();
        touchIfMonitorVar(p, act, qp.queue());
        if (qp.targets().size() == 1) {
            assignScalar(p, act, qp.targets().get(0), v, qp.line());
        } else {
            if (!(v instanceof Value.ArrayVal tuple) || tuple.size() < qp.targets().size()) {
                throw new RuntimeError("El elemento desencolado no tiene suficientes componentes "
                        + "para el pop multiple", qp.line());
            }
            for (int i = 0; i < qp.targets().size(); i++) {
                assignScalar(p, act, qp.targets().get(i), tuple.get(i), qp.line());
            }
        }
        event(p, "POP", qp.queue(),
                p.name() + ": pop(" + qp.queue() + ") => " + v.display());
    }

    // ---------------------------------------------------------------- scope / lvalues

    private ExprEvaluator evaluator(Process p, Activation act) {
        return new ExprEvaluator(scopeOf(p, act));
    }

    private Function<String, Value> scopeOf(Process p, Activation act) {
        return name -> {
            if (act.locals().containsKey(name)) return act.locals().get(name);
            if (act.isProcedure()) {
                Monitor m = monitors.get(act.monitorName());
                if (m.hasVar(name)) return m.getVar(name);
            }
            return null;
        };
    }

    private Value readName(Process p, Activation act, String name, int line) {
        Value v = scopeOf(p, act).apply(name);
        if (v == null) throw new RuntimeError("Variable no definida: " + name, line);
        return v;
    }

    private void assignScalar(Process p, Activation act, String name, Value value, int line) {
        if (act.locals().containsKey(name)) {
            act.locals().put(name, coerceLike(act.locals().get(name), value));
            return;
        }
        if (act.isProcedure()) {
            Monitor m = monitors.get(act.monitorName());
            if (m.hasVar(name)) {
                m.setVar(name, coerceLike(m.getVar(name), value), p.id());
                return;
            }
        }
        throw new RuntimeError("Variable no definida: " + name, line);
    }

    private void writeLValue(Process p, LValue lv, Value value) {
        Activation act = lv.callerActivation();
        if (lv.index() == null) {
            assignScalar(p, act, lv.name(), value, -1);
        } else {
            Value.ArrayVal arr = asArray(p, act, lv.name(), -1);
            checkIndex(arr, lv.index(), lv.name(), -1);
            arr.set(lv.index(), value.coerceTo(arr.elementType()));
            touchIfMonitorVar(p, act, lv.name());
        }
    }

    private Value.ArrayVal asArray(Process p, Activation act, String name, int line) {
        Value v = readName(p, act, name, line);
        if (v instanceof Value.ArrayVal arr) return arr;
        throw new RuntimeError("'" + name + "' no es un arreglo", line);
    }

    private Value.QueueVal asQueue(Process p, Activation act, String name, int line) {
        Value v = readName(p, act, name, line);
        if (v instanceof Value.QueueVal q) return q;
        throw new RuntimeError("'" + name + "' no es una cola", line);
    }

    private static void checkIndex(Value.ArrayVal arr, int idx, String name, int line) {
        if (idx < 0 || idx >= arr.size()) {
            throw new RuntimeError("Indice " + idx + " fuera de rango para '" + name
                    + "' (tamano " + arr.size() + ")", line);
        }
    }

    private void touchIfMonitorVar(Process p, Activation act, String name) {
        if (act.isProcedure()) {
            Monitor m = monitors.get(act.monitorName());
            if (m.hasVar(name)) {
                m.setVar(name, m.getVar(name), p.id());
            }
        }
    }

    private static Value coerceLike(Value prev, Value value) {
        return switch (prev) {
            case Value.IntVal ignored -> value.coerceTo(Type.INT);
            case Value.DoubleVal ignored -> value.coerceTo(Type.DOUBLE);
            case Value.BoolVal ignored -> value.coerceTo(Type.BOOLEAN);
            case Value.TextVal ignored -> value.coerceTo(Type.TEXT);
            default -> value;
        };
    }

    // ================================================================= estado / snapshots

    public boolean isFinished() {
        return processes.stream().allMatch(Process::isFinished);
    }

    public boolean isDeadlocked() {
        return !isFinished()
                && processes.stream().noneMatch(pr -> pr.state() == Process.State.READY);
    }

    public int instant() {
        return instant;
    }

    public List<LogEntry> allLogs() {
        return List.copyOf(log);
    }

    /** Evento sintetico con el estado inicial (instante 0), para que el frontend arranque. */
    public LogEntry initialEntry() {
        return new LogEntry(UUID.randomUUID().toString(), 0, null, null, "INIT", "",
                "Programa compilado - " + processes.size() + " proceso(s), "
                        + monitors.size() + " monitor(es)", snapshot());
    }

    public Snapshot snapshot() {
        List<Snapshot.ProcessView> pv = new ArrayList<>();
        for (Process p : processes) {
            Activation act = p.current();
            List<Snapshot.VarView> locals = new ArrayList<>();
            if (act != null) {
                for (Map.Entry<String, Value> e : act.locals().entrySet()) {
                    locals.add(varView(e.getKey(), e.getValue(), null));
                }
            }
            pv.add(new Snapshot.ProcessView(
                    p.id(), p.name(), p.color(),
                    p.state().name(),
                    p.blockReason() == null ? null : p.blockReason().name(),
                    p.blockedOn(),
                    p.currentLocation(),
                    p.currentLine(),
                    locals,
                    p.errorMessage()));
        }

        List<Snapshot.MonitorView> mv = new ArrayList<>();
        for (Monitor m : monitors.values()) {
            List<Snapshot.VarView> vars = new ArrayList<>();
            for (Map.Entry<String, Value> e : m.vars().entrySet()) {
                vars.add(varView(e.getKey(), e.getValue(), m.lastWriter(e.getKey())));
            }
            List<Snapshot.CondView> conds = new ArrayList<>();
            for (ConditionVariable cv : m.conds().values()) {
                conds.add(new Snapshot.CondView(cv.name(), refs(cv.waiting())));
            }
            mv.add(new Snapshot.MonitorView(
                    m.name(), vars, conds,
                    m.lockOwner() == null || m.lockOwner().id() < 0 ? null : ref(m.lockOwner()),
                    refs(m.entryQueueSnapshot())));
        }

        return new Snapshot(instant, pv, mv, List.copyOf(salida));
    }

    private static Snapshot.VarView varView(String name, Value v, Integer writer) {
        boolean isArray = v instanceof Value.ArrayVal;
        return new Snapshot.VarView(name, typeName(v), v.display(), isArray, writer);
    }

    private static String typeName(Value v) {
        return switch (v) {
            case Value.IntVal ignored -> "int";
            case Value.DoubleVal ignored -> "double";
            case Value.BoolVal ignored -> "boolean";
            case Value.TextVal ignored -> "text";
            case Value.QueueVal q -> q.isOrdenada() ? "ColaOrdenada" : "Cola";
            case Value.ArrayVal a -> a.elementType().name().toLowerCase() + "[]";
        };
    }

    private static Snapshot.ProcRef ref(Process p) {
        return new Snapshot.ProcRef(p.id(), p.name(), p.color());
    }

    private static List<Snapshot.ProcRef> refs(List<Process> ps) {
        List<Snapshot.ProcRef> out = new ArrayList<>();
        for (Process p : ps) out.add(ref(p));
        return out;
    }

    // ================================================================= logging

    private void event(Process p, String kind, String resource, String message) {
        if (!logging) return;
        log.add(new LogEntry(UUID.randomUUID().toString(), instant, p.id() < 0 ? null : p.id(),
                p.id() < 0 ? null : p.color(), kind, resource, message, snapshot()));
    }

    private void systemLog(String kind, String message) {
        log.add(new LogEntry(UUID.randomUUID().toString(), instant, null, null, kind, "", message,
                snapshot()));
    }
}
