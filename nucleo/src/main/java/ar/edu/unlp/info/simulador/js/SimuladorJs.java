package ar.edu.unlp.info.simulador.js;

import ar.edu.unlp.info.simulador.lang.CompilationException;
import ar.edu.unlp.info.simulador.lang.Compiler;
import ar.edu.unlp.info.simulador.vm.LogEntry;
import ar.edu.unlp.info.simulador.vm.RuntimeError;
import ar.edu.unlp.info.simulador.vm.SchedulingPolicy;
import ar.edu.unlp.info.simulador.vm.VirtualMachine;
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
        } catch (RuntimeError e) {
            // La inicializacion de las variables del monitor se ejecuta al crear la VM.
            vm = null;
            return Json.error("Error al inicializar: " + e.getMessage(), e.getLine());
        } catch (Throwable t) {
            // Throwable y no RuntimeException: un StackOverflowError o un OutOfMemoryError
            // tambien tienen que volver como JSON, nunca cruzar a JS como excepcion.
            vm = null;
            return errorInterno();
        }
    }

    /** Reinicia al instante 0 con el mismo codigo y la misma semilla. */
    @JSExport
    public static String reiniciar() {
        if (vm == null) return sinSimulacion();
        return crear(codigo, semilla);
    }

    /**
     * Avanza un instante.
     *
     * @param policy  {@code RANDOM} o {@code ROUND_ROBIN}
     * @param elegido id del proceso a ejecutar, o negativo para que decida la politica
     * @param ahoraMs hora actual en ms (la de {@code Date.now()}): la usa delay, que demora en
     *                tiempo real; el nucleo no lee el reloj para seguir siendo determinista
     * @return JSON con forma {@code StepResponse}: los eventos del instante y el estado final
     */
    @JSExport
    public static String paso(String policy, int elegido, double ahoraMs) {
        if (vm == null) return sinSimulacion();
        try {
            List<LogEntry> entries = vm.step(elegido < 0 ? null : elegido, politica(policy),
                    (long) ahoraMs);
            StringBuilder sb = new StringBuilder("{\"entries\":");
            Json.lista(sb, entries, Json::logEntry);
            sb.append(",\"snapshot\":");
            Json.snapshot(sb, vm.snapshot());
            sb.append(",\"finished\":").append(vm.isFinished())
              .append(",\"deadlock\":").append(vm.isDeadlocked())
              .append(",\"instant\":").append(vm.instant())
              .append(",\"waiting\":").append(vm.isWaitingForDelay())
              .append('}');
            return sb.toString();
        } catch (Throwable t) {
            return descartar();
        }
    }

    /** Estado actual y los ultimos eventos del log (para el historial). */
    @JSExport
    public static String estado() {
        if (vm == null) return sinSimulacion();
        try {
            StringBuilder sb = new StringBuilder("{\"log\":");
            Json.lista(sb, vm.allLogs(), Json::logEntry);
            sb.append(",\"snapshot\":");
            Json.snapshot(sb, vm.snapshot());
            sb.append(",\"finished\":").append(vm.isFinished())
              .append(",\"deadlock\":").append(vm.isDeadlocked())
              .append(",\"instant\":").append(vm.instant())
              .append('}');
            return sb.toString();
        } catch (Throwable t) {
            return descartar();
        }
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
        sb.append(semilla).append(",\"snapshot\":");
        Json.snapshot(sb, vm.snapshot());
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

    /**
     * Ultima red: una excepcion que no es del alumno es un bug del simulador. Se devuelve
     * como error para que no cruce a JS como {@code Error: null}.
     */
    private static String errorInterno() {
        return Json.error("Error interno del simulador. Reportalo con el programa que lo produjo.",
                -1);
    }

    /**
     * Tras un error interno el estado de la VM no es confiable: se descarta, y el siguiente
     * paso pide volver a crear la simulacion en lugar de seguir con datos rotos.
     */
    private static String descartar() {
        vm = null;
        return errorInterno();
    }

    private static String sinSimulacion() {
        return Json.error("No hay una simulación activa", -1);
    }
}
