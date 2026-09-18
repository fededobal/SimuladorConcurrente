package ar.edu.unlp.info.simulador.lang;

import ar.edu.unlp.info.simulador.lang.parser.ast.*;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Chequeos semanticos sobre el AST: nombres declarados, alcance (los locales del proceso no
 * se ven dentro de un monitor), existencia de monitores/procedures/cond, aridad de las
 * llamadas, parametros {@code out} ligados a lvalues, {@code wait}/{@code signal} solo dentro
 * de procedures, y prohibicion de asignar a constantes.
 */
public final class SemanticValidator {

    private final Program program;
    private final Map<String, MonitorInfo> monitors = new HashMap<>();

    private record MonitorInfo(Set<String> vars,
                               Map<String, Boolean> conds,
                               Map<String, ProcedureDef> procedures) { }

    public SemanticValidator(Program program) {
        this.program = program;
    }

    public void validate() {
        if (program.processes().isEmpty()) {
            throw new CompilationException("El programa debe tener al menos un proceso");
        }
        collectTopLevel();
        for (MonitorDef m : program.monitors()) {
            validateMonitor(m);
        }
        for (ProcessDef p : program.processes()) {
            validateProcess(p);
        }
    }

    // ---------------------------------------------------------------- recoleccion

    private void collectTopLevel() {
        Set<String> topLevel = new HashSet<>();
        for (MonitorDef m : program.monitors()) {
            if (!topLevel.add(m.name())) {
                throw new CompilationException("Ya existe un monitor o un process llamado " + m.name(), m.line());
            }
            Set<String> vars = new HashSet<>();
            Map<String, Boolean> conds = new HashMap<>();
            Map<String, ProcedureDef> procs = new HashMap<>();
            for (VarDecl v : m.permanentVars()) {
                if (!vars.add(v.name())) {
                    throw new CompilationException("Variable permanente duplicada '" + v.name()
                            + "' en el monitor " + m.name(), v.line());
                }
            }
            for (CondDecl c : m.conds()) {
                if (vars.contains(c.name()) || conds.put(c.name(), c.isArray()) != null) {
                    throw new CompilationException("Nombre de cond duplicado '" + c.name()
                            + "' en el monitor " + m.name(), c.line());
                }
            }
            for (ProcedureDef pr : m.procedures()) {
                if (procs.put(pr.name(), pr) != null) {
                    throw new CompilationException("Procedure duplicado '" + pr.name()
                            + "' en el monitor " + m.name(), pr.line());
                }
                Set<String> pnames = new HashSet<>();
                for (Param param : pr.params()) {
                    if (!pnames.add(param.name())) {
                        throw new CompilationException("Parametro duplicado '" + param.name()
                                + "' en " + m.name() + "." + pr.name(), param.line());
                    }
                }
            }
            monitors.put(m.name(), new MonitorInfo(vars, conds, procs));
        }
        for (ProcessDef p : program.processes()) {
            if (!topLevel.add(p.name())) {
                throw new CompilationException("Ya existe un monitor o un process llamado " + p.name(), p.line());
            }
        }
    }

    // ---------------------------------------------------------------- monitor

    private void validateMonitor(MonitorDef m) {
        MonitorInfo info = monitors.get(m.name());

        Scope initScope = new Scope(null, m.name());
        initScope.assignable.addAll(info.vars());
        for (String cond : info.conds().keySet()) initScope.conds.add(cond);
        for (Stmt s : m.initStmts()) {
            if (containsMonitorInteraction(s)) {
                throw new CompilationException("El codigo de inicializacion del monitor " + m.name()
                        + " no puede llamar a monitores ni usar wait/signal", s.line());
            }
            checkStmt(s, initScope);
        }

        for (ProcedureDef pr : m.procedures()) {
            Scope scope = new Scope(m.name(), m.name());
            scope.assignable.addAll(info.vars());
            for (String cond : info.conds().keySet()) scope.conds.add(cond);
            for (Param param : pr.params()) {
                if (param.isOutput()) {
                    scope.assignable.add(param.name());
                } else {
                    scope.readOnly.add(param.name());
                }
            }
            checkBlock(pr.body(), scope);
        }
    }

