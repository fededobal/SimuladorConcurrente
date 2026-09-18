package ar.edu.unlp.info.simulador.vm;

/**
 * Evento registrado durante la ejecucion. Lleva un snapshot completo del estado justo
 * despues del evento.
 *
 * @param id           identificador unico
 * @param instant      numero de instante (paso global)
 * @param processId    proceso involucrado, o null si es un evento del sistema
 * @param processColor color del proceso, o null
 * @param kind         categoria del evento (ENTER, RETURN, ASSIGN, WAIT, SIGNAL, BLOCKED, ...)
 * @param resource     recurso afectado (monitor, cond, variable), o "" si no aplica
 * @param message      mensaje legible para el historial
 * @param snapshot     estado luego del evento
 */
public record LogEntry(String id,
                       int instant,
                       Integer processId,
                       String processColor,
                       String kind,
                       String resource,
                       String message,
                       Snapshot snapshot) { }
