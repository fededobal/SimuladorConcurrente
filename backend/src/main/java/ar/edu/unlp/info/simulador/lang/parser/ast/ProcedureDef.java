package ar.edu.unlp.info.simulador.lang.parser.ast;

import java.util.List;

/** Procedure de un monitor. */
public record ProcedureDef(String name, List<Param> params, Stmt.Block body, int line) { }
