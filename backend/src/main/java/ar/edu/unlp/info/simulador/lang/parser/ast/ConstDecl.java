package ar.edu.unlp.info.simulador.lang.parser.ast;

/**
 * Constante global (declaracion escalar fuera de todo monitor/proceso). Solo lectura:
 * sirve para tamanos de arreglo y rangos de familias de procesos.
 */
public record ConstDecl(String name, Type type, Expr value, int line) { }
