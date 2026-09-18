package ar.edu.unlp.info.simulador.lang.parser.ast;

/**
 * Declaracion de una variable: permanente de un monitor o local de un procedure/proceso.
 *
 * @param name      nombre
 * @param type      tipo
 * @param isArray   true si es un arreglo
 * @param sizeExpr  expresion de tamano (constante) si es arreglo, si no null
 * @param initExpr  expresion de inicializacion; para arreglos es el valor de relleno; puede ser null
 * @param line      linea
 */
public record VarDecl(String name, Type type, boolean isArray, Expr sizeExpr, Expr initExpr, int line)
        implements Stmt {

    public static VarDecl scalar(String name, Type type, Expr initExpr, int line) {
        return new VarDecl(name, type, false, null, initExpr, line);
    }
}
