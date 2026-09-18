package ar.edu.unlp.info.simulador.lang.parser.ast;

/** Parametro formal de un procedure. */
public record Param(String name, Type type, ParamMode mode, int line) {

    public boolean isOutput() {
        return mode == ParamMode.OUT;
    }

    public boolean isInput() {
        return mode == ParamMode.IN;
    }
}
