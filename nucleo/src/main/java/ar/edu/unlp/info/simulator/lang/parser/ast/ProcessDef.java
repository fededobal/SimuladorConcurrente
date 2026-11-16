package ar.edu.unlp.info.simulator.lang.parser.ast;

/**
 * Definicion de un proceso o de una familia de procesos.
 *
 * @param name  nombre base
 * @param quant cuantificador {@code [i: a..b]} si es una familia, si no null
 * @param body  cuerpo
 * @param line  linea
 */
public record ProcessDef(String name, QuantDef quant, Stmt.Block body, int line) {

    public boolean isFamily() {
        return quant != null;
    }

    /** @param iterator nombre del iterador local, @param from y @param to expresiones constantes */
    public record QuantDef(String iterator, Expr from, Expr to) { }
}
