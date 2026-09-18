package ar.edu.unlp.info.simulador.api.dto;

import ar.edu.unlp.info.simulador.vm.LogEntry;

import java.util.List;

/** DTOs de la API REST del simulador. */
public final class ApiDtos {

    private ApiDtos() { }

    /** Cuerpo de {@code POST /api/simulations}. */
    public record CompileRequest(String code, Long seed) { }

    /** Cuerpo de {@code POST /api/simulations/{id}/step}. */
    public record StepRequest(Integer chosenProcessId, String policy) { }

    /** Respuesta al crear/reiniciar una simulacion. */
    public record SimulationCreated(String id,
                                    long seed,
                                    LogEntry initial,
                                    boolean finished,
                                    boolean deadlock) { }

    /** Respuesta de un paso: los eventos generados en este instante. */
    public record StepResponse(List<LogEntry> entries,
                               boolean finished,
                               boolean deadlock,
                               int instant) { }

    /** Estado completo (para reconexion). */
    public record SimulationState(List<LogEntry> log,
                                  boolean finished,
                                  boolean deadlock,
                                  int instant) { }

    /** Error devuelto con estado 4xx. */
    public record ApiError(String error, Integer line) { }
}
