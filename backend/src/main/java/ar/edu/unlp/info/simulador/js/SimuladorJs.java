package ar.edu.unlp.info.simulador.js;

import ar.edu.unlp.info.simulador.lang.CompilationException;
import ar.edu.unlp.info.simulador.lang.Compiler;
import ar.edu.unlp.info.simulador.vm.LogEntry;
import ar.edu.unlp.info.simulador.vm.SchedulingPolicy;
import ar.edu.unlp.info.simulador.vm.VirtualMachine;
import org.teavm.jso.JSExport;

import java.util.List;

/**
 * Puente entre el nucleo Java y el navegador. TeaVM compila esta clase (y todo lo que
 * alcanza desde aca: {@code lang} y {@code vm}) a JavaScript; {@code api} y Spring quedan
 * afuera porque no son alcanzables.
 *
 * <p>Es el equivalente en el browser de {@code SimulationController} + {@code
 * SimulationService}, con dos simplificaciones: hay una sola simulacion viva (la de la
 * pestania), asi que no hace falta el registro de sesiones ni los ids; y el intercambio es
 * por strings JSON, el tipo mas simple de cruzar la frontera Java/JS.
 */
public final class SimuladorJs {

    private SimuladorJs() { }

    private static String codigo;
    private static long semilla;
    private static VirtualMachine vm;

    /** El plugin de TeaVM exige un punto de entrada; el estado lo crea {@link #crear}. */
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
    public static String crear(String code, double seed) {
        try {
            long resuelta = seed < 0 ? System.currentTimeMillis() : (long) seed;
            vm = new VirtualMachine(Compiler.compile(code), resuelta);
            codigo = code;
            semilla = resuelta;
            return creada();
        } catch (CompilationException e) {
            vm = null;
            return Json.error(e.getMessage(), e.getLine());
        }
    }

    /** Reinicia al instante 0 con el mismo codigo y la misma semilla. */
    @JSExport
    public static String reiniciar() {
        if (vm == null) return sinSimulacion();
        vm = new VirtualMachine(Compiler.compile(codigo), semilla);
        return creada();
    }

    /**
     * Avanza un instante.
     *
     * @param policy  {@code RANDOM} o {@code ROUND_ROBIN}
     * @param elegido id del proceso a ejecutar, o negativo para que decida la politica
     * @return JSON con forma {@code StepResponse}
     */
    @JSExport
    public static String paso(String policy, int elegido) {
        if (vm == null) return sinSimulacion();
        List<LogEntry> entries = vm.step(elegido < 0 ? null : elegido, politica(policy));

        StringBuilder sb = new StringBuilder("{\"entries\":");
        Json.lista(sb, entries, Json::logEntry);
        sb.append(",\"finished\":").append(vm.isFinished())
          .append(",\"deadlock\":").append(vm.isDeadlocked())
          .append(",\"instant\":").append(vm.instant())
          .append('}');
        return sb.toString();
    }

    /** Estado completo, con todo el log acumulado (para el time-travel). */
    @JSExport
    public static String estado() {
        if (vm == null) return sinSimulacion();
        StringBuilder sb = new StringBuilder("{\"log\":");
        Json.lista(sb, vm.allLogs(), Json::logEntry);
        sb.append(",\"finished\":").append(vm.isFinished())
          .append(",\"deadlock\":").append(vm.isDeadlocked())
          .append(",\"instant\":").append(vm.instant())
          .append('}');
        return sb.toString();
    }

    /** Libera la simulacion en curso. */
    @JSExport
    public static void liberar() {
        vm = null;
        codigo = null;
    }

    // ------------------------------------------------------------------ internos

    private static String creada() {
        StringBuilder sb = new StringBuilder("{\"id\":\"local\",\"seed\":");
        sb.append(semilla).append(",\"initial\":");
        Json.logEntry(sb, vm.initialEntry());
        sb.append(",\"finished\":").append(vm.isFinished())
          .append(",\"deadlock\":").append(vm.isDeadlocked())
          .append('}');
        return sb.toString();
    }

    private static SchedulingPolicy politica(String policy) {
        if (policy == null) return SchedulingPolicy.RANDOM;
        return switch (policy.trim().toUpperCase()) {
            case "ROUND_ROBIN", "ROUNDROBIN", "RR" -> SchedulingPolicy.ROUND_ROBIN;
            default -> SchedulingPolicy.RANDOM;
        };
    }

    private static String sinSimulacion() {
        return Json.error("No hay una simulacion activa", -1);
    }
}
