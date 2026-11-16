package ar.edu.unlp.info.simulator.lang.parser.ast;

/**
 * Declaracion de una variable condicion: {@code cond cv;} o {@code cond turno[N];}.
 */
public record CondDecl(String name, boolean isArray, Expr sizeExpr, int line) { }
