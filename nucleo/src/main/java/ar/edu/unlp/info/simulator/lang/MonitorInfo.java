package ar.edu.unlp.info.simulator.lang;

import ar.edu.unlp.info.simulator.lang.parser.ast.ProcedureDef;

import java.util.Map;

/**
 * Lo que el validador sabe de un monitor al controlar el codigo que lo usa.
 *
 * @param conds      las cond declaradas: nombre -> si es un arreglo
 * @param procedures los procedures, por nombre
 * @param family     true si es un arreglo de monitores
 */
record MonitorInfo(Map<String, Boolean> conds, Map<String, ProcedureDef> procedures,
                   boolean family) { }
