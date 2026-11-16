package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.lang.parser.ast.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Maquina virtual del simulador de monitores. Ejecuta un {@link Program} por instantes: en
 * cada instante avanzan uno o varios procesos, una sentencia observable cada uno (ver
 * {@link #step}). Implementa la exclusion mutua implicita de los monitores y la disciplina
 * <em>signal and continue</em>.
 */
public final class VirtualMachine {

    /** Probabilidad (en %) de que un proceso listo avance en un instante dado. */
    private static final int PROB_AVANCE = 80;

    /** Tope de iteraciones estructurales (bloques anidados) por instante, corta busy-waits. */
    private static final int STRUCTURAL_CAP = 4000;

    /** Segundos maximos de un delay: una hora alcanza para cualquier ejercicio. */
    static final int TOPE_DELAY = 3600;

    /** Pasos que puede dar el codigo de inicializacion de un monitor antes de darlo por colgado. */
    static final int TOPE_INICIALIZACION = 100_000;

    private final Program program;
    private final Azar random;

    private final List<Process> processes = new ArrayList<>();
    private final OutputBuffer salida = new OutputBuffer();
    private final Map<String, Monitor> monitors = new LinkedHashMap<>();
    private final VariableAccess vars = new VariableAccess(monitors);
    private final Map<String, MonitorDef> monitorDefs = new LinkedHashMap<>();

    private final EventLog events = new EventLog();

    private int instant = 0;
    /**
     * Ids de los procesos que avanzaron en el ultimo instante, en el orden en que les toco el
     * turno: la UI los marca como "ejecutando" y los ordena asi en la linea de tiempo.
     */
    private final List<Integer> advancedLastStep = new ArrayList<>();
    private int rrCursor = -1;
    /**
     * Reloj de la simulacion, en ms. No lo lee la VM (el nucleo es determinista): lo informa
     * quien llama a {@link #step(Integer, SchedulingPolicy, long)}, y solo lo usa delay.
     */
    private long clockMs = 0;
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
            for (Monitor m : ProgramLoader.buildMonitors(md)) monitors.put(m.name(), m);
        }
        runInitCode();
        processes.addAll(ProgramLoader.buildProcesses(program.processes()));
    }

    /** Corre el codigo de inicializacion de cada monitor, sin registrar eventos. */
    private void runInitCode() {
        events.setEnabled(false);
        for (Monitor m : monitors.values()) {
            MonitorDef md = monitorDefs.get(m.definition());
            if (md.initStmts().isEmpty()) continue;
            Process sys = new Process(-1, "«init " + m.name() + "»", "#888888");
            Activation act = new Activation(m.name(), "«init»");
            act.pushFront(md.initStmts());
            sys.push(act);
            m.setLockOwner(sys);
            int guard = 0;
            while (!sys.isFinished()) {
                if (guard++ >= TOPE_INICIALIZACION) {
                    throw new RuntimeError("La inicialización del monitor " + m.name()
                            + " no terminó después de " + TOPE_INICIALIZACION
                            + " pasos: revisá si tiene un ciclo infinito", sys.currentLine());
                }
                advance(sys);
            }
            m.setLockOwner(null);
        }
        events.setEnabled(true);
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
        return step(chosenProcessId, policy, clockMs);
    }

    /**
     * Igual que {@link #step(Integer, SchedulingPolicy)}, informando la hora actual en ms.
     * Antes de elegir el turno, los procesos cuyo delay ya termino vuelven a estar listos.
     * Si nadie puede avanzar pero hay procesos demorados, no pasa el instante: se espera.
     */
    public List<LogEntry> step(Integer chosenProcessId, SchedulingPolicy policy, long nowMs) {
        events.startStep();
        clockMs = Math.max(clockMs, nowMs);

        if (isFinished()) {
            return List.of();
        }
        wakeDelayed();
        List<Process> turno = elegirTurno(chosenProcessId, policy);
        if (turno.isEmpty() && isWaitingForDelay()) {
            return events.stepEntries();
        }
        if (turno.isEmpty()) {
            if (!deadlockLogged) {
                instant++;
                logDeadlock();
            }
            return events.stepEntries();
        }

        runTurn(turno);
        if (isDeadlocked() && !deadlockLogged) {
            logDeadlock();
        }
        return events.stepEntries();
    }

    /** Un instante nuevo en el que avanzan, en orden, los procesos del turno. */
    private void runTurn(List<Process> turno) {
        instant++;
        advancedLastStep.clear();
        for (Process p : turno) {
            // Solo avanza si sigue listo, y una vez por instante: el que recibio un monitor
            // por traspaso ya hizo su accion del instante, que fue entrar.
            if (p.state() != Process.State.READY || advancedLastStep.contains(p.id())) {
                continue;
            }
            runProcess(p);
        }
    }

    /** Avanza un proceso una accion; si falla, termina solo ese proceso. */
    private void runProcess(Process p) {
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

    /** Registra el interbloqueo; se hace una sola vez por ejecucion. */
    private void logDeadlock() {
        deadlockLogged = true;
        events.systemEvent(instant, "DEADLOCK", deadlockMessage());
    }

    /**
     * Termina el proceso con error, lo registra en el log y suelta sus monitores. Sin esto el
     * lock queda en manos de un proceso muerto y los demas se bloquean para siempre: la UI
     * mostraria un DEADLOCK que el programa del alumno no tiene.
     */
    private void failProcess(Process p, String message) {
        p.fail(message);
        event(p, "ERROR", "", p.name() + ": error de ejecución - " + message);
        for (Monitor m : monitorsHeldBy(p)) {
            event(p, "RELEASE", m.name(),
                    p.name() + ": libera " + m.name() + " al terminar con error");
            releaseMonitor(m);
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
     * Toma el monitor de la activacion o espera en su cola de entrada. Sirve para las dos
     * situaciones en que un proceso compite por un monitor: la primera entrada a un
     * procedure y la vuelta de un wait.
     */
    private void reacquireMonitor(Process p, Activation act) {
        Monitor m = monitors.get(act.monitorName());
        if (!m.isFree()) {
            enqueueEntrant(p, m);
            event(p, "BLOCKED", m.name(), p.name() + ": espera para "
                    + (act.isEntering() ? "entrar a " : "reingresar a ") + destination(act, m));
            return;
        }
        takeMonitor(p, act, m);
    }

    /** El proceso toma el monitor libre para la activacion que lo necesitaba. */
    private void takeMonitor(Process p, Activation act, Monitor m) {
        String destino = destination(act, m);
        m.setLockOwner(p);
        act.setNeedsLock(false);
        if (act.isEntering()) {
            act.setEntering(false);
            event(p, "ENTER", m.name(), p.name() + ": entra a " + destino);
        } else {
            event(p, "REENTER", m.name(), p.name() + ": reingresa a " + destino);
        }
    }

    /**
     * Como lo nombran los eventos: {@code Monitor.procedure} al entrar a un procedure, y solo
     * el monitor al volver de un wait.
     */
    private static String destination(Activation act, Monitor m) {
        return act.isEntering() ? m.name() + "." + act.procedureName() : m.name();
    }

    /** El proceso pasa a competir por el monitor desde su cola de entrada. */
    private static void enqueueEntrant(Process p, Monitor m) {
        m.addEntrant(p);
        p.block(Process.BlockReason.MONITOR_ENTRY, m.name());
    }

    private void finalizeActivation(Process p, Activation act) {
        p.pop();
        if (act.isProcedure()) {
            Monitor m = monitors.get(act.monitorName());
            // Si el llamador es un procedure de otro monitor, lo sigue teniendo tomado
            // (llamada cerrada, ADR 0007): los out se escriben ya.
            for (Map.Entry<String, LValue> e : act.outBindings().entrySet()) {
                vars.writeLValue(p.id(), e.getValue(), act.locals().get(e.getKey()));
            }
            event(p, "RETURN", m.name(),
                    p.name() + ": retorna de " + m.name() + "." + act.procedureName()
                            + ", libera el monitor");
            releaseMonitor(m);
        }
        if (p.callStack().isEmpty()) {
            p.setState(Process.State.TERMINATED);
            event(p, "TERMINATED", "", p.name() + ": termina");
        }
    }

    /**
     * Describe el interbloqueo. Con llamadas cerradas, un proceso puede quedar esperando en
     * un monitor mientras retiene otro; eso se nombra, porque es lo que el alumno tiene que
     * ver para entender por que nadie avanza.
     */
    private String deadlockMessage() {
        StringBuilder sb = new StringBuilder("Interbloqueo: ningún proceso puede avanzar");
        for (Process p : processes) {
            List<Monitor> held = monitorsHeldBy(p);
            if (p.state() != Process.State.BLOCKED || held.isEmpty()) continue;
            sb.append(". ").append(p.name()).append(" espera en ").append(p.blockedOn())
                    .append(" y retiene ");
            for (int i = 0; i < held.size(); i++) {
                if (i > 0) sb.append(i == held.size() - 1 ? " y " : ", ");
                sb.append(held.get(i).name());
            }
        }
        return sb.toString();
    }

    /** Los monitores que tiene tomados el proceso, en orden de declaracion. */
    private List<Monitor> monitorsHeldBy(Process p) {
        List<Monitor> held = new ArrayList<>();
        for (Monitor m : monitors.values()) {
            if (m.lockOwner() == p) held.add(m);
        }
        return held;
    }

    /**
     * Suelta el monitor y se lo pasa a uno de los que compiten por el, que entra en ese
     * momento: esa entrada es su accion del instante (ADR 0005). Cual entra se elige al azar
     * entre todos los de la cola de entrada, sin importar el orden de llegada, porque asi lo
     * explica la catedra (ADR 0006). Si hay uno solo no se sortea, para no consumir azar.
     *
     * <p>El que llama ya registro su evento de salida (RETURN, WAIT o RELEASE): el ENTER del
     * que entra tiene que quedar despues en el log.
     */
    private void releaseMonitor(Monitor m) {
        m.setLockOwner(null);
        while (m.isFree() && m.entrantCount() > 0) {
            int n = m.entrantCount();
            Process w = m.removeEntrant(n == 1 ? 0 : random.nextInt(n));
            w.unblock();
            if (!advancedLastStep.contains(w.id())) advancedLastStep.add(w.id());
            try {
                takeMonitor(w, w.current(), m);
            } catch (RuntimeError re) {
                // un out que falla al escribirse al reingresar es un error de w, no del que
                // solto el monitor; failProcess vuelve a soltarlo para el siguiente
                failProcess(w, re.getMessage());
            }
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
                execIf(act, iff);
                yield false;
            }
            case Stmt.WhileStmt w -> {
                execWhile(act, w);
                yield false;
            }
            case Stmt.ForStmt f -> {
                execFor(p, act, f);
                yield false;
            }
            case Stmt.Skip ignored -> {
                event(p, "SKIP", "", p.name() + ": skip");
                yield true;
            }
            case Stmt.Delay d -> {
                execDelay(p, act, d);
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

    // ---------------------------------------------------------------- sentencias estructurales

    /** Apila la rama elegida; con la condicion falsa y sin else no apila nada. */
    private void execIf(Activation act, Stmt.IfStmt iff) {
        if (vars.evaluator(act).evalBool(iff.condition())) {
            act.pushFront(iff.thenBranch().statements());
        } else if (iff.elseBranch() != null) {
            act.pushFront(iff.elseBranch().statements());
        }
    }

    /** Si la condicion vale, apila el cuerpo y, detras, el mismo while para la vuelta siguiente. */
    private void execWhile(Activation act, Stmt.WhileStmt w) {
        if (vars.evaluator(act).evalBool(w.condition())) {
            act.pushFront(w);
            act.pushFront(w.body().statements());
        }
    }

    /** Inicializa el iterador (y la cota, en la forma de rango) y lo reescribe como un while. */
    private void execFor(Process p, Activation act, Stmt.ForStmt f) {
        if (f.init() instanceof VarDecl vd) {
            Value v = vd.initExpr() == null
                    ? Value.defaultFor(vd.type())
                    : vars.evaluator(act).eval(vd.initExpr())
                            .assignTo(vd.type(), vd.name(), vd.line());
            act.locals().put(vd.name(), v);
        } else {
            Stmt.Assign asg = (Stmt.Assign) f.init();
            vars.assignScalar(p.id(), act, asg.target(),
                    vars.evaluator(act).eval(asg.value()), asg.line());
        }
        if (f.limit() != null) {
            // la cota del rango se fija al entrar: cambiarla adentro no cambia las vueltas
            act.locals().put(f.limit().name(), vars.evaluator(act).eval(f.limit().initExpr()));
        }
        List<Stmt> loopBody = new ArrayList<>(f.body().statements());
        loopBody.add(f.step());
        act.pushFront(new Stmt.WhileStmt(f.condition(),
                new Stmt.Block(loopBody, f.line()), f.line()));
    }

    // ---------------------------------------------------------------- sentencias leaf

    private void execLocalDecl(Process p, Activation act, VarDecl vd) {
        Value v = ProgramLoader.initialValue(vd, vars.evaluator(act));
        act.locals().put(vd.name(), v);
        event(p, "DECL", vd.name(), p.name() + ": " + vd.type().keyword()
                + " " + vd.name() + " = " + v.display());
    }

    private void execAssign(Process p, Activation act, Stmt.Assign a) {
        ExprEvaluator ev = vars.evaluator(act);
        Value value = ev.eval(a.value());
        if (a.index() == null) {
            vars.assignScalar(p.id(), act, a.target(), value, a.line());
            event(p, "ASSIGN", a.target(), p.name() + ": " + a.target() + " = " + value.display());
        } else {
            long index = ev.evalLong(a.index());
            Value.ArrayVal arr = vars.asArray(act, a.target(), a.line());
            int idx = VariableAccess.checkIndex(arr, index, a.target(), a.line());
            arr.set(idx, value.assignTo(arr.elementType(), a.target() + "[" + idx + "]", a.line()));
            vars.touchIfMonitorVar(p.id(), act, a.target());
            event(p, "ASSIGN", a.target(),
                    p.name() + ": " + a.target() + "[" + idx + "] = " + value.display());
        }
    }

    private void execIncDec(Process p, Activation act, Stmt.IncDec inc) {
        ExprEvaluator ev = vars.evaluator(act);
        if (inc.index() == null) {
            Value cur = vars.read(act, inc.target(), inc.line());
            Value next = stepped(cur, inc.increment(), inc.line());
            vars.assignScalar(p.id(), act, inc.target(), next, inc.line());
            event(p, "ASSIGN", inc.target(),
                    p.name() + ": " + inc.target() + (inc.increment() ? "++" : "--")
                            + " => " + next.display());
        } else {
            long index = ev.evalLong(inc.index());
            Value.ArrayVal arr = vars.asArray(act, inc.target(), inc.line());
            int idx = VariableAccess.checkIndex(arr, index, inc.target(), inc.line());
            Value next = stepped(arr.get(idx), inc.increment(), inc.line());
            arr.set(idx, next);
            vars.touchIfMonitorVar(p.id(), act, inc.target());
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
     * Llamada a un procedure. Los argumentos se evaluan una vez, al llamar. Despues el proceso
     * entra al monitor llamado o espera en su cola de entrada. Si el llamador esta dentro de
     * otro monitor, lo sigue teniendo tomado hasta que la llamada termina por completo,
     * aunque haga wait en el monitor llamado (llamada cerrada, ADR 0007).
     */
    private boolean execMonitorCall(Process p, Activation callerAct, Stmt.MonitorCall call) {
        MonitorDef md = monitorDefs.get(call.monitor());
        Monitor m = monitors.get(instanceName(callerAct, call, md));
        ProcedureDef pd = md.procedure(call.procedure());

        if (m.lockOwner() == p) {
            // El compilador rechaza la llamada directa; se llega aca con un ciclo entre
            // monitores (A llama a B, que llama a A). Con la llamada cerrada el proceso se
            // esperaria a si mismo para siempre.
            throw new RuntimeError(p.name() + " ya está dentro de " + m.name()
                    + " y no puede volver a llamarlo desde otro monitor", call.line());
        }

        ExprEvaluator ev = vars.evaluator(callerAct);
        List<Value> argValues = new ArrayList<>();
        for (Expr arg : call.args()) argValues.add(ev.eval(arg));

        Activation newAct = new Activation(m.name(), pd.name());
        for (int i = 0; i < pd.params().size(); i++) {
            Param param = pd.params().get(i);
            if (param.isInput()) {
                newAct.locals().put(param.name(),
                        argValues.get(i).assignTo(param.type(), param.name(), call.line()));
            } else {
                newAct.locals().put(param.name(), Value.defaultFor(param.type()));
            }
            if (param.isOutput()) {
                newAct.outBindings().put(param.name(),
                        outTarget(callerAct, call.args().get(i), ev));
            }
        }
        newAct.pushFront(pd.body().statements());
        p.push(newAct);
        newAct.setNeedsLock(true);
        newAct.setEntering(true);
        reacquireMonitor(p, newAct);
        return true;
    }

    /**
     * El lugar del llamador donde se copia un parametro {@code out} al retornar: una variable
     * o un elemento de arreglo (el compilador no admite otra cosa).
     */
    private static LValue outTarget(Activation callerAct, Expr argExpr, ExprEvaluator ev) {
        if (argExpr instanceof Expr.VarRef vr) {
            return new LValue(callerAct, vr.name(), null);
        }
        Expr.ArrayAccess aa = (Expr.ArrayAccess) argExpr;
        // ya se evaluo (y controlo el rango) como argumento: entra en un int
        return new LValue(callerAct, aa.name(), (int) ev.evalLong(aa.index()));
    }

    /** El monitor al que va la llamada: en un arreglo de monitores, el del indice evaluado. */
    private String instanceName(Activation callerAct, Stmt.MonitorCall call, MonitorDef md) {
        if (call.index() == null) return call.monitor();
        long index = vars.evaluator(callerAct).evalLong(call.index());
        String name = call.monitor() + "[" + index + "]";
        if (!monitors.containsKey(name)) {
            ExprEvaluator bounds = new ExprEvaluator(n -> null);
            throw new RuntimeError("Índice " + index + " fuera de rango para el monitor '"
                    + call.monitor() + "' (va de " + bounds.evalLong(md.quant().from()) + " a "
                    + bounds.evalLong(md.quant().to()) + ")", call.line());
        }
        return name;
    }

    private void execCondOp(Process p, Activation act, Stmt.CondOp co) {
        Monitor m = monitors.get(act.monitorName());
        String key = condKey(act, m, co);
        ConditionVariable cv = m.conds().get(key);
        if (cv == null) {
            throw new RuntimeError("Variable condición no declarada: " + key, co.line());
        }
        switch (co.kind()) {
            case WAIT -> execWait(p, act, m, cv, key);
            case SIGNAL -> execSignal(p, m, cv, key);
            case SIGNAL_ALL -> execSignalAll(p, m, cv, key);
        }
    }

    /** El nombre de la cond en el monitor: {@code c}, o {@code c[i]} con el indice ya controlado. */
    private String condKey(Activation act, Monitor m, Stmt.CondOp co) {
        if (co.index() == null) return co.cond();
        long index = vars.evaluator(act).evalLong(co.index());
        int size = m.condArraySizes().getOrDefault(co.cond(), 0);
        if (index < 0 || index >= size) {
            throw new RuntimeError("Índice " + index + " fuera de rango para la cond '"
                    + co.cond() + "' (tamaño " + size + ")", co.line());
        }
        return co.cond() + "[" + index + "]";
    }

    /** El proceso se demora en la cond y suelta el monitor; al despertar tendra que retomarlo. */
    private void execWait(Process p, Activation act, Monitor m, ConditionVariable cv, String key) {
        cv.enqueue(p);
        p.block(Process.BlockReason.COND_WAIT, m.name() + "." + key);
        act.setNeedsLock(true);
        event(p, "WAIT", m.name() + "." + key,
                p.name() + ": wait(" + key + ") - libera el monitor y se demora");
        releaseMonitor(m);
    }

    /** Signal and continue: el despertado pasa a competir por el monitor y el que senala sigue. */
    private void execSignal(Process p, Monitor m, ConditionVariable cv, String key) {
        if (cv.isEmpty()) {
            event(p, "SIGNAL", m.name() + "." + key,
                    p.name() + ": signal(" + key + ") - sin efecto (cola vacía)");
            return;
        }
        Process w = cv.dequeue();
        enqueueEntrant(w, m);
        event(p, "SIGNAL", m.name() + "." + key,
                p.name() + ": signal(" + key + ") - despierta a " + w.name()
                        + " (compite por el monitor)");
    }

    private void execSignalAll(Process p, Monitor m, ConditionVariable cv, String key) {
        List<Process> all = cv.drain();
        for (Process w : all) enqueueEntrant(w, m);
        event(p, "SIGNAL_ALL", m.name() + "." + key,
                p.name() + ": signal_all(" + key + ") - despierta a " + all.size()
                        + " proceso(s)");
    }

    /**
     * Demora al proceso la cantidad de segundos indicada, en tiempo real. Si esta dentro de
     * un monitor, lo sigue teniendo tomado mientras tanto.
     */
    private void execDelay(Process p, Activation act, Stmt.Delay d) {
        long seconds = vars.evaluator(act).evalLong(d.seconds());
        if (seconds < 0 || seconds > TOPE_DELAY) {
            throw new RuntimeError("El delay tiene que ser de 0 a " + TOPE_DELAY
                    + " segundos y es de " + seconds, d.line());
        }
        p.delayUntil(clockMs + seconds * 1000);
        event(p, "DELAY", "", p.name() + ": delay(" + seconds + ") - se demora " + seconds
                + (seconds == 1 ? " segundo" : " segundos"));
    }

    /** Concatena los argumentos y deja una linea en la pantalla de salida. */
    private void execWrite(Process p, Activation act, Stmt.Write w) {
        ExprEvaluator ev = vars.evaluator(act);
        StringBuilder sb = new StringBuilder();
        for (Expr e : w.args()) sb.append(ev.eval(e).display());
        String texto = sb.toString();
        salida.add(instant, p, texto);
        event(p, "WRITE", "", p.name() + ": write(" + texto + ")");
    }

    private void execQueuePush(Process p, Activation act, Stmt.QueuePush qp) {
        ExprEvaluator ev = vars.evaluator(act);
        Value.QueueVal q = vars.asQueue(act, qp.queue(), qp.line());
        // cada componente se guarda con el tipo declarado (un int en un double, un numero en
        // un text), como al asignar una variable
        List<Type> tipos = q.elementTypes();
        List<Value> vals = new ArrayList<>();
        for (int i = 0; i < qp.elements().size(); i++) {
            vals.add(ev.eval(qp.elements().get(i)).assignTo(tipos.get(i),
                    "la componente " + (i + 1) + " de " + qp.queue(), qp.line()));
        }
        Value pushed = vals.size() == 1
                ? vals.get(0)
                : Value.ArrayVal.tuple(vals.toArray(new Value[0]));
        q.push(pushed);
        vars.touchIfMonitorVar(p.id(), act, qp.queue());
        event(p, "PUSH", qp.queue(),
                p.name() + ": push(" + qp.queue() + ", " + pushed.display() + ")");
    }

    private void execQueuePop(Process p, Activation act, Stmt.QueuePop qp) {
        Value.QueueVal q = vars.asQueue(act, qp.queue(), qp.line());
        if (q.isEmpty()) {
            throw new RuntimeError("pop sobre la cola vacía '" + qp.queue() + "'", qp.line());
        }
        Value v = q.pop();
        vars.touchIfMonitorVar(p.id(), act, qp.queue());
        if (qp.targets().size() == 1) {
            vars.assignScalar(p.id(), act, qp.targets().get(0), v, qp.line());
        } else {
            if (!(v instanceof Value.ArrayVal tuple) || tuple.size() < qp.targets().size()) {
                throw new RuntimeError("El elemento desencolado no tiene suficientes componentes "
                        + "para el pop múltiple", qp.line());
            }
            for (int i = 0; i < qp.targets().size(); i++) {
                vars.assignScalar(p.id(), act, qp.targets().get(i), tuple.get(i), qp.line());
            }
        }
        event(p, "POP", qp.queue(),
                p.name() + ": pop(" + qp.queue() + ") => " + v.display());
    }

    // ================================================================= estado / snapshots

    public boolean isFinished() {
        return processes.stream().allMatch(Process::isFinished);
    }

    public boolean isDeadlocked() {
        return !isFinished()
                && processes.stream().noneMatch(pr -> pr.state() == Process.State.READY
                        || pr.isDelayed());
    }

    /** true si ningun proceso esta listo pero alguno espera que termine su delay. */
    public boolean isWaitingForDelay() {
        return processes.stream().noneMatch(pr -> pr.state() == Process.State.READY)
                && processes.stream().anyMatch(Process::isDelayed);
    }

    /** Hora del reloj de la simulacion, en ms: la ultima informada a {@link #step}. */
    public long clockMs() {
        return clockMs;
    }

    private void wakeDelayed() {
        for (Process p : processes) {
            if (p.isDelayed() && p.delayEndsAt() <= clockMs) p.unblock();
        }
    }

    public int instant() {
        return instant;
    }

    /**
     * Los ultimos eventos de la ejecucion (a lo sumo {@link EventLog#TOPE_LOG}), del mas viejo
     * al mas nuevo.
     */
    public List<LogEntry> allLogs() {
        return events.all();
    }

    public Snapshot snapshot() {
        return SnapshotBuilder.build(instant, processes, monitors.values(), advancedLastStep,
                salida.view());
    }

    // ================================================================= logging

    private void event(Process p, String kind, String resource, String message) {
        events.processEvent(instant, p, kind, resource, message);
    }
}
