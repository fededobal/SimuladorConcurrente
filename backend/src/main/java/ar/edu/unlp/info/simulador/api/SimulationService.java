package ar.edu.unlp.info.simulador.api;

import ar.edu.unlp.info.simulador.lang.Compiler;
import ar.edu.unlp.info.simulador.lang.parser.ast.Program;
import ar.edu.unlp.info.simulador.vm.SchedulingPolicy;
import ar.edu.unlp.info.simulador.vm.VirtualMachine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registro en memoria de simulaciones activas. Cada simulacion es una {@link VirtualMachine}
 * mas el codigo fuente y la semilla (para poder reiniciarla).
 */
@Service
public class SimulationService {

    /** Sesion de simulacion. */
    public static final class Session {
        final String id;
        final String code;
        final long seed;
        VirtualMachine vm;
        volatile long lastAccess;

        Session(String id, String code, long seed, VirtualMachine vm) {
            this.id = id;
            this.code = code;
            this.seed = seed;
            this.vm = vm;
            this.lastAccess = System.currentTimeMillis();
        }

        public String id() { return id; }
        public VirtualMachine vm() { return vm; }
        public long seed() { return seed; }
    }

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final int maxActive;
    private final long ttlMillis;

    public SimulationService(
            @Value("${simulador.session.max-active:200}") int maxActive,
            @Value("${simulador.session.ttl-minutes:60}") long ttlMinutes) {
        this.maxActive = maxActive;
        this.ttlMillis = ttlMinutes * 60_000L;
    }

    public Session create(String code, Long seed) {
        Program program = Compiler.compile(code);           // valida; lanza CompilationException
        long resolvedSeed = seed != null ? seed : System.nanoTime();
        VirtualMachine vm = new VirtualMachine(program, resolvedSeed);

        evictIfNeeded();
        String id = UUID.randomUUID().toString();
        Session s = new Session(id, code, resolvedSeed, vm);
        sessions.put(id, s);
        return s;
    }

    public Session get(String id) {
        Session s = sessions.get(id);
        if (s == null) {
            throw new NoSuchElementException("Simulacion no encontrada: " + id);
        }
        s.lastAccess = System.currentTimeMillis();
        return s;
    }

    public Session reset(String id) {
        Session old = get(id);
        old.vm = new VirtualMachine(Compiler.compile(old.code), old.seed);
        old.lastAccess = System.currentTimeMillis();
        return old;
    }

    public void delete(String id) {
        sessions.remove(id);
    }

    public SchedulingPolicy parsePolicy(String policy) {
        if (policy == null) return SchedulingPolicy.RANDOM;
        return switch (policy.trim().toUpperCase()) {
            case "ROUND_ROBIN", "ROUNDROBIN", "RR" -> SchedulingPolicy.ROUND_ROBIN;
            default -> SchedulingPolicy.RANDOM;
        };
    }

    private void evictIfNeeded() {
        long now = System.currentTimeMillis();
        sessions.values().removeIf(s -> now - s.lastAccess > ttlMillis);
        while (sessions.size() >= maxActive) {
            sessions.values().stream()
                    .min(Comparator.comparingLong(s -> s.lastAccess))
                    .map(s -> s.id)
                    .ifPresent(sessions::remove);
        }
    }
}