    private void validateProcess(ProcessDef p) {
        Scope scope = new Scope(null, null);
        if (p.isFamily()) {
            scope.readOnly.add(p.quant().iterator());
            checkExpr(p.quant().from(), scope);
            checkExpr(p.quant().to(), scope);
        }
        checkBlock(p.body(), scope);
    }

    // ---------------------------------------------------------------- scope

    /** Alcance mutable durante el recorrido de un bloque. */
    private static final class Scope {
        final String monitorName;   // monitor cuyas permanentes/cond se ven; null en procesos
        final String selfMonitor;   // monitor propio (para cond); null en procesos e init sin monitor
        final Set<String> readOnly = new HashSet<>();
        final Set<String> assignable = new HashSet<>();
        final Set<String> conds = new HashSet<>();

        Scope(String monitorName, String selfMonitor) {
            this.monitorName = monitorName;
            this.selfMonitor = selfMonitor;
        }

        Scope child() {
            Scope s = new Scope(monitorName, selfMonitor);
            s.readOnly.addAll(readOnly);
            s.assignable.addAll(assignable);
            s.conds.addAll(conds);
            return s;
        }

        boolean known(String name) {
            return readOnly.contains(name) || assignable.contains(name);
        }
    }

    private void checkBlock(Stmt.Block block, Scope parent) {
        Scope scope = parent.child();
        for (Stmt s : block.statements()) {
            checkStmt(s, scope);
        }
    }

    private void checkStmt(Stmt s, Scope scope) {
        switch (s) {
            case Stmt.Block b -> checkBlock(b, scope);
            case VarDecl vd -> {
                if (vd.sizeExpr() != null) checkExpr(vd.sizeExpr(), scope);
                if (vd.initExpr() != null) checkExpr(vd.initExpr(), scope);
                scope.assignable.add(vd.name());
            }
            case Stmt.Assign a -> {
                if (a.index() != null) checkExpr(a.index(), scope);
                checkExpr(a.value(), scope);
                checkAssignable(a.target(), scope, a.line());
            }
            case Stmt.IncDec inc -> {
                if (inc.index() != null) checkExpr(inc.index(), scope);
                checkAssignable(inc.target(), scope, inc.line());
            }
            case Stmt.Skip ignored -> { }
            case Stmt.IfStmt iff -> {
                checkExpr(iff.condition(), scope);
                checkBlock(iff.thenBranch(), scope);
                if (iff.elseBranch() != null) checkBlock(iff.elseBranch(), scope);
            }
            case Stmt.WhileStmt w -> {
                checkExpr(w.condition(), scope);
                checkBlock(w.body(), scope);
            }
            case Stmt.ForStmt f -> {
                Scope inner = scope.child();
                if (f.init() instanceof VarDecl vd) {
                    if (vd.initExpr() != null) checkExpr(vd.initExpr(), inner);
                    inner.assignable.add(vd.name());
                } else {
                    checkStmt(f.init(), inner);
                }
                checkExpr(f.condition(), inner);
                checkStmt(f.step(), inner);
                checkBlock(f.body(), inner);
            }
            case Stmt.MonitorCall call -> checkMonitorCall(call, scope);
            case Stmt.CondOp co -> checkCondOp(co, scope);
            case Stmt.QueuePush qp -> {
                requireKnown(qp.queue(), scope, qp.line());
                for (Expr e : qp.elements()) checkExpr(e, scope);
            }
            case Stmt.QueuePop qp -> {
                requireKnown(qp.queue(), scope, qp.line());
                for (String t : qp.targets()) checkAssignable(t, scope, qp.line());
            }
        }
    }

