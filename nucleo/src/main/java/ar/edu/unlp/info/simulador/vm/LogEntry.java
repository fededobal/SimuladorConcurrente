package ar.edu.unlp.info.simulador.vm;

/**
 * Evento registrado durante la ejecucion. No lleva el estado: guardar un snapshot completo
 * por evento hacia crecer la memoria sin tope (bug B6); el estado se pide aparte con
 * {@link VirtualMachine#snapshot()}.
 *
 * @param id           identificador unico dentro de la simulacion ({@code e0}, {@code e1}, ...)
 * @param instant      numero de instante (paso global)
 * @param processId    proceso involucrado, o null si es un evento del sistema
 * @param processColor color del proceso, o null
 * @param kind         nombre del {@link EventKind} del evento
 * @param resource     recurso afectado (monitor, cond, variable), o "" si no aplica
 * @param message      mensaje legible para el historial
 */
public record LogEntry(String id,
                       int instant,
                       Integer processId,
                       String processColor,
                       String kind,
                       String resource,
                       String message) { }
