package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.lang.parser.ast.Stmt;

import java.util.ArrayDeque;
import java.util.Deque;

/** Proceso (hilo) de la simulacion. */
public final class Process {

    public enum State { READY, RUNNING, BLOCKED, TERMINATED }

    public enum BlockReason {
        /** Espera para entrar a un monitor ocupado (cola de entrada). */
        MONITOR_ENTRY,
        /** Demorado en la cola de una variable condicion tras hacer wait. */
        COND_WAIT,
        /** Demorado por un delay, hasta que pase el tiempo indicado. */
        DELAY
    }

    /** Id de los procesos de sistema, que no son del alumno y no figuran en los eventos. */
    private static final int SYSTEM_ID = -1;
    /** Gris neutro: un proceso de sistema no compite por los colores de los del alumno. */
    private static final String SYSTEM_COLOR = "#888888";

    private final int id;
    private final String name;
    private final String color;

    private State state = State.READY;
    private BlockReason blockReason;
    /** Nombre del monitor ("Buffer") o de la cond ("Buffer.C") en que esta demorado. */
    private String blockedOn;

    private final Deque<Activation> callStack = new ArrayDeque<>();

    private String errorMessage;

    /** Hora (en ms del reloj de la simulacion) en que termina su delay; -1 si no esta demorado. */
    private long delayEndsAt = -1;

    public Process(int id, String name, String color) {
        this.id = id;
        this.name = name;
        this.color = color;
    }

    /** Un proceso de sistema, como el que corre el codigo de inicializacion de un monitor. */
    public static Process system(String name) {
        return new Process(SYSTEM_ID, name, SYSTEM_COLOR);
    }

    /** true si no es un proceso del alumno: no aparece en los eventos ni en el snapshot. */
    public boolean isSystem() { return id < 0; }

    public int id() { return id; }
    public String name() { return name; }
    public String color() { return color; }

    public State state() { return state; }
    public boolean isReady() { return state == State.READY; }
    public void setState(State s) { this.state = s; }

    public BlockReason blockReason() { return blockReason; }
    public String blockedOn() { return blockedOn; }

    public void block(BlockReason reason, String on) {
        this.state = State.BLOCKED;
        this.blockReason = reason;
        this.blockedOn = on;
    }

    public void unblock() {
        this.state = State.READY;
        this.blockReason = null;
        this.blockedOn = null;
        this.delayEndsAt = -1;
    }

    /** Demora el proceso hasta {@code endsAt} (ms del reloj de la simulacion). */
    public void delayUntil(long endsAt) {
        block(BlockReason.DELAY, null);
        this.delayEndsAt = endsAt;
    }

    public long delayEndsAt() { return delayEndsAt; }

    public boolean isDelayed() {
        return state == State.BLOCKED && blockReason == BlockReason.DELAY;
    }

    public Deque<Activation> callStack() { return callStack; }

    public Activation current() { return callStack.peekFirst(); }

    public void push(Activation a) { callStack.addFirst(a); }

    public Activation pop() { return callStack.pollFirst(); }

    public boolean isFinished() {
        return state == State.TERMINATED;
    }

    public String errorMessage() { return errorMessage; }

    public void fail(String message) {
        this.errorMessage = message;
        this.state = State.TERMINATED;
    }

    /** Ubicacion actual para la UI: {@code Monitor.procedure} o null si esta en su cuerpo. */
    public String currentLocation() {
        Activation a = current();
        if (a != null && a.isEntering()) a = callStack.stream().skip(1).findFirst().orElse(null);
        if (a == null || !a.isProcedure()) return null;
        return a.monitorName() + "." + a.procedureName();
    }

    /**
     * Linea en la que la UI debe mostrar al proceso. Una activacion recien creada
     * (un procedure al que se acaba de entrar, o un proceso que todavia no ejecuto
     * nada) no tiene linea propia: en ese caso se usa la de su proxima sentencia
     * pendiente y, si tampoco la hay, la del marco que la llamo. Asi un proceso vivo
     * nunca queda sin linea y no desaparece del editor.
     */
    public int currentLine() {
        for (Activation a : callStack) {
            // un procedure al que todavia no entro se muestra en la linea de la llamada
            if (a.isEntering()) continue;
            if (a.currentLine() > 0) return a.currentLine();
            Stmt next = a.pending().peekFirst();
            if (next != null && next.line() > 0) return next.line();
        }
        return -1;
    }
}