    private void checkMonitorCall(Stmt.MonitorCall call, Scope scope) {
        MonitorInfo info = monitors.get(call.monitor());
        if (info == null) {
            throw new CompilationException("Monitor no declarado: " + call.monitor(), call.line());
        }
        ProcedureDef pd = info.procedures().get(call.procedure());
        if (pd == null) {
            throw new CompilationException("El monitor " + call.monitor()
                    + " no tiene un procedure '" + call.procedure() + "'", call.line());
        }
        if (pd.params().size() != call.args().size()) {
            throw new CompilationException("La llamada a " + call.monitor() + "." + call.procedure()
                    + " espera " + pd.params().size() + " argumento(s) y recibio "
                    + call.args().size(), call.line());
        }
        for (int i = 0; i < pd.params().size(); i++) {
            Param param = pd.params().get(i);
            Expr arg = call.args().get(i);
            checkExpr(arg, scope);
            if (param.isOutput()) {
                String name = lvalueName(arg);
                if (name == null) {
                    throw new CompilationException("El argumento para el parametro '" + param.name()
                            + "' (" + param.mode().name().toLowerCase() + ") debe ser una variable "
                            + "o un elemento de arreglo", call.line());
                }
                if (!scope.assignable.contains(name)) {
                    throw new CompilationException("No se puede pasar '" + name + "' a un parametro "
                            + param.mode().name().toLowerCase() + " porque no es asignable", call.line());
                }
            }
        }
    }

    private void checkCondOp(Stmt.CondOp co, Scope scope) {
        if (scope.selfMonitor == null || scope.monitorName == null) {
            throw new CompilationException("wait/signal/signal_all solo pueden usarse dentro de un "
                    + "procedure de monitor", co.line());
        }
        Map<String, Boolean> conds = monitors.get(scope.selfMonitor).conds();
        Boolean isArray = conds.get(co.cond());
        if (isArray == null) {
            throw new CompilationException("Variable condicion no declarada: " + co.cond(), co.line());
        }
        if (isArray && co.index() == null) {
            throw new CompilationException("La cond '" + co.cond() + "' es un arreglo: falta el indice",
                    co.line());
        }
        if (!isArray && co.index() != null) {
            throw new CompilationException("La cond '" + co.cond() + "' no es un arreglo", co.line());
        }
        if (co.index() != null) checkExpr(co.index(), scope);
    }

    // ---------------------------------------------------------------- expresiones

    private void checkExpr(Expr e, Scope scope) {
        switch (e) {
            case Expr.IntLit ignored -> { }
            case Expr.DoubleLit ignored -> { }
            case Expr.BoolLit ignored -> { }
            case Expr.TextLit ignored -> { }
            case Expr.VarRef v -> requireKnown(v.name(), scope, v.line());
            case Expr.ArrayAccess a -> {
                requireKnown(a.name(), scope, a.line());
                checkExpr(a.index(), scope);
            }
            case Expr.EmptyQueue q -> requireKnown(q.queue(), scope, q.line());
            case Expr.Unary u -> checkExpr(u.operand(), scope);
            case Expr.Binary b -> {
                checkExpr(b.left(), scope);
                checkExpr(b.right(), scope);
            }
        }
    }

    private void requireKnown(String name, Scope scope, int line) {
        if (!scope.known(name)) {
            throw new CompilationException("Nombre no declarado en este alcance: " + name, line);
        }
    }

    private void checkAssignable(String name, Scope scope, int line) {
        if (scope.assignable.contains(name)) return;
        if (scope.readOnly.contains(name)) {
            throw new CompilationException("No se puede asignar a '" + name
                    + "' (es constante, parametro in o iterador)", line);
        }
        throw new CompilationException("Nombre no declarado en este alcance: " + name, line);
    }

    private static String lvalueName(Expr arg) {
        if (arg instanceof Expr.VarRef v) return v.name();
        if (arg instanceof Expr.ArrayAccess a) return a.name();
        return null;
    }

    private boolean containsMonitorInteraction(Stmt s) {
        Deque<Stmt> stack = new ArrayDeque<>();
        stack.push(s);
        while (!stack.isEmpty()) {
            Stmt cur = stack.pop();
            if (cur instanceof Stmt.MonitorCall || cur instanceof Stmt.CondOp) return true;
            switch (cur) {
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
                default -> { }
            }
        }
        return false;
    }
}
