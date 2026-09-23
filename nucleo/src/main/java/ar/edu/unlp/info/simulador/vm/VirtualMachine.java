package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.lang.parser.ast.*;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Maquina virtual del simulador de monitores. Ejecuta un {@link Program} por instantes: en
 * cada instante avanzan uno o varios procesos, una sentencia observable cada uno (ver
 * {@link #step}). Implementa la exclusion mutua implicita de los monitores y la disciplina
 * <em>signal and continue</em>.
 */
public final class VirtualMachine {

    private static final String[] PALETTE = {
            "#ef4444", "#3b82f6", "#10b981", "#f59e0b",
            "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
            "#84cc16", "#a855f7", "#14b8a6", "#eab308"
    };

    /** Probabilidad (en %) de que un proceso listo avance en un instante dado. */
    private static final int PROB_AVANCE = 80;

    /** Tope de lineas de salida guardadas (las ultimas): un bucle largo no puede comerse la memoria. */
    private static final int TOPE_SALIDA = 500;

    /** Tope de iteraciones estructurales (bloques anidados) por instante, corta busy-waits. */
    private static final int STRUCTURAL_CAP = 4000;

    /**
     * Topes de tamano. Sin ellos, {@code int a[2000000000]} o una familia de cien mil procesos
     * congelan o cierran la pestana: el motor corre en el hilo principal del navegador.
     */
    static final int TOPE_ELEMENTOS = 100_000;
    static final int TOPE_PROCESOS = 5_000;

    /** Pasos que puede dar el codigo de inicializacion de un monitor antes de darlo por colgado. */
    static final int TOPE_INICIALIZACION = 100_000;

    /**
     * Tope de eventos guardados en el log. Los eventos no llevan el estado completo (se pide
     * aparte con {@link #snapshot()}), pero igual un programa que no termina los acumularia
     * sin fin: se conservan solo los ultimos.
     */
    static final int TOPE_LOG = 2000;

    private final Program program;
    private final Azar random;

    private final List<Process> processes = new ArrayList<>();
    private final Deque<Snapshot.OutputLine> salida = new ArrayDeque<>();
    /** Lineas de salida descartadas por el tope: se avisa al principio de la salida. */
    private int salidaDescartada = 0;
    private final Map<String, Monitor> monitors = new LinkedHashMap<>();
    private final Map<String, MonitorDef> monitorDefs = new LinkedHashMap<>();

    private final Deque<LogEntry> log = new ArrayDeque<>();
    /** Eventos del instante en curso: lo que devuelve {@link #step}. */
    private List<LogEntry> stepEntries = new ArrayList<>();
    private int nextEventId = 0;

    private int instant = 0;
    /** Procesos que avanzaron en el ultimo instante: la UI los marca como "ejecutando". */
    private final java.util.Set<Integer> advancedLastStep = new java.util.HashSet<>();
    private int rrCursor = -1;
    private boolean logging = true;
    private boolean deadlockLogged = false;

    public VirtualMachine(Program program, long seed) {
        this.program = program;
        this.random = new Azar(seed);
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
                    int size = arraySize(ev, cd.sizeExpr(), cd.line());
                    m.condArraySizes().put(cd.name(), size);
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
            while (!sys.isFinished()) {
                if (guard++ >= TOPE_INICIALIZACION) {
                    throw new RuntimeError("La inicialización del monitor " + md.name()
                            + " no terminó después de " + TOPE_INICIALIZACION
                            + " pasos: revisá si tiene un ciclo infinito", sys.currentLine());
                }
                advance(sys);
            }
            m.setLockOwner(null);
        }
        logging = true;

        int colorIdx = 0;
        for (ProcessDef pd : program.processes()) {
            if (pd.isFamily()) {
                ExprEvaluator ev = new ExprEvaluator(name -> null);
                long from = ev.evalLong(pd.quant().from());
                long to = ev.evalLong(pd.quant().to());
                // con cotas enormes to - from desborda: un conteo negativo tambien es "demasiados"
                long count = to < from ? 0 : to - from + 1;
                if (count < 0 || count > TOPE_PROCESOS - processes.size()) {
                    throw tooManyProcesses(pd.line());
                }
                for (long k = 0; k < count; k++) {
                    long i = from + k;
                    Process p = new Process(processes.size() + 1, pd.name() + "[" + i + "]",
                            PALETTE[colorIdx++ % PALETTE.length]);
                    Activation frame = Activation.processFrame();
                    frame.locals().put(pd.quant().iterator(), new Value.IntVal(i));
                    frame.pushFront(pd.body().statements());
                    p.push(frame);
                    processes.add(p);
                }
            } else {
                if (processes.size() >= TOPE_PROCESOS) throw tooManyProcesses(pd.line());
                Process p = new Process(processes.size() + 1, pd.name(),
                        PALETTE[colorIdx++ % PALETTE.length]);
                Activation frame = Activation.processFrame();
                frame.pushFront(pd.body().statements());
                p.push(frame);
                processes.add(p);
            }
        }
    }

    private static RuntimeError tooManyProcesses(int line) {
        return new RuntimeError("Demasiados procesos: el simulador admite hasta "
                + TOPE_PROCESOS + " en total", line);
    }

    /** Tamano de un arreglo de variables o de cond: entre 0 y {@link #TOPE_ELEMENTOS}. */
    private static int arraySize(ExprEvaluator ev, Expr sizeExpr, int line) {
        long size = ev.evalLong(sizeExpr);
        if (size < 0 || size > TOPE_ELEMENTOS) {
            throw new RuntimeError("Tamaño de arreglo inválido: " + size
                    + " (tiene que estar entre 0 y " + TOPE_ELEMENTOS + ")", line);
        }
        return (int) size;
    }

    private Value buildInitialValue(VarDecl vd, ExprEvaluator ev) {
        if (vd.type().isQueue()) {
            return Value.defaultFor(vd.type());
        }
        if (vd.isArray()) {
            int size = arraySize(ev, vd.sizeExpr(), vd.line());
            Value fill = vd.initExpr() == null
                    ? Value.defaultFor(vd.type())
                    : ev.eval(vd.initExpr()).assignTo(vd.type(), vd.name(), vd.line());
            Value[] elems = new Value[size];
            for (int i = 0; i < size; i++) elems[i] = fill;
            return new Value.ArrayVal(vd.type(), elems);
        }
        return vd.initExpr() == null
                ? Value.defaultFor(vd.type())
                : ev.eval(vd.initExpr()).assignTo(vd.type(), vd.name(), vd.line());
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
        stepEntries = new ArrayList<>();

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
            return stepEntries;
        }

        instant++;
        advancedLastStep.clear();
        for (Process p : turno) {
            // Entre que se armo el turno y le toca, otro pudo haberlo bloqueado tomando el
            // monitor que este queria: solo avanza si sigue listo.
            if (p.state() != Process.State.READY) {
                continue;
            }
            p.setState(Process.State.RUNNING);
            advancedLastStep.add(p.id());
            try {
                advance(p);
            } catch (RuntimeError re) {
                failProcess(p, re.getMessage());
            } catch (Throwable t) {
                // Un error que no es del alumno (un bug del simulador, o memoria/pila agotada)
                // igual termina solo ese proceso: si quedara RUNNING, el instante siguiente lo
                // tomaria por un interbloqueo que el programa no tiene.
                failProcess(p, "error interno del simulador");
            }
            if (p.state() == Process.State.RUNNING) {
                p.setState(Process.State.READY);
            }
        }
        if (isDeadlocked() && !deadlockLogged) {
            deadlockLogged = true;
            systemLog("DEADLOCK", "Interbloqueo: ningun proceso puede avanzar");
        }
        return stepEntries;
    }

    /** Termina el proceso con error, suelta sus monitores y lo registra en el log. */
    private void failProcess(Process p, String message) {
        p.fail(message);
        List<Monitor> released = releaseMonitorsOf(p);
        event(p, "ERROR", "", p.name() + ": error de ejecucion - " + message);
        for (Monitor m : released) {
            event(p, "RELEASE", m.name(),
                    p.name() + ": libera " + m.name() + " al terminar con error");
        }
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

        random.mezclar(listos);
        List<Process> turno = new ArrayList<>();
        for (Process pr : listos) {
            if (random.nextInt(100) < PROB_AVANCE) turno.add(pr);
        }
        if (turno.isEmpty()) {
            turno.add(listos.get(0));   // el shuffle ya lo eligio al azar
        }
        return turno;
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

    /**
     * Toma el monitor de la activacion o espera en su cola de entrada. Sirve para las tres
     * situaciones en que un proceso compite por un monitor: la primera entrada a un
     * procedure, la vuelta de un wait y la vuelta de una llamada abierta a otro monitor.
     */
    private void reacquireMonitor(Process p, Activation act) {
        Monitor m = monitors.get(act.monitorName());
        String destino = act.isEntering() ? m.name() + "." + act.procedureName() : m.name();
        if (!m.isFree()) {
            m.entryQueue().addLast(p);
            p.block(Process.BlockReason.MONITOR_ENTRY, m.name());
            event(p, "BLOCKED", m.name(), p.name() + ": espera para "
                    + (act.isEntering() ? "entrar a " : "reingresar a ") + destino);
            return;
        }
        m.setLockOwner(p);
        act.setNeedsLock(false);
        if (act.isEntering()) {
            act.setEntering(false);
            event(p, "ENTER", m.name(), p.name() + ": entra a " + destino);
        } else {
            event(p, "REENTER", m.name(), p.name() + ": reingresa a " + destino);
        }
        // Los out de una llamada abierta que apuntan a este monitor se escriben ahora, con
        // el monitor otra vez tomado.
        for (Map.Entry<LValue, Value> w : act.takeDeferredWrites()) {
            writeLValue(p, w.getKey(), w.getValue());
        }
    }

    private void finalizeActivation(Process p, Activation act) {
        p.pop();
        if (act.isProcedure()) {
            Monitor m = monitors.get(act.monitorName());
            Activation caller = p.current();
            for (Map.Entry<String, LValue> e : act.outBindings().entrySet()) {
                Value value = act.locals().get(e.getKey());
                if (caller != null && caller.isProcedure()) {
                    // el llamador solto su monitor (llamada abierta): escribe al reingresar
                    caller.deferWrite(e.getValue(), value);
                } else {
                    writeLValue(p, e.getValue(), value);
                }
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

    /**
     * Suelta todo monitor tomado por un proceso que termino con error y despierta su cola
     * de entrada. Sin esto el lock queda en manos de un proceso muerto y los demas se
     * bloquean para siempre: la UI mostraria un DEADLOCK que el programa del alumno no tiene.
     *
     * @return los monitores liberados, en orden de declaracion
     */
    private List<Monitor> releaseMonitorsOf(Process p) {
        List<Monitor> released = new ArrayList<>();
        for (Monitor m : monitors.values()) {
            if (m.lockOwner() == p) {
                m.setLockOwner(null);
                wakeEntryQueue(m);
                released.add(m);
            }
        }
        return released;
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
                            : evaluator(p, act).eval(vd.initExpr())
                                    .assignTo(vd.type(), vd.name(), vd.line());
                    act.locals().put(vd.name(), v);
                } else {
                    Stmt.Assign asg = (Stmt.Assign) f.init();
                    assignScalar(p, act, asg.target(),
                            evaluator(p, act).eval(asg.value()), asg.line());
                }
                if (f.limit() != null) {
                    // la cota del rango se fija al entrar: cambiarla adentro no cambia las vueltas
                    act.locals().put(f.limit().name(), evaluator(p, act).eval(f.limit().initExpr()));
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
            int size = arraySize(ev, vd.sizeExpr(), vd.line());
            Value fill = vd.initExpr() == null ? Value.defaultFor(vd.type())
                    : ev.eval(vd.initExpr()).assignTo(vd.type(), vd.name(), vd.line());
            Value[] elems = new Value[size];
            for (int i = 0; i < size; i++) elems[i] = fill;
            v = new Value.ArrayVal(vd.type(), elems);
        } else {
            v = vd.initExpr() == null ? Value.defaultFor(vd.type())
                    : ev.eval(vd.initExpr()).assignTo(vd.type(), vd.name(), vd.line());
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
            long index = ev.evalLong(a.index());
            Value.ArrayVal arr = asArray(p, act, a.target(), a.line());
            int idx = checkIndex(arr, index, a.target(), a.line());
            arr.set(idx, value.assignTo(arr.elementType(), a.target() + "[" + idx + "]", a.line()));
            touchIfMonitorVar(p, act, a.target());
            event(p, "ASSIGN", a.target(),
                    p.name() + ": " + a.target() + "[" + idx + "] = " + value.display());
        }
    }

    private void execIncDec(Process p, Activation act, Stmt.IncDec inc) {
        ExprEvaluator ev = evaluator(p, act);
        if (inc.index() == null) {
            Value cur = readName(p, act, inc.target(), inc.line());
            Value next = stepped(cur, inc.increment(), inc.line());
            assignScalar(p, act, inc.target(), next, inc.line());
            event(p, "ASSIGN", inc.target(),
                    p.name() + ": " + inc.target() + (inc.increment() ? "++" : "--")
                            + " => " + next.display());
        } else {
            long index = ev.evalLong(inc.index());
            Value.ArrayVal arr = asArray(p, act, inc.target(), inc.line());
            int idx = checkIndex(arr, index, inc.target(), inc.line());
            Value next = stepped(arr.get(idx), inc.increment(), inc.line());
            arr.set(idx, next);
            touchIfMonitorVar(p, act, inc.target());
            event(p, "ASSIGN", inc.target(),
                    p.name() + ": " + inc.target() + "[" + idx + "]"
                            + (inc.increment() ? "++" : "--") + " => " + next.display());
        }
    }

    /** {@code ++}/{@code --} conservan el tipo: un double suma 1.0 y un int no desborda en silencio. */
    private static Value stepped(Value cur, boolean increment, int line) {
        int delta = increment ? 1 : -1;
        if (cur instanceof Value.DoubleVal) {
            return new Value.DoubleVal(cur.asDouble() + delta);
        }
        try {
            return new Value.IntVal(Math.addExact(cur.asLong(), delta));
        } catch (ArithmeticException e) {
            throw RuntimeError.overflow(line);
        }
    }

    /**
     * Llamada a un procedure. Los argumentos se evaluan una vez, al llamar. Si el llamador
     * esta dentro de otro monitor, lo suelta mientras dura la llamada y vuelve a competir por
     * el al retornar (llamada abierta, ADR 0004). Despues el proceso entra al monitor llamado
     * o espera en su cola de entrada.
     */
    private boolean execMonitorCall(Process p, Activation callerAct, Stmt.MonitorCall call) {
        Monitor m = monitors.get(call.monitor());
        MonitorDef md = monitorDefs.get(call.monitor());
        ProcedureDef pd = md.procedure(call.procedure());

        if (m.lockOwner() == p) {
            // El compilador rechaza la llamada directa y con llamadas abiertas no hay otra
            // forma de llegar aca: queda como control.
            throw new RuntimeError("Llamada al monitor '" + m.name()
                    + "' desde adentro del mismo monitor", call.line());
        }

        ExprEvaluator ev = evaluator(p, callerAct);
        List<Value> argValues = new ArrayList<>();
        for (Expr arg : call.args()) argValues.add(ev.eval(arg));

        Activation newAct = new Activation(m.name(), pd.name());
        for (int i = 0; i < pd.params().size(); i++) {
            Param param = pd.params().get(i);
            Expr argExpr = call.args().get(i);
            if (param.isInput()) {
                newAct.locals().put(param.name(),
                        argValues.get(i).assignTo(param.type(), param.name(), call.line()));
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
                    // ya se evaluo (y controlo el rango) como argumento: entra en un int
                    idx = (int) ev.evalLong(aa.index());
                }
                newAct.outBindings().put(param.name(), new LValue(callerAct, targetName, idx));
            }
        }
        newAct.pushFront(pd.body().statements());
        if (callerAct.isProcedure()) {
            Monitor caller = monitors.get(callerAct.monitorName());
            caller.setLockOwner(null);
            wakeEntryQueue(caller);
            callerAct.setNeedsLock(true);
            event(p, "RELEASE", caller.name(), p.name() + ": libera " + caller.name()
                    + " mientras llama a " + m.name() + "." + pd.name());
        }
        p.push(newAct);
        newAct.setNeedsLock(true);
        newAct.setEntering(true);
        reacquireMonitor(p, newAct);
        return true;
    }

    private void execCondOp(Process p, Activation act, Stmt.CondOp co) {
        Monitor m = monitors.get(act.monitorName());
        String key = co.cond();
        if (co.index() != null) {
            long index = evaluator(p, act).evalLong(co.index());
            int size = m.condArraySizes().getOrDefault(co.cond(), 0);
            if (index < 0 || index >= size) {
                throw new RuntimeError("Índice " + index + " fuera de rango para la cond '"
                        + co.cond() + "' (tamaño " + size + ")", co.line());
            }
            key = co.cond() + "[" + index + "]";
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
        salida.addLast(new Snapshot.OutputLine(instant, p.name(), p.color(), texto));
        // se conservan las ultimas: lo que el programa escribe ahora es lo que importa ver
        if (salida.size() > TOPE_SALIDA) {
            salida.removeFirst();
            salidaDescartada++;
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
            act.locals().put(name, coerceLike(act.locals().get(name), value, name, line));
            return;
        }
        if (act.isProcedure()) {
            Monitor m = monitors.get(act.monitorName());
            if (m.hasVar(name)) {
                m.setVar(name, coerceLike(m.getVar(name), value, name, line), p.id());
                return;
            }
        }
        throw new RuntimeError("Variable no definida: " + name, line);
    }

    private void writeLValue(Process p, LValue lv, Value value) {
        Activation act = lv.callerActivation();
        int line = act.currentLine();   // la de la llamada, que sigue siendo la sentencia actual
        if (lv.index() == null) {
            assignScalar(p, act, lv.name(), value, line);
        } else {
            Value.ArrayVal arr = asArray(p, act, lv.name(), line);
            checkIndex(arr, lv.index(), lv.name(), line);
            arr.set(lv.index(), value.assignTo(arr.elementType(), lv.name(), line));
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

    /** @return el indice como int, una vez controlado que esta dentro del arreglo */
    private static int checkIndex(Value.ArrayVal arr, long idx, String name, int line) {
        if (idx < 0 || idx >= arr.size()) {
            throw RuntimeError.indexOutOfRange(idx, name, arr.size(), line);
        }
        return (int) idx;
    }

    private void touchIfMonitorVar(Process p, Activation act, String name) {
        if (act.isProcedure()) {
            Monitor m = monitors.get(act.monitorName());
            if (m.hasVar(name)) {
                m.setVar(name, m.getVar(name), p.id());
            }
        }
    }

    /**
     * El valor a guardar en una variable que hoy vale {@code prev}: su tipo es el de la
     * declaracion. Un arreglo o una cola no se reemplazan enteros (el compilador ya lo
     * rechaza; esto cubre lo que llega en ejecucion).
     */
    private static Value coerceLike(Value prev, Value value, String name, int line) {
        return switch (prev) {
            case Value.IntVal ignored -> value.assignTo(Type.INT, name, line);
            case Value.DoubleVal ignored -> value.assignTo(Type.DOUBLE, name, line);
            case Value.BoolVal ignored -> value.assignTo(Type.BOOLEAN, name, line);
            case Value.TextVal ignored -> value.assignTo(Type.TEXT, name, line);
            case Value.ArrayVal ignored -> throw new RuntimeError("No se puede asignar el arreglo '"
                    + name + "' completo: hay que indicar el índice", line);
            case Value.QueueVal ignored -> throw new RuntimeError("No se puede asignar la cola '"
                    + name + "': se usa con push y pop", line);
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

    /** Los ultimos eventos de la ejecucion (a lo sumo {@link #TOPE_LOG}), del mas viejo al mas nuevo. */
    public List<LogEntry> allLogs() {
        return List.copyOf(log);
    }

    public Snapshot snapshot() {
        List<Snapshot.ProcessView> pv = new ArrayList<>();
        for (Process p : processes) {
            Activation act = p.current();
            List<Snapshot.VarView> locals = new ArrayList<>();
            if (act != null) {
                for (Map.Entry<String, Value> e : act.locals().entrySet()) {
                    // los nombres con '#' son internos (iterador de for (1..n), cota de rango)
                    if (e.getKey().indexOf('#') >= 0) continue;
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
                    p.errorMessage(),
                    advancedLastStep.contains(p.id())));
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

        return new Snapshot(instant, pv, mv, outputView());
    }

    /** La salida guardada, con un aviso adelante si el tope descarto lineas anteriores. */
    private List<Snapshot.OutputLine> outputView() {
        List<Snapshot.OutputLine> out = new ArrayList<>(salida.size() + 1);
        if (salidaDescartada > 0) {
            out.add(new Snapshot.OutputLine(salida.peekFirst().instant(), "", "#888888",
                    "… se descartaron " + salidaDescartada
                            + " líneas anteriores (se muestran las últimas " + TOPE_SALIDA + ")"));
        }
        out.addAll(salida);
        return out;
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

    // ================================================================= logging

    private void event(Process p, String kind, String resource, String message) {
        if (!logging) return;
        record(new LogEntry("e" + nextEventId++, instant, p.id() < 0 ? null : p.id(),
                p.id() < 0 ? null : p.color(), kind, resource, message));
    }

    private void systemLog(String kind, String message) {
        record(new LogEntry("e" + nextEventId++, instant, null, null, kind, "", message));
    }

    private void record(LogEntry e) {
        log.addLast(e);
        if (log.size() > TOPE_LOG) log.removeFirst();
        stepEntries.add(e);
    }
}
