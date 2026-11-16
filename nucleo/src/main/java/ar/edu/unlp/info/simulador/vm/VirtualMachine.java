package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.lang.parser.ast.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Maquina virtual del simulador de monitores. Ejecuta un {@link Program} por instantes: en
 * cada instante avanzan uno o varios procesos, una sentencia observable cada uno (ver
 * {@link #step}). Coordina a sus colaboradores: {@link Scheduler} elige el turno,
 * {@link StatementExecutor} ejecuta cada sentencia, {@link MonitorProtocol} implementa la
 * exclusion mutua implicita y la disciplina <em>signal and continue</em>, y
 * {@link EventLog} registra lo que pasa.
 */
public final class VirtualMachine {

    /** Tope de iteraciones estructurales (bloques anidados) por instante, corta busy-waits. */
    private static final int STRUCTURAL_CAP = 4000;

    /** Pasos que puede dar el codigo de inicializacion de un monitor antes de darlo por colgado. */
    static final int TOPE_INICIALIZACION = 100_000;

    private final Program program;
    private final Scheduler scheduler;
    private final MonitorProtocol monitorProtocol;
    private final StatementExecutor statements;

    private final List<Process> processes = new ArrayList<>();
    private final OutputBuffer salida = new OutputBuffer();
    private final Map<String, Monitor> monitors = new LinkedHashMap<>();
    private final VariableAccess vars = new VariableAccess(monitors);
    private final Map<String, MonitorDef> monitorDefs = new LinkedHashMap<>();

    private final EventLog events = new EventLog();

    private final SimulationClock clock = new SimulationClock();
    /**
     * Ids de los procesos que avanzaron en el ultimo instante, en el orden en que les toco el
     * turno: la UI los marca como "ejecutando" y los ordena asi en la linea de tiempo.
     */
    private final List<Integer> advancedLastStep = new ArrayList<>();
    private boolean deadlockLogged = false;

    public VirtualMachine(Program program, long seed) {
        this.program = program;
        Azar random = new Azar(seed);
        this.scheduler = new Scheduler(processes, random);
        this.monitorProtocol = new MonitorProtocol(monitors, random, advancedLastStep,
                this::event);
        this.statements = new StatementExecutor(vars, monitors, monitorDefs, monitorProtocol,
                salida, clock, this::event);
        initialize();
    }

    // ================================================================= init

    private void initialize() {
        for (MonitorDef md : program.monitors()) {
            monitorDefs.put(md.name(), md);
            for (Monitor m : ProgramLoader.buildMonitors(md)) monitors.put(m.name(), m);
        }
        runInitCode();
        processes.addAll(ProgramLoader.buildProcesses(program.processes()));
    }

    /** Corre el codigo de inicializacion de cada monitor, sin registrar eventos. */
    private void runInitCode() {
        events.setEnabled(false);
        for (Monitor m : monitors.values()) {
            MonitorDef md = monitorDefs.get(m.definition());
            if (!md.initStmts().isEmpty()) runMonitorInit(m, md.initStmts());
        }
        events.setEnabled(true);
    }

    /**
     * El codigo de inicializacion lo corre un proceso de sistema (id negativo, sin eventos)
     * que tiene el monitor tomado hasta terminar. Un ciclo sin fin es error del alumno.
     */
    private void runMonitorInit(Monitor m, List<Stmt> initStmts) {
        Process sys = Process.system("«init " + m.name() + "»");
        Activation act = new Activation(m.name(), "«init»");
        act.pushFront(initStmts);
        sys.push(act);
        m.setLockOwner(sys);
        int guard = 0;
        while (!sys.isFinished()) {
            if (guard++ >= TOPE_INICIALIZACION) {
                throw new RuntimeError("La inicialización del monitor " + m.name()
                        + " no terminó después de " + TOPE_INICIALIZACION
                        + " pasos: revisá si tiene un ciclo infinito", sys.currentLine());
            }
            advance(sys);
        }
        m.setLockOwner(null);
    }

    // ================================================================= scheduling

    /**
     * Avanza un instante. Los procesos corren en paralelo de verdad: en un mismo instante
     * avanzan varios, no uno solo. Eso es lo que hace visible la contencion — dos procesos
     * que piden el mismo monitor a la vez, y uno se queda en la cola de entrada.
     *
     * <p>Cual avanza y en que orden lo decide la politica. El orden dentro del instante
     * importa: es el que resuelve quien gana el monitor cuando varios lo piden a la vez.
     *
     * <p>Si se pide un proceso puntual ({@code chosenProcessId}), avanza solo ese: es el
     * modo paso a paso, para seguir a un proceso sin que el resto se mueva.
     *
     * @return los eventos generados por este instante
     */
    public List<LogEntry> step(Integer chosenProcessId, SchedulingPolicy policy) {
        return step(chosenProcessId, policy, clock.nowMs());
    }

    /**
     * Igual que {@link #step(Integer, SchedulingPolicy)}, informando la hora actual en ms.
     * Antes de elegir el turno, los procesos cuyo delay ya termino vuelven a estar listos.
     * Si nadie puede avanzar pero hay procesos demorados, no pasa el instante: se espera.
     */
    public List<LogEntry> step(Integer chosenProcessId, SchedulingPolicy policy, long nowMs) {
        events.startStep();
        clock.advanceTo(nowMs);

        if (isFinished()) {
            return List.of();
        }
        wakeDelayed();
        List<Process> turno = scheduler.nextTurn(chosenProcessId, policy);
        if (turno.isEmpty() && isWaitingForDelay()) {
            return events.stepEntries();
        }
        if (turno.isEmpty()) {
            if (!deadlockLogged) {
                clock.tick();
                logDeadlock();
            }
            return events.stepEntries();
        }

        runTurn(turno);
        if (isDeadlocked() && !deadlockLogged) {
            logDeadlock();
        }
        return events.stepEntries();
    }

    /** Un instante nuevo en el que avanzan, en orden, los procesos del turno. */
    private void runTurn(List<Process> turno) {
        clock.tick();
        advancedLastStep.clear();
        for (Process p : turno) {
            // Solo avanza si sigue listo, y una vez por instante: el que recibio un monitor
            // por traspaso ya hizo su accion del instante, que fue entrar.
            if (!p.isReady() || advancedLastStep.contains(p.id())) {
                continue;
            }
            runProcess(p);
        }
    }

    /** Avanza un proceso una accion; si falla, termina solo ese proceso. */
    private void runProcess(Process p) {
        p.setState(Process.State.RUNNING);
        advancedLastStep.add(p.id());
        try {
            advance(p);
        } catch (RuntimeError re) {
            monitorProtocol.fail(p, re.getMessage());
        } catch (Throwable t) {
            // Un error que no es del alumno (un bug del simulador, o memoria/pila agotada)
            // igual termina solo ese proceso: si quedara RUNNING, el instante siguiente lo
            // tomaria por un interbloqueo que el programa no tiene.
            monitorProtocol.fail(p, "error interno del simulador");
        }
        if (p.state() == Process.State.RUNNING) {
            p.setState(Process.State.READY);
        }
    }

    /** Registra el interbloqueo; se hace una sola vez por ejecucion. */
    private void logDeadlock() {
        deadlockLogged = true;
        events.systemEvent(clock.instant(), EventKind.DEADLOCK, deadlockMessage());
    }

    // ================================================================= ejecucion de un proceso

    private void advance(Process p) {
        int guard = 0;
        while (true) {
            if (++guard > STRUCTURAL_CAP) {
                event(p, EventKind.SPIN, "", p.name() + ": espera activa (bucle sin avanzar)");
                return;
            }
            Activation act = p.current();
            if (act == null) {
                p.setState(Process.State.TERMINATED);
                return;
            }
            if (act.needsLock()) {
                monitorProtocol.acquire(p, act);
                return;
            }
            if (act.pending().isEmpty()) {
                finalizeActivation(p, act);
                return;
            }
            Stmt s = act.pending().pollFirst();
            act.setCurrentLine(s.line());
            boolean consumed = statements.execute(p, act, s);
            if (consumed || p.state() != Process.State.RUNNING) {
                return;
            }
        }
    }

    private void finalizeActivation(Process p, Activation act) {
        p.pop();
        if (act.isProcedure()) {
            Monitor m = monitors.get(act.monitorName());
            writeOutParameters(p, act);
            event(p, EventKind.RETURN, m.name(),
                    p.name() + ": retorna de " + m.name() + "." + act.procedureName()
                            + ", libera el monitor");
            monitorProtocol.release(m);
        }
        if (p.callStack().isEmpty()) {
            p.setState(Process.State.TERMINATED);
            event(p, EventKind.TERMINATED, "", p.name() + ": termina");
        }
    }

    /**
     * Copia cada parametro {@code out} al lugar del llamador. Si el llamador es un procedure
     * de otro monitor, lo sigue teniendo tomado (llamada cerrada, ADR 0007): se escriben ya.
     */
    private void writeOutParameters(Process p, Activation act) {
        for (Map.Entry<String, LValue> e : act.outBindings().entrySet()) {
            vars.writeLValue(p.id(), e.getValue(), act.locals().get(e.getKey()));
        }
    }

    /**
     * Describe el interbloqueo. Con llamadas cerradas, un proceso puede quedar esperando en
     * un monitor mientras retiene otro; eso se nombra, porque es lo que el alumno tiene que
     * ver para entender por que nadie avanza.
     */
    private String deadlockMessage() {
        StringBuilder sb = new StringBuilder("Interbloqueo: ningún proceso puede avanzar");
        for (Process p : processes) {
            List<Monitor> held = monitorProtocol.heldBy(p);
            if (p.state() != Process.State.BLOCKED || held.isEmpty()) continue;
            sb.append(". ").append(p.name()).append(" espera en ").append(p.blockedOn())
                    .append(" y retiene ");
            for (int i = 0; i < held.size(); i++) {
                if (i > 0) sb.append(i == held.size() - 1 ? " y " : ", ");
                sb.append(held.get(i).name());
            }
        }
        return sb.toString();
    }

    // ================================================================= estado / snapshots

    public boolean isFinished() {
        return processes.stream().allMatch(Process::isFinished);
    }

    public boolean isDeadlocked() {
        return !isFinished()
                && processes.stream().noneMatch(pr -> pr.isReady() || pr.isDelayed());
    }

    /** true si ningun proceso esta listo pero alguno espera que termine su delay. */
    public boolean isWaitingForDelay() {
        return processes.stream().noneMatch(Process::isReady)
                && processes.stream().anyMatch(Process::isDelayed);
    }

    /** Hora del reloj de la simulacion, en ms: la ultima informada a {@link #step}. */
    public long clockMs() {
        return clock.nowMs();
    }

    private void wakeDelayed() {
        for (Process p : processes) {
            if (p.isDelayed() && p.delayEndsAt() <= clock.nowMs()) p.unblock();
        }
    }

    public int instant() {
        return clock.instant();
    }

    /**
     * Los ultimos eventos de la ejecucion (a lo sumo {@link EventLog#TOPE_LOG}), del mas viejo
     * al mas nuevo.
     */
    public List<LogEntry> allLogs() {
        return events.all();
    }

    public Snapshot snapshot() {
        return SnapshotBuilder.build(clock.instant(), processes, monitors.values(), advancedLastStep,
                salida.view());
    }

    // ================================================================= logging

    private void event(Process p, EventKind kind, String resource, String message) {
        events.processEvent(clock.instant(), p, kind, resource, message);
    }
}
