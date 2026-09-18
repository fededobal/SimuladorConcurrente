package ar.edu.unlp.info.simulador.lang.parser.ast;

import java.util.List;

/**
 * Definicion de un monitor.
 *
 * @param name           nombre del monitor
 * @param permanentVars  variables permanentes (estado del recurso)
 * @param conds          variables condicion
 * @param initStmts      sentencias de inicializacion (se ejecutan una vez, en orden)
 * @param procedures     operaciones que ofrece
 * @param line           linea
 */
public record MonitorDef(String name,
                         List<VarDecl> permanentVars,
                         List<CondDecl> conds,
                         List<Stmt> initStmts,
                         List<ProcedureDef> procedures,
                         int line) {

    public ProcedureDef procedure(String procName) {
        return procedures.stream().filter(p -> p.name().equals(procName)).findFirst().orElse(null);
    }

    public CondDecl cond(String condName) {
        return conds.stream().filter(c -> c.name().equals(condName)).findFirst().orElse(null);
    }
}
