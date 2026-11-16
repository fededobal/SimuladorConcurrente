package ar.edu.unlp.info.simulator.vm;

import ar.edu.unlp.info.simulator.lang.parser.ast.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Ejecuta una sentencia de un proceso. Las estructurales (bloque, if, while, for) solo
 * reorganizan lo que le queda por ejecutar a la activacion; las observables cambian el estado
 * y registran un evento. Lo que tiene que ver con el monitor (entrar, wait, signal) lo
 * resuelve {@link MonitorProtocol}.
 */
final class StatementExecutor {

    /** Segundos maximos de un delay: una hora alcanza para cualquier ejercicio. */
    static final int MAX_DELAY_SECONDS = 3600;

    private final VariableAccess vars;
    private final Map<String, Monitor> monitors;
    private final Map<String, MonitorDef> monitorDefs;
    private final MonitorProtocol monitorProtocol;
    /** La pantalla de salida de write. */
    private final OutputBuffer output;
    private final SimulationClock clock;
    private final MonitorProtocol.EventSink events;

    StatementExecutor(VariableAccess vars, Map<String, Monitor> monitors,
            Map<String, MonitorDef> monitorDefs, MonitorProtocol monitorProtocol,
            OutputBuffer output, SimulationClock clock, MonitorProtocol.EventSink events) {
        this.vars = vars;
        this.monitors = monitors;
        this.monitorDefs = monitorDefs;
        this.monitorProtocol = monitorProtocol;
        this.output = output;
        this.clock = clock;
        this.events = events;
    }

    /**
     * Ejecuta la sentencia.
     *
     * @return true si consumio el instante (accion observable); false si es estructural
     */
    boolean execute(Process p, Activation act, Stmt s) {
        switch (s) {
            case Stmt.Block b -> act.pushFront(b.statements());
            case Stmt.IfStmt iff -> execIf(act, iff);
            case Stmt.WhileStmt w -> execWhile(act, w);
            case Stmt.ForStmt f -> execFor(p, act, f);
            case Stmt.Skip ignored -> event(p, EventKind.SKIP, "", p.name() + ": skip");
            case Stmt.Delay d -> execDelay(p, act, d);
            case VarDecl vd -> execLocalDecl(p, act, vd);
            case Stmt.Assign a -> execAssign(p, act, a);
            case Stmt.Swap sw -> execSwap(p, act, sw);
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
            event(p, EventKind.ASSIGN, a.target(),
                    p.name() + ": " + a.target() + " = " + value.display());
            return;
        }
        VariableAccess.ArraySlot slot = vars.arraySlot(act, a.target(), a.index(), a.line());
        String element = a.target() + "[" + slot.index() + "]";
        slot.array().set(slot.index(),
                value.assignTo(slot.array().elementType(), element, a.line()));
        vars.touchIfMonitorVar(p.id(), act, a.target());
        event(p, EventKind.ASSIGN, a.target(), p.name() + ": " + element + " = " + value.display());
    }

    /**
     * Lee los dos lados y despues escribe cada uno con el valor del otro, todo en el mismo
     * paso: ningun otro proceso ve el estado intermedio.
     */
    private void execSwap(Process p, Activation act, Stmt.Swap sw) {
        Place left = place(act, sw.left(), sw.leftIndex(), sw.line());
        Place right = place(act, sw.right(), sw.rightIndex(), sw.line());
        Value leftValue = left.read();
        Value rightValue = right.read();
        left.write(p, rightValue);
        right.write(p, leftValue);
        event(p, EventKind.ASSIGN, sw.left(), p.name() + ": " + left.label() + " :=: "
                + right.label() + " => " + left.label() + " = " + rightValue.display() + ", "
                + right.label() + " = " + leftValue.display());
    }

    /** Una variable o un elemento de arreglo, ya resuelto, que se puede leer y escribir. */
    private interface Place {
        String label();
        Value read();
        void write(Process writer, Value value);
    }

    private Place place(Activation act, String name, Expr index, int line) {
        if (index == null) {
            return new Place() {
                public String label() { return name; }
                public Value read() { return vars.read(act, name, line); }
                public void write(Process writer, Value value) {
                    vars.assignScalar(writer.id(), act, name, value, line);
                }
            };
        }
        VariableAccess.ArraySlot slot = vars.arraySlot(act, name, index, line);
        String element = name + "[" + slot.index() + "]";
        return new Place() {
            public String label() { return element; }
            public Value read() { return slot.array().get(slot.index()); }
            public void write(Process writer, Value value) {
                slot.array().set(slot.index(),
                        value.assignTo(slot.array().elementType(), element, line));
                vars.touchIfMonitorVar(writer.id(), act, name);
            }
        };
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

    /**
     * {@code ++}/{@code --} conservan el tipo: un double suma 1.0 y un int no desborda en silencio.
     */
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

    /**
     * El nombre de la cond en el monitor: {@code c}, o {@code c[i]} con el indice ya controlado.
     */
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
        if (seconds < 0 || seconds > MAX_DELAY_SECONDS) {
            throw new RuntimeError("El delay tiene que ser de 0 a " + MAX_DELAY_SECONDS
                    + " segundos y es de " + seconds, d.line());
        }
        p.delayUntil(clock.nowMs() + seconds * 1000);
        event(p, EventKind.DELAY, "", p.name() + ": delay(" + seconds + ") - se demora " + seconds
                + (seconds == 1 ? " segundo" : " segundos"));
    }

    /** Concatena los argumentos y deja una linea en la pantalla de salida. */
    private void execWrite(Process p, Activation act, Stmt.Write w) {
        ExprEvaluator ev = vars.evaluator(act);
        StringBuilder sb = new StringBuilder();
        for (Expr e : w.args()) sb.append(ev.eval(e).display());
        String text = sb.toString();
        output.add(clock.instant(), p, text);
        event(p, EventKind.WRITE, "", p.name() + ": write(" + text + ")");
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

    private void event(Process p, EventKind kind, String resource, String message) {
        events.event(p, kind, resource, message);
    }
}
