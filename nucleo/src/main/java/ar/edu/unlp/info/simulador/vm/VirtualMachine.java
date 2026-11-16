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

    /** Tope de iteraciones estructurales (bloques anidados) por instante, corta busy-waits. */
    private static final int STRUCTURAL_CAP = 4000;

    /** Segundos maximos de un delay: una hora alcanza para cualquier ejercicio. */
    static final int TOPE_DELAY = 3600;

    /** Pasos que puede dar el codigo de inicializacion de un monitor antes de darlo por colgado. */
    static final int TOPE_INICIALIZACION = 100_000;

    private final Program program;
    private final Scheduler scheduler;
    private final MonitorProtocol monitorProtocol;

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
    /**
     * Reloj de la simulacion, en ms. No lo lee la VM (el nucleo es determinista): lo informa
     * quien llama a {@link #step(Integer, SchedulingPolicy, long)}, y solo lo usa delay.
     */
    private long clockMs = 0;
    private boolean deadlockLogged = false;

    public VirtualMachine(Program program, long seed) {
        this.program = program;
        Azar random = new Azar(seed);
        this.scheduler = new Scheduler(processes, random);
        this.monitorProtocol = new MonitorProtocol(monitors, random, advancedLastStep,
                this::event);
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
            if (!md.initStmts().isEmpty()) runMonitorInit(m, md.initStmts());
        }
        events.setEnabled(true);
    }

    /**
     * El codigo de inicializacion lo corre un proceso de sistema (id negativo, sin eventos)
     * que tiene el monitor tomado hasta terminar. Un ciclo sin fin es error del alumno.
     */
    private void runMonitorInit(Monitor m, List<Stmt> initStmts) {
        Process sys = new Process(-1, "«init " + m.name() + "»", "#888888");
        Activation act = new Activation(m.name(), "«init»");
        act.pushFront(initStmts);
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
        List<Process> turno = scheduler.nextTurn(chosenProcessId, policy);
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
            monitorProtocol.fail(p, re.getMessage());
        } catch (Throwable t) {
            // Un error que no es del alumno (un bug del simulador, o memoria/pila agotada)
            // igual termina solo ese proceso: si quedara RUNNING, el instante siguiente lo
            // tomaria por un interbloqueo que el programa no tiene.
            monitorProtocol.fail(p, "error interno del simulador");
        }
        if (p.state() == Process.State.RUNNING) {
            p.setState(Process.State.READY);
        }
    }

    /** Registra el interbloqueo; se hace una sola vez por ejecucion. */
    private void logDeadlock() {
        deadlockLogged = true;
        events.systemEvent(instant, EventKind.DEADLOCK, deadlockMessage());
    }

    // ================================================================= ejecucion de un proceso

    private void advance(Process p) {
        int guard = 0;
        while (true) {
            if (++guard > STRUCTURAL_CAP) {
                event(p, EventKind.SPIN, "", p.name() + ": espera activa (bucle sin avanzar)");
                return;
            }
            Activation act = p.current();
            if (act == null) {
                p.setState(Process.State.TERMINATED);
                return;
            }
            if (act.needsLock()) {
                monitorProtocol.acquire(p, act);
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

    private void finalizeActivation(Process p, Activation act) {
        p.pop();
        if (act.isProcedure()) {
            Monitor m = monitors.get(act.monitorName());
            writeOutParameters(p, act);
            event(p, EventKind.RETURN, m.name(),
                    p.name() + ": retorna de " + m.name() + "." + act.procedureName()
                            + ", libera el monitor");
            monitorProtocol.release(m);
        }
        if (p.callStack().isEmpty()) {
            p.setState(Process.State.TERMINATED);
            event(p, EventKind.TERMINATED, "", p.name() + ": termina");
        }
    }

    /**
     * Copia cada parametro {@code out} al lugar del llamador. Si el llamador es un procedure
     * de otro monitor, lo sigue teniendo tomado (llamada cerrada, ADR 0007): se escriben ya.
     */
    private void writeOutParameters(Process p, Activation act) {
        for (Map.Entry<String, LValue> e : act.outBindings().entrySet()) {
            vars.writeLValue(p.id(), e.getValue(), act.locals().get(e.getKey()));
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
            List<Monitor> held = monitorProtocol.heldBy(p);
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

    /**
     * Ejecuta la sentencia.
     *
     * @return true si consumio el instante (accion observable); false si es estructural
     */
    private boolean executeStmt(Process p, Activation act, Stmt s) {
        switch (s) {
            case Stmt.Block b -> act.pushFront(b.statements());
            case Stmt.IfStmt iff -> execIf(act, iff);
            case Stmt.WhileStmt w -> execWhile(act, w);
            case Stmt.ForStmt f -> execFor(p, act, f);
            case Stmt.Skip ignored -> event(p, EventKind.SKIP, "", p.name() + ": skip");
            case Stmt.Delay d -> execDelay(p, act, d);
            case VarDecl vd -> execLocalDecl(p, act, vd);
            case Stmt.Assign a -> execAssign(p, act, a);
            case Stmt.IncDec inc -> execIncDec(p, act, inc);
            case Stmt.MonitorCall call -> execMonitorCall(p, act, call);
            case Stmt.CondOp co -> execCondOp(p, act, co);
            case Stmt.Write w -> execWrite(p, act, w);
            case Stmt.QueuePush qp -> execQueuePush(p, act, qp);
            case Stmt.QueuePop qp -> execQueuePop(p, act, qp);
        }
        return !isStructural(s);
    }

    /**
     * Las sentencias que solo reorganizan lo pendiente (bloques, if, while, for) no son una
     * accion del alumno: el proceso sigue hasta la siguiente sentencia observable.
     */
    private static boolean isStructural(Stmt s) {
        return s instanceof Stmt.Block || s instanceof Stmt.IfStmt
                || s instanceof Stmt.WhileStmt || s instanceof Stmt.ForStmt;
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
        event(p, EventKind.DECL, vd.name(), p.name() + ": " + vd.type().keyword()
                + " " + vd.name() + " = " + v.display());
    }

    private void execAssign(Process p, Activation act, Stmt.Assign a) {
        Value value = vars.evaluator(act).eval(a.value());
        if (a.index() == null) {
            vars.assignScalar(p.id(), act, a.target(), value, a.line());
            event(p, EventKind.ASSIGN, a.target(), p.name() + ": " + a.target() + " = " + value.display());
            return;
        }
        VariableAccess.ArraySlot slot = vars.arraySlot(act, a.target(), a.index(), a.line());
        String element = a.target() + "[" + slot.index() + "]";
        slot.array().set(slot.index(),
                value.assignTo(slot.array().elementType(), element, a.line()));
        vars.touchIfMonitorVar(p.id(), act, a.target());
        event(p, EventKind.ASSIGN, a.target(), p.name() + ": " + element + " = " + value.display());
    }

    private void execIncDec(Process p, Activation act, Stmt.IncDec inc) {
        String operator = inc.increment() ? "++" : "--";
        if (inc.index() == null) {
            Value cur = vars.read(act, inc.target(), inc.line());
            Value next = stepped(cur, inc.increment(), inc.line());
            vars.assignScalar(p.id(), act, inc.target(), next, inc.line());
            event(p, EventKind.ASSIGN, inc.target(),
                    p.name() + ": " + inc.target() + operator + " => " + next.display());
            return;
        }
        VariableAccess.ArraySlot slot = vars.arraySlot(act, inc.target(), inc.index(), inc.line());
        Value next = stepped(slot.array().get(slot.index()), inc.increment(), inc.line());
        slot.array().set(slot.index(), next);
        vars.touchIfMonitorVar(p.id(), act, inc.target());
        event(p, EventKind.ASSIGN, inc.target(), p.name() + ": " + inc.target() + "[" + slot.index()
                + "]" + operator + " => " + next.display());
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
    private void execMonitorCall(Process p, Activation callerAct, Stmt.MonitorCall call) {
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

        Activation newAct = procedureActivation(m, pd, call, callerAct);
        p.push(newAct);
        newAct.setNeedsLock(true);
        newAct.setEntering(true);
        monitorProtocol.acquire(p, newAct);
    }

    /**
     * La activacion del procedure llamado, con los argumentos ya evaluados (todos, antes de
     * ligar ninguno): los de entrada se copian con el tipo del parametro; los {@code out}
     * arrancan en su valor por defecto y quedan ligados al lugar del llamador.
     */
    private Activation procedureActivation(Monitor m, ProcedureDef pd, Stmt.MonitorCall call,
            Activation callerAct) {
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
        return newAct;
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
            ProgramLoader.FamilyBounds bounds = ProgramLoader.familyBounds(md.quant());
            throw new RuntimeError("Índice " + index + " fuera de rango para el monitor '"
                    + call.monitor() + "' (va de " + bounds.from() + " a " + bounds.to() + ")",
                    call.line());
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
            case WAIT -> monitorProtocol.waitOn(p, act, m, cv, key);
            case SIGNAL -> monitorProtocol.signal(p, m, cv, key);
            case SIGNAL_ALL -> monitorProtocol.signalAll(p, m, cv, key);
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
        event(p, EventKind.DELAY, "", p.name() + ": delay(" + seconds + ") - se demora " + seconds
                + (seconds == 1 ? " segundo" : " segundos"));
    }

    /** Concatena los argumentos y deja una linea en la pantalla de salida. */
    private void execWrite(Process p, Activation act, Stmt.Write w) {
        ExprEvaluator ev = vars.evaluator(act);
        StringBuilder sb = new StringBuilder();
        for (Expr e : w.args()) sb.append(ev.eval(e).display());
        String texto = sb.toString();
        salida.add(instant, p, texto);
        event(p, EventKind.WRITE, "", p.name() + ": write(" + texto + ")");
    }

    private void execQueuePush(Process p, Activation act, Stmt.QueuePush qp) {
        Value.QueueVal q = vars.asQueue(act, qp.queue(), qp.line());
        Value pushed = pushedElement(act, qp, q.elementTypes());
        q.push(pushed);
        vars.touchIfMonitorVar(p.id(), act, qp.queue());
        event(p, EventKind.PUSH, qp.queue(),
                p.name() + ": push(" + qp.queue() + ", " + pushed.display() + ")");
    }

    /**
     * El elemento a encolar: una componente sola, o la tupla de todas. Cada componente se
     * guarda con el tipo declarado (un int en un double, un numero en un text), como al
     * asignar una variable.
     */
    private Value pushedElement(Activation act, Stmt.QueuePush qp, List<Type> types) {
        ExprEvaluator ev = vars.evaluator(act);
        List<Value> values = new ArrayList<>();
        for (int i = 0; i < qp.elements().size(); i++) {
            values.add(ev.eval(qp.elements().get(i)).assignTo(types.get(i),
                    "la componente " + (i + 1) + " de " + qp.queue(), qp.line()));
        }
        return values.size() == 1
                ? values.get(0)
                : Value.ArrayVal.tuple(values.toArray(new Value[0]));
    }

    private void execQueuePop(Process p, Activation act, Stmt.QueuePop qp) {
        Value.QueueVal q = vars.asQueue(act, qp.queue(), qp.line());
        if (q.isEmpty()) {
            throw new RuntimeError("pop sobre la cola vacía '" + qp.queue() + "'", qp.line());
        }
        Value v = q.pop();
        vars.touchIfMonitorVar(p.id(), act, qp.queue());
        assignPopped(p, act, qp, v);
        event(p, EventKind.POP, qp.queue(),
                p.name() + ": pop(" + qp.queue() + ") => " + v.display());
    }

    /** Reparte el elemento desencolado en los destinos: uno solo, o una componente a cada uno. */
    private void assignPopped(Process p, Activation act, Stmt.QueuePop qp, Value popped) {
        if (qp.targets().size() == 1) {
            vars.assignScalar(p.id(), act, qp.targets().get(0), popped, qp.line());
            return;
        }
        if (!(popped instanceof Value.ArrayVal tuple) || tuple.size() < qp.targets().size()) {
            throw new RuntimeError("El elemento desencolado no tiene suficientes componentes "
                    + "para el pop múltiple", qp.line());
        }
        for (int i = 0; i < qp.targets().size(); i++) {
            vars.assignScalar(p.id(), act, qp.targets().get(i), tuple.get(i), qp.line());
        }
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

    private void event(Process p, EventKind kind, String resource, String message) {
        events.processEvent(instant, p, kind, resource, message);
    }
}
