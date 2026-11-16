package ar.edu.unlp.info.simulator.lang;

import ar.edu.unlp.info.simulator.lang.parser.ast.CondDecl;
import ar.edu.unlp.info.simulator.lang.parser.ast.MonitorDef;
import ar.edu.unlp.info.simulator.lang.parser.ast.Param;
import ar.edu.unlp.info.simulator.lang.parser.ast.ProcedureDef;
import ar.edu.unlp.info.simulator.lang.parser.ast.ProcessDef;
import ar.edu.unlp.info.simulator.lang.parser.ast.Program;
import ar.edu.unlp.info.simulator.lang.parser.ast.VarDecl;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Primera pasada del validador: junta los nombres de alto nivel y lo que declara cada monitor,
 * y rechaza los repetidos antes de mirar el codigo. Lo que devuelve es lo que el validador
 * necesita para controlar llamadas y operaciones sobre cond.
 */
final class NameCollector {

    private NameCollector() { }

    /**
     * Los monitores del programa, por nombre. Controla, en este orden, que no se repitan los
     * nombres de monitores y procesos, ni dentro de cada monitor los de variables permanentes,
     * cond, procedures y parametros.
     */
    static Map<String, MonitorInfo> collect(Program program) {
        Map<String, MonitorInfo> monitors = new HashMap<>();
        Set<String> topLevel = new HashSet<>();
        for (MonitorDef m : program.monitors()) {
            declareTopLevel(topLevel, m.name(), m.line());
            monitors.put(m.name(), collectMonitor(m));
        }
        for (ProcessDef p : program.processes()) {
            declareTopLevel(topLevel, p.name(), p.line());
        }
        return monitors;
    }

    /** Monitores y procesos comparten un solo espacio de nombres. */
    private static void declareTopLevel(Set<String> topLevel, String name, int line) {
        if (!topLevel.add(name)) {
            throw new CompilationException("Ya existe un monitor o un process llamado " + name,
                    line);
        }
    }

    /** Lo que se sabe de un monitor antes de validar su codigo, sin nombres repetidos. */
    private static MonitorInfo collectMonitor(MonitorDef m) {
        Map<String, VarDecl> vars = collectPermanentVars(m);
        Map<String, Boolean> conds = collectConds(m, vars);
        Map<String, ProcedureDef> procs = collectProcedures(m);
        return new MonitorInfo(conds, procs, m.isFamily());
    }

    private static Map<String, VarDecl> collectPermanentVars(MonitorDef m) {
        Map<String, VarDecl> vars = new HashMap<>();
        for (VarDecl v : m.permanentVars()) {
            if (vars.put(v.name(), v) != null) {
                throw new CompilationException("Variable permanente duplicada '" + v.name()
                        + "' en el monitor " + m.name(), v.line());
            }
        }
        return vars;
    }

    /** Las cond del monitor: nombre -> si es un arreglo. */
    private static Map<String, Boolean> collectConds(MonitorDef m, Map<String, VarDecl> vars) {
        Map<String, Boolean> conds = new HashMap<>();
        for (CondDecl c : m.conds()) {
            // La variable y la cond comparten el espacio de nombres del monitor. El AST las
            // guarda por separado: la linea dice cual se declaro primero, y el error se
            // informa en la segunda, que es la que hay que renombrar.
            VarDecl v = vars.get(c.name());
            if (v != null && v.line() <= c.line()) {
                throw new CompilationException("Ya existe una variable permanente llamada '"
                        + c.name() + "' en el monitor " + m.name()
                        + ": la cond necesita otro nombre", c.line());
            }
            if (v != null) {
                throw new CompilationException("Ya existe una variable condición llamada '"
                        + c.name() + "' en el monitor " + m.name()
                        + ": la variable necesita otro nombre", v.line());
            }
            if (conds.put(c.name(), c.isArray()) != null) {
                throw new CompilationException("Nombre de cond duplicado '" + c.name()
                        + "' en el monitor " + m.name(), c.line());
            }
        }
        return conds;
    }

    private static Map<String, ProcedureDef> collectProcedures(MonitorDef m) {
        Map<String, ProcedureDef> procs = new HashMap<>();
        for (ProcedureDef pr : m.procedures()) {
            if (procs.put(pr.name(), pr) != null) {
                throw new CompilationException("Procedure duplicado '" + pr.name()
                        + "' en el monitor " + m.name(), pr.line());
            }
            Set<String> pnames = new HashSet<>();
            for (Param param : pr.params()) {
                if (!pnames.add(param.name())) {
                    throw new CompilationException("Parámetro duplicado '" + param.name()
                            + "' en " + m.name() + "." + pr.name(), param.line());
                }
            }
        }
        return procs;
    }
}
