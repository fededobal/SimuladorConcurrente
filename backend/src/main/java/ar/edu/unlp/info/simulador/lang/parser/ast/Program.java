package ar.edu.unlp.info.simulador.lang.parser.ast;

import java.util.List;

/** Raiz del AST: un programa completo. */
public record Program(List<ConstDecl> constants,
                      List<MonitorDef> monitors,
                      List<ProcessDef> processes) {

    public MonitorDef monitor(String name) {
        return monitors.stream().filter(m -> m.name().equals(name)).findFirst().orElse(null);
    }
}
