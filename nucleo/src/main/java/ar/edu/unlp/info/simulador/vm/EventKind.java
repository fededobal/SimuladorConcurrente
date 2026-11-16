package ar.edu.unlp.info.simulador.vm;

/**
 * Tipo de un evento del log. Viaja al navegador por su nombre ({@link LogEntry#kind()}): la
 * interfaz los usa para colorear el historial, asi que renombrar uno cambia lo que ve el
 * alumno.
 */
public enum EventKind {
    /** Entra a un procedure con el monitor libre. */
    ENTER,
    /** Vuelve a tomar el monitor despues de un wait. */
    REENTER,
    /** Queda en la cola de entrada de un monitor ocupado. */
    BLOCKED,
    /** Retorna de un procedure y libera el monitor. */
    RETURN,
    /** El proceso termina su cuerpo. */
    TERMINATED,
    /** Error de ejecucion: el proceso termina. */
    ERROR,
    /** Suelta un monitor al terminar con error. */
    RELEASE,
    /** Espera activa: muchas sentencias estructurales sin ninguna observable. */
    SPIN,
    SKIP,
    DELAY,
    /** Declaracion de una variable local. */
    DECL,
    /** Asignacion, {@code ++} o {@code --}. */
    ASSIGN,
    WAIT,
    SIGNAL,
    SIGNAL_ALL,
    WRITE,
    PUSH,
    POP,
    /** Ningun proceso puede avanzar; es un evento del sistema, sin proceso. */
    DEADLOCK
}
