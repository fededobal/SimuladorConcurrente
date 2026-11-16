package ar.edu.unlp.info.simulator.lang;

import ar.edu.unlp.info.simulator.lang.Scope.Symbol;
import ar.edu.unlp.info.simulator.lang.Scope.VarType;
import ar.edu.unlp.info.simulator.lang.parser.ast.*;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Chequeos semanticos sobre el AST: nombres declarados y su alcance (los locales del proceso
 * no se ven dentro de un monitor, ningun nombre tapa a otro), tipos de expresiones y de
 * asignaciones ({@link ExprTyper}), existencia de monitores, procedures y cond, aridad de las
 * llamadas, parametros {@code out} ligados a variables, {@code wait}/{@code signal} solo
 * dentro de procedures, y prohibicion de modificar constantes, parametros in e iteradores.
 */
public final class SemanticValidator {

    private static final String PERMANENT_ORIGIN = "una variable permanente";
    private static final String LOCAL_ORIGIN = "una variable local";
    private static final String PARAMETER_ORIGIN = "un parámetro";
    private static final String ITERATOR_ORIGIN = "un iterador";

    private final Program program;
    private final Map<String, MonitorInfo> monitors = new HashMap<>();

    public SemanticValidator(Program program) {
        this.program = program;
    }

    public void validate() {
        if (program.processes().isEmpty()) {
            throw new CompilationException("El programa debe tener al menos un proceso");
        }
        monitors.putAll(NameCollector.collect(program));
        for (MonitorDef m : program.monitors()) {
            validateMonitor(m);
        }
        for (ProcessDef p : program.processes()) {
            validateProcess(p);
        }
    }

    // ---------------------------------------------------------------- monitor y proceso

    private void validateMonitor(MonitorDef m) {
        // Las permanentes se inicializan en orden: cada una ve a las anteriores.
        Set<String> condNames = new HashSet<>();
        for (CondDecl c : m.conds()) condNames.add(c.name());
        Scope root = new Scope(null, m.name(), false, condNames);
        if (m.isFamily()) {
            Scope bounds = new Scope(null, null, false, Set.of());
            String boundLabel = "La cota del arreglo de monitores";
            ExprTyper.expect(m.quant().from(), Type.INT, bounds, boundLabel);
            ExprTyper.expect(m.quant().to(), Type.INT, bounds, boundLabel);
            root.declare(m.quant().iterator(), new Symbol(new VarType(Type.INT, false), true,
                    "el índice del monitor", null), m.line());
        }
        for (VarDecl v : m.permanentVars()) {
            checkVarDecl(v, root, PERMANENT_ORIGIN);
        }
        for (CondDecl c : m.conds()) {
            if (c.isArray()) {
                ExprTyper.expect(c.sizeExpr(), Type.INT, root, "El tamaño de la cond");
            }
        }

        Scope init = root.child();
        for (Stmt s : m.initStmts()) {
            if (containsMonitorInteraction(s)) {
                throw new CompilationException("El código de inicialización del monitor "
                        + m.name() + " no puede llamar a monitores ni usar wait, signal o delay",
                        s.line());
            }
            checkStmt(s, init);
        }

        for (ProcedureDef pr : m.procedures()) {
            Scope scope = new Scope(root, m.name(), true, condNames);
            for (Param param : pr.params()) {
                declare(scope, param.name(), new Symbol(new VarType(param.type(), false),
                        !param.isOutput(), PARAMETER_ORIGIN, null), param.line());
            }
            checkBlock(pr.body(), scope);
        }
    }

    private void validateProcess(ProcessDef p) {
        Scope scope = new Scope(null, null, false, Set.of());
        if (p.isFamily()) {
            ExprTyper.expect(p.quant().from(), Type.INT, scope, "La cota de la familia");
            ExprTyper.expect(p.quant().to(), Type.INT, scope, "La cota de la familia");
            scope.declare(p.quant().iterator(), new Symbol(new VarType(Type.INT, false), true,
                    "el iterador de la familia", null), p.line());
        }
        checkBlock(p.body(), scope);
    }

    // ---------------------------------------------------------------- sentencias

    private void checkBlock(Stmt.Block block, Scope parent) {
        Scope scope = parent.child();
        for (Stmt s : block.statements()) {
            checkStmt(s, scope);
        }
    }

