package ar.edu.unlp.info.simulator.js;

import ar.edu.unlp.info.simulator.lang.CompilationException;
import ar.edu.unlp.info.simulator.lang.Compiler;
import ar.edu.unlp.info.simulator.vm.LogEntry;
import ar.edu.unlp.info.simulator.vm.RuntimeError;
import ar.edu.unlp.info.simulator.vm.SchedulingPolicy;
import ar.edu.unlp.info.simulator.vm.VirtualMachine;
import org.teavm.jso.JSExport;

import java.util.List;

/**
 * Puente entre el nucleo Java y el navegador. TeaVM compila esta clase (y todo lo que
 * alcanza desde aca: {@code lang} y {@code vm}) a JavaScript.
 *
 * <p>Hay una sola simulacion viva (la de la pestania), asi que no hace falta registro de
 * sesiones ni ids; el intercambio es por strings JSON, el tipo mas simple de cruzar la
 * frontera Java/JS.
 */
public final class SimulatorJs {

    private SimulatorJs() { }

    private static String currentCode;
    private static long currentSeed;
    private static VirtualMachine vm;

    /** El plugin de TeaVM exige un punto de entrada; el estado lo crea {@link #create}. */
    public static void main(String[] args) {
    }

    /**
     * Compila el codigo y arranca una simulacion nueva.
     *
     * @param code  pseudocodigo a compilar
     * @param seed  semilla del scheduler; negativa para que la elija el reloj
     * @return JSON con forma {@code SimulationCreated}, o {@code ApiError} si no compila
     */
    @JSExport
    public static String create(String code, double seed) {
        try {
            long resolvedSeed = seed < 0 ? System.currentTimeMillis() : (long) seed;
            vm = new VirtualMachine(Compiler.compile(code), resolvedSeed);
            currentCode = code;
            currentSeed = resolvedSeed;
            return created();
        } catch (CompilationException e) {
            vm = null;
            return Json.error(e.getMessage(), e.getLine());
        } catch (RuntimeError e) {
            // La inicializacion de las variables del monitor se ejecuta al crear la VM.
            vm = null;
            return Json.error("Error al inicializar: " + e.getMessage(), e.getLine());
        } catch (Throwable t) {
            // Throwable y no RuntimeException: un StackOverflowError o un OutOfMemoryError
            // tambien tienen que volver como JSON, nunca cruzar a JS como excepcion.
            vm = null;
            return internalError();
        }
    }

    /** Reinicia al instante 0 con el mismo codigo y la misma semilla. */
    @JSExport
    public static String restart() {
        if (vm == null) return noSimulation();
        return create(currentCode, currentSeed);
    }

    /**
     * Avanza un instante.
     *
     * @param policy  {@code RANDOM} o {@code ROUND_ROBIN}
     * @param chosenProcessId id del proceso a ejecutar, o negativo para que decida la politica
     * @param nowMs           hora actual en ms (la de {@code Date.now()}): la usa delay, que
     *                        demora en tiempo real; el nucleo no lee el reloj para seguir
     *                        siendo determinista
     * @return JSON con forma {@code StepResponse}: los eventos del instante y el estado final
     */
    @JSExport
    public static String step(String policy, int chosenProcessId, double nowMs) {
        if (vm == null) return noSimulation();
        try {
            Integer chosen = chosenProcessId < 0 ? null : chosenProcessId;
            List<LogEntry> entries = vm.step(chosen, policyOf(policy), (long) nowMs);
            StringBuilder sb = new StringBuilder("{\"entries\":");
            Json.list(sb, entries, Json::logEntry);
            appendState(sb);
            sb.append(",\"instant\":").append(vm.instant())
              .append(",\"waiting\":").append(vm.isWaitingForDelay())
              .append('}');
            return sb.toString();
        } catch (Throwable t) {
            return discard();
        }
    }

    /** Estado actual y los ultimos eventos del log (para el historial). */
    @JSExport
    public static String state() {
        if (vm == null) return noSimulation();
        try {
            StringBuilder sb = new StringBuilder("{\"log\":");
            Json.list(sb, vm.allLogs(), Json::logEntry);
            appendState(sb);
            sb.append(",\"instant\":").append(vm.instant()).append('}');
            return sb.toString();
        } catch (Throwable t) {
            return discard();
        }
    }

    /** Libera la simulacion en curso. */
    @JSExport
    public static void release() {
        vm = null;
        currentCode = null;
    }

    // ------------------------------------------------------------------ internos

    /**
     * {@code ,"snapshot":{...},"finished":b,"deadlock":b}: lo que comparten las respuestas de
     * create, step y state.
     */
    private static void appendState(StringBuilder sb) {
        sb.append(",\"snapshot\":");
        Json.snapshot(sb, vm.snapshot());
        sb.append(",\"finished\":").append(vm.isFinished())
          .append(",\"deadlock\":").append(vm.isDeadlocked());
    }

    private static String created() {
        StringBuilder sb = new StringBuilder("{\"id\":\"local\",\"seed\":");
        sb.append(currentSeed);
        appendState(sb);
        return sb.append('}').toString();
    }

    private static SchedulingPolicy policyOf(String policy) {
        if (policy == null) return SchedulingPolicy.RANDOM;
        return switch (policy.trim().toUpperCase()) {
            case "ROUND_ROBIN", "ROUNDROBIN", "RR" -> SchedulingPolicy.ROUND_ROBIN;
            default -> SchedulingPolicy.RANDOM;
        };
    }

    /**
     * Ultima red: una excepcion que no es del alumno es un bug del simulador. Se devuelve
     * como error para que no cruce a JS como {@code Error: null}.
     */
    private static String internalError() {
        return Json.error("Error interno del simulador. Reportalo con el programa que lo produjo.",
                -1);
    }

    /**
     * Tras un error interno el estado de la VM no es confiable: se descarta, y el siguiente
     * paso pide volver a crear la simulacion en lugar de seguir con datos rotos.
     */
    private static String discard() {
        vm = null;
        return internalError();
    }

    private static String noSimulation() {
        return Json.error("No hay una simulación activa", -1);
    }
}
