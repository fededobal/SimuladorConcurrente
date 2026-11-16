package ar.edu.unlp.info.simulator.lang.parser.ast;

import java.util.List;

/**
 * Definicion de un monitor.
 *
 * @param name           nombre del monitor (de la familia, si es un arreglo de monitores)
 * @param quant          cuantificador {@code [id: a..b]} si es un arreglo de monitores, si no null
 * @param permanentVars  variables permanentes (estado del recurso)
 * @param conds          variables condicion
 * @param initStmts      sentencias de inicializacion (se ejecutan una vez, en orden)
 * @param procedures     operaciones que ofrece
 * @param line           linea
 */
public record MonitorDef(String name,
                         ProcessDef.QuantDef quant,
                         List<VarDecl> permanentVars,
                         List<CondDecl> conds,
                         List<Stmt> initStmts,
                         List<ProcedureDef> procedures,
                         int line) {

    /** true si es un arreglo de monitores: cada indice es un monitor con su propio estado. */
    public boolean isFamily() {
        return quant != null;
    }

    public ProcedureDef procedure(String procName) {
        return procedures.stream().filter(p -> p.name().equals(procName)).findFirst().orElse(null);
    }

    public CondDecl cond(String condName) {
        return conds.stream().filter(c -> c.name().equals(condName)).findFirst().orElse(null);
    }
}