    private void checkStmt(Stmt s, Scope scope) {
        switch (s) {
            case Stmt.Block b -> checkBlock(b, scope);
            case VarDecl vd -> checkVarDecl(vd, scope, LOCAL_ORIGIN);
            case Stmt.Assign a -> checkAssign(a, scope);
            case Stmt.Swap sw -> checkSwap(sw, scope);
            case Stmt.IncDec inc -> checkIncDec(inc, scope);
            case Stmt.Skip ignored -> { }
            case Stmt.IfStmt iff -> {
                ExprTyper.expect(iff.condition(), Type.BOOLEAN, scope, "La condición del if");
                checkBlock(iff.thenBranch(), scope);
                if (iff.elseBranch() != null) checkBlock(iff.elseBranch(), scope);
            }
            case Stmt.WhileStmt w -> {
                ExprTyper.expect(w.condition(), Type.BOOLEAN, scope, "La condición del while");
                checkBlock(w.body(), scope);
            }
            case Stmt.ForStmt f -> checkFor(f, scope);
            case Stmt.MonitorCall call -> checkMonitorCall(call, scope);
            case Stmt.CondOp co -> checkCondOp(co, scope);
            case Stmt.QueuePush qp -> QueueChecks.checkPush(qp, scope);
            case Stmt.Write w -> {
                for (Expr e : w.args()) ExprTyper.checkWriteArg(e, scope);
            }
            case Stmt.QueuePop qp -> QueueChecks.checkPop(qp, scope,
                    target -> targetType(target, null, scope, qp.line()));
            case Stmt.Delay d -> ExprTyper.expect(d.seconds(), Type.INT, scope,
                    "El tiempo del delay");
        }
    }

    private void checkVarDecl(VarDecl vd, Scope scope, String origin) {
        if (vd.sizeExpr() != null) {
            ExprTyper.expect(vd.sizeExpr(), Type.INT, scope, "El tamaño de '" + vd.name() + "'");
        }
        if (vd.initExpr() != null) {
            ExprTyper.checkAssignable(vd.type(), vd.initExpr(), scope, vd.name(), vd.line());
        }
        // la clave de una cola ordenada se compara: un bool no tiene orden
        if (vd.type() == Type.COLA_ORDENADA && vd.elementTypes().get(0) == Type.BOOLEAN) {
            throw new CompilationException("La clave de la ColaOrdenada '" + vd.name()
                    + "' (su primera componente) tiene que ser int, double o text, no bool",
                    vd.line());
        }
        declare(scope, vd.name(), new Symbol(new VarType(vd.type(), vd.isArray()), false, origin,
                vd.elementTypes()), vd.line());
    }

    private void checkIncDec(Stmt.IncDec inc, Scope scope) {
        Type t = targetType(inc.target(), inc.index(), scope, inc.line());
        if (t != Type.INT && t != Type.DOUBLE) {
            throw new CompilationException("'" + inc.target() + "' es " + t.keyword()
                    + ": ++ y -- se aplican a números", inc.line());
        }
    }

    /**
     * Los dos lados se escriben, y cada uno recibe el valor del otro: tienen que ser del mismo
     * tipo, porque las conversiones automaticas (int a double, numero a text) van en un solo
     * sentido.
     */
    private void checkSwap(Stmt.Swap sw, Scope scope) {
        Type left = targetType(sw.left(), sw.leftIndex(), scope, sw.line());
        Type right = targetType(sw.right(), sw.rightIndex(), scope, sw.line());
        if (left != right) {
            throw new CompilationException("No se puede intercambiar '" + sw.left() + "' ("
                    + left.keyword() + ") con '" + sw.right() + "' (" + right.keyword()
                    + "): ':=:' necesita dos valores del mismo tipo", sw.line());
        }
    }

    private void checkAssign(Stmt.Assign a, Scope scope) {
        Type t = targetType(a.target(), a.index(), scope, a.line());
        String destination = a.index() == null ? a.target() : a.target() + "[...]";
        ExprTyper.checkAssignable(t, a.value(), scope, destination, a.line());
    }

