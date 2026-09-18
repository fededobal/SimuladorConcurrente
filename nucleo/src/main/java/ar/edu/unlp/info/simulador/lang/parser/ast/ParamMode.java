package ar.edu.unlp.info.simulador.lang.parser.ast;

/** Modo de paso de un parametro de procedure. */
public enum ParamMode {
    /** Solo lectura (default). */
    IN,
    /** Se copia al argumento del llamador al retornar. */
    OUT
}
