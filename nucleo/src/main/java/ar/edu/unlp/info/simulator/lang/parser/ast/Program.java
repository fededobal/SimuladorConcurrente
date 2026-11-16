package ar.edu.unlp.info.simulator.lang.parser.ast;

import java.util.List;

/** Raiz del AST: un programa completo. */
public record Program(List<MonitorDef> monitors,
                      List<ProcessDef> processes) {

    public MonitorDef monitor(String name) {
        return monitors.stream().filter(m -> m.name().equals(name)).findFirst().orElse(null);
    }
}