    /**
     * El iterador se declara (o se reutiliza) en un alcance propio del for; en el cuerpo queda
     * congelado: solo lo cambia el paso del for. En la forma de rango la cota es un int que
     * se evalua una vez.
     */
    private void checkFor(Stmt.ForStmt f, Scope outer) {
        Scope inner = outer.child();
        String iterator;
        if (f.init() instanceof VarDecl vd) {
            if (vd.initExpr() != null) {
                ExprTyper.checkAssignable(vd.type(), vd.initExpr(), inner, vd.name(), vd.line());
            }
            Symbol iteratorSymbol =
                    new Symbol(new VarType(vd.type(), false), false, ITERATOR_ORIGIN, null);
            declare(inner, vd.name(), iteratorSymbol, vd.line());
            iterator = vd.name();
        } else {
            checkAssign((Stmt.Assign) f.init(), inner);
            iterator = ((Stmt.Assign) f.init()).target();
        }
        if (f.limit() != null) {
            if (ExprTyper.known(iterator, inner, f.line()).type().base() != Type.INT) {
                throw new CompilationException("El iterador de un for de rango tiene que ser int",
                        f.line());
            }
            ExprTyper.expect(f.limit().initExpr(), Type.INT, inner, "La cota del for");
            inner.declare(f.limit().name(), new Symbol(new VarType(Type.INT, false), true,
                    ITERATOR_ORIGIN, null), f.line());
        }
        ExprTyper.expect(f.condition(), Type.BOOLEAN, inner, "La condición del for");
        checkStmt(f.step(), inner);
        Scope body = inner.child();
        body.freeze(iterator);
        checkBlock(f.body(), body);
    }

    private void checkMonitorCall(Stmt.MonitorCall call, Scope scope) {
        MonitorInfo info = monitors.get(call.monitor());
        if (info == null) {
            throw new CompilationException("Monitor no declarado: " + call.monitor(), call.line());
        }
        if (info.family() && call.index() == null) {
            throw new CompilationException("El monitor " + call.monitor() + " es un arreglo: "
                    + "falta el índice, " + call.monitor() + "[índice]." + call.procedure()
                    + "(...)", call.line());
        }
        if (!info.family() && call.index() != null) {
            throw new CompilationException("El monitor " + call.monitor() + " no es un arreglo: "
                    + "se llama sin índice", call.line());
        }
        if (call.index() != null) {
            ExprTyper.expect(call.index(), Type.INT, scope, "El índice del monitor");
        }
        if (scope.inProcedure && call.monitor().equals(scope.monitor)) {
            throw new CompilationException("Un procedure de " + call.monitor()
                    + " no puede llamar a " + call.monitor() + "." + call.procedure()
                    + ": el proceso ya está dentro del monitor", call.line());
        }
        ProcedureDef pd = info.procedures().get(call.procedure());
        if (pd == null) {
            throw new CompilationException("El monitor " + call.monitor()
                    + " no tiene un procedure '" + call.procedure() + "'", call.line());
        }
        if (pd.params().size() != call.args().size()) {
            throw new CompilationException("La llamada a " + call.monitor() + "." + call.procedure()
                    + " espera " + pd.params().size() + " argumento(s) y recibió "
                    + call.args().size(), call.line());
        }
        for (int i = 0; i < pd.params().size(); i++) {
            Param param = pd.params().get(i);
            Expr arg = call.args().get(i);
            if (param.isOutput()) {
                checkOutArgument(param, arg, scope, call.line());
            } else {
                ExprTyper.checkAssignable(param.type(), arg, scope, param.name(), call.line());
            }
        }
    }

    /**
     * El argumento de un parametro {@code out}: una variable o un elemento de arreglo que se
     * pueda escribir y que pueda guardar el tipo del parametro.
     */
    private void checkOutArgument(Param param, Expr arg, Scope scope, int line) {
        if (!(arg instanceof Expr.VarRef) && !(arg instanceof Expr.ArrayAccess)) {
            throw new CompilationException("El argumento para el parámetro '" + param.name()
                    + "' (out) debe ser una variable o un elemento de arreglo", line);
        }
        Type argType = ExprTyper.typeOf(arg, scope);
        String name = arg instanceof Expr.VarRef v ? v.name() : ((Expr.ArrayAccess) arg).name();
        checkWritable(name, scope, line);
        if (!ExprTyper.assignable(argType, param.type())) {
            throw new CompilationException("El parámetro out '" + param.name() + "' es "
                    + param.type().keyword() + " y no se puede guardar en '" + name
                    + "', que es " + argType.keyword(), line);
        }
    }

