package ar.edu.unlp.info.simulador.vm;

import java.util.ArrayDeque;
import java.util.Deque;

/** Proceso (hilo) de la simulacion. */
public final class Process {

    public enum State { READY, RUNNING, BLOCKED, TERMINATED }

    public enum BlockReason {
        /** Espera para entrar a un monitor ocupado (cola de entrada). */
        MONITOR_ENTRY,
        /** Demorado en la cola de una variable condicion tras hacer wait. */
        COND_WAIT
    }

    private final int id;
    private final String name;
    private final String color;

    private State state = State.READY;
    private BlockReason blockReason;
    /** Nombre del monitor ("Buffer") o de la cond ("Buffer.C") en que esta demorado. */
    private String blockedOn;

    private final Deque<Activation> callStack = new ArrayDeque<>();

    private String errorMessage;

    public Process(int id, String name, String color) {
        this.id = id;
        this.name = name;
        this.color = color;
    }

    public int id() { return id; }
    public String name() { return name; }
    public String color() { return color; }

    public State state() { return state; }
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
        if (a == null || !a.isProcedure()) return null;
        return a.monitorName() + "." + a.procedureName();
    }

    public int currentLine() {
        Activation a = current();
        return a == null ? -1 : a.currentLine();
    }
}