    private void checkCondOp(Stmt.CondOp co, Scope scope) {
        if (!scope.inProcedure) {
            throw new CompilationException("wait/signal/signal_all solo pueden usarse dentro de un "
                    + "procedure de monitor", co.line());
        }
        Boolean isArray = monitors.get(scope.monitor).conds().get(co.cond());
        if (isArray == null) {
            throw new CompilationException("Variable condición no declarada: " + co.cond(),
                    co.line());
        }
        if (isArray && co.index() == null) {
            throw new CompilationException("La cond '" + co.cond()
                    + "' es un arreglo: falta el índice",
                    co.line());
        }
        if (!isArray && co.index() != null) {
            throw new CompilationException("La cond '" + co.cond() + "' no es un arreglo",
                    co.line());
        }
        if (co.index() != null) ExprTyper.expect(co.index(), Type.INT, scope,
                "El índice de la cond");
    }

    // ---------------------------------------------------------------- nombres

    /** Declara una variable controlando que no tape a otra ni a una cond del monitor. */
    private void declare(Scope scope, String name, Symbol sym, int line) {
        if (scope.monitor != null && monitors.get(scope.monitor).conds().containsKey(name)) {
            throw new CompilationException("Ya existe una variable condición llamada '" + name
                    + "': elegí otro nombre", line);
        }
        scope.declare(name, sym, line);
    }

    /** Tipo del destino de una asignacion, ++/-- o pop, controlando que se pueda escribir. */
    private Type targetType(String name, Expr index, Scope scope, int line) {
        Symbol sym = checkWritable(name, scope, line);
        VarType t = sym.type();
        if (index != null) {
            if (!t.isArray()) throw new CompilationException("'" + name + "' no es un arreglo",
                    line);
            ExprTyper.expect(index, Type.INT, scope, "El índice de '" + name + "'");
            return t.base();
        }
        if (t.isArray()) {
            throw new CompilationException("No se puede asignar el arreglo '" + name
                    + "' completo: hay que indicar el índice, " + name + "[índice]", line);
        }
        if (t.isQueue()) {
            throw new CompilationException("No se puede asignar la cola '" + name
                    + "': se usa con push y pop", line);
        }
        return t.base();
    }

    private Symbol checkWritable(String name, Scope scope, int line) {
        Symbol sym = ExprTyper.known(name, scope, line);
        if (sym.readOnly()) {
            throw new CompilationException("No se puede asignar a '" + name
                    + "' (es constante, parámetro in o iterador)", line);
        }
        if (scope.isFrozen(name)) {
            throw new CompilationException("No se puede modificar el iterador '" + name
                    + "' dentro del for: lo cambia solo el paso del for", line);
        }
        return sym;
    }

    private boolean containsMonitorInteraction(Stmt s) {
        Deque<Stmt> stack = new ArrayDeque<>();
        stack.push(s);
        while (!stack.isEmpty()) {
            switch (stack.pop()) {
                case Stmt.MonitorCall ignored -> {
                    return true;
                }
                case Stmt.CondOp ignored -> {
                    return true;
                }
                case Stmt.Delay ignored -> {
                    return true;
                }
                case Stmt.Block b -> b.statements().forEach(stack::push);
                case Stmt.IfStmt iff -> {
                    stack.push(iff.thenBranch());
                    if (iff.elseBranch() != null) stack.push(iff.elseBranch());
                }
                case Stmt.WhileStmt w -> stack.push(w.body());
                case Stmt.ForStmt f -> {
                    stack.push(f.body());
                    stack.push(f.step());
                }
                case Stmt.Assign ignored -> { }
                case Stmt.Swap ignored -> { }
                case Stmt.IncDec ignored -> { }
                case Stmt.QueuePush ignored -> { }
                case Stmt.QueuePop ignored -> { }
                case Stmt.Write ignored -> { }
                case Stmt.Skip ignored -> { }
                case VarDecl ignored -> { }
            }
        }
        return false;
    }
}
