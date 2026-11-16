package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.js.SimulatorJs;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Golden master (Feathers, <em>characterization test</em>): fija lo que el motor responde
 * hoy, no lo que deberia responder. Corre cada programa de {@link ProgramasCorpus} y de
 * {@link #extras()} por el puente {@link SimulatorJs}, con las dos politicas, varias
 * semillas y el modo paso a paso, y compara cada respuesta con la guardada en
 * {@code src/test/resources/caracterizacion/}.
 *
 * <p>Sirve de red para refactorizar el nucleo: un cambio de estructura no puede mover ni un
 * evento, ni un mensaje, ni el orden en que se consume el azar. Por cada paso se guarda una
 * huella de la respuesta JSON entera y, en las corridas con semilla 0, el tipo y el mensaje
 * de cada evento, para ubicar a simple vista dónde empieza una diferencia.
 *
 * <p>Si un cambio de comportamiento es intencional, se regeneran los archivos con
 * {@code mvn test -Dcaracterizacion.regenerar=true} y el diff se revisa en el commit. Cuando
 * no coincide, la salida actual queda en {@code target/caracterizacion/} para compararla.
 */
class CaracterizacionTest {

    private static final Path GUARDADOS = Path.of("src", "test", "resources", "caracterizacion");
    private static final Path ACTUALES = Path.of("target", "caracterizacion");
    private static final boolean REGENERAR = Boolean.getBoolean("caracterizacion.regenerar");

    private static final long[] SEMILLAS = {0, 1, 2};
    private static final String[] POLITICAS = {"RANDOM", "ROUND_ROBIN"};
    /** Llamadas a paso por corrida; cada una adelanta el reloj {@link #MS_POR_PASO}. */
    private static final int MAX_PASOS = 200;
    private static final long MS_POR_PASO = 500;

    @Test
    void elMotorRespondeIgualQueCuandoSeGraboLaReferencia() throws IOException {
        Map<String, String> programas = new LinkedHashMap<>(ProgramasCorpus.todos());
        programas.putAll(extras());
        List<String> distintos = new ArrayList<>();
        for (Map.Entry<String, String> prog : programas.entrySet()) {
            String archivo = prog.getKey().replace('/', '_') + ".txt";
            String actual = caracterizar(prog.getValue());
            if (REGENERAR) {
                Files.createDirectories(GUARDADOS);
                Files.writeString(GUARDADOS.resolve(archivo), actual, StandardCharsets.UTF_8);
                continue;
            }
            Path guardado = GUARDADOS.resolve(archivo);
            String esperado = Files.exists(guardado)
                    ? Files.readString(guardado, StandardCharsets.UTF_8) : "";
            if (!esperado.equals(actual)) {
                Files.createDirectories(ACTUALES);
                Files.writeString(ACTUALES.resolve(archivo), actual, StandardCharsets.UTF_8);
                distintos.add(archivo + primeraDiferencia(esperado, actual));
            }
        }
        assertTrue(distintos.isEmpty(), "El motor responde distinto que la referencia en:\n  "
                + String.join("\n  ", distintos)
                + "\nComparar con: diff -r " + GUARDADOS + " " + ACTUALES);
    }

    /** Todas las corridas de un programa, una seccion por politica, semilla y modo. */
    private static String caracterizar(String codigo) {
        StringBuilder sb = new StringBuilder();
        for (String politica : POLITICAS) {
            for (long semilla : SEMILLAS) {
                sb.append("## ").append(politica).append(" semilla=").append(semilla).append('\n');
                correr(sb, codigo, politica, semilla, false, semilla == 0);
            }
        }
        sb.append("## paso a paso, RANDOM semilla=0\n");
        correr(sb, codigo, "RANDOM", 0, true, true);
        return sb.toString();
    }

    /**
     * Una corrida hasta terminar, quedar en deadlock o agotar los pasos. En el modo paso a
     * paso se pide en cada llamada un proceso distinto (ids 1 a 4): si no esta listo, decide
     * la politica, y ese camino tambien queda fijado. Sin {@code legible} se guarda solo la
     * huella de cada respuesta, para que la referencia no pese megas.
     */
    private static void correr(StringBuilder sb, String codigo, String politica, long semilla,
            boolean pasoAPaso, boolean legible) {
        String creada = SimulatorJs.create(codigo, semilla);
        sb.append("crear ").append(resumen(creada)).append('\n');
        if (creada.startsWith("{\"error\"")) return;
        for (int i = 1; i <= MAX_PASOS; i++) {
            int elegido = pasoAPaso ? (i % 4) + 1 : -1;
            String step = SimulatorJs.step(politica, elegido, i * MS_POR_PASO);
            sb.append("paso ").append(i).append(' ')
                    .append(legible ? resumen(step) : "#" + huella(step)).append('\n');
            if (step.startsWith("{\"error\"") || step.contains("\"finished\":true")
                    || step.contains("\"deadlock\":true")) {
                break;
            }
        }
        sb.append("estado #").append(huella(SimulatorJs.state())).append('\n');
    }

    /** Tipo y mensaje de cada evento, en el orden en que {@code Json.logEntry} los escribe. */
    private static final Pattern EVENTO = Pattern.compile(
            "\"kind\":\"([A-Z_]+)\",\"resource\":\"(?:[^\"\\\\]|\\\\.)*\","
                    + "\"message\":\"((?:[^\"\\\\]|\\\\.)*)\"");

    /**
     * La respuesta, resumida: el tipo y el mensaje de cada evento y el estado final, legibles
     * para ubicar una diferencia, y la huella de la respuesta entera (ids, colores, instante,
     * snapshot), que es lo que detecta cualquier cambio. Un error se guarda entero.
     */
    private static String resumen(String json) {
        int fin = json.lastIndexOf(",\"finished\":");
        if (fin < 0) return json;
        StringBuilder sb = new StringBuilder();
        Matcher m = EVENTO.matcher(json.substring(0, Math.max(0, json.indexOf(",\"snapshot\":"))));
        while (m.find()) sb.append(m.group(1)).append(' ').append(m.group(2)).append(" | ");
        return sb.append('{').append(json.substring(fin + 1)).append(" #").append(huella(json))
                .toString();
    }

    private static String huella(String s) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-256")
                    .digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (int i = 0; i < 8; i++) hex.append(String.format("%02x", h[i]));
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String primeraDiferencia(String esperado, String actual) {
        String[] e = esperado.split("\n", -1);
        String[] a = actual.split("\n", -1);
        for (int i = 0; i < Math.max(e.length, a.length); i++) {
            String le = i < e.length ? e[i] : "(fin)";
            String la = i < a.length ? a[i] : "(fin)";
            if (!le.equals(la)) return " (linea " + (i + 1) + ")";
        }
        return "";
    }

    /**
     * Caminos de la VM que el corpus de invariantes no recorre: delay (y fuera de rango),
     * errores de ejecucion dentro y fuera de monitores, ciclo entre monitores, errores al
     * inicializar, for con paso propio, colas ordenadas con tuplas, arreglos de cond, espera
     * activa, bloques anidados, desbordes y aritmetica limite, y los topes de tamano.
     */
    private static Map<String, String> extras() {
        Map<String, String> p = new LinkedHashMap<>();
        p.put("extra/delay", """
                monitor M { int x = 0; procedure f() { x++; delay(1); } }
                process P[i: 1..2] { delay(1); M.f(); delay(0); write("listo ", i); }
                process Q { M.f(); }
                """);
        p.put("extra/error-indice-en-monitor", """
                monitor M { int a[3]; procedure f(i: in int) { a[i] = 1; } }
                process P[i: 1..4] { M.f(i); }
                """);
        p.put("extra/error-pop-vacia", """
                monitor M { Cola c(int); procedure sacar() { int x; pop(c, x); } }
                process P { M.sacar(); } process Q { M.sacar(); }
                """);
        p.put("extra/error-division-fuera-de-monitor", """
                process P { int a = 4; int b = 0; while (a > 0) { a--; b = 10 / a; } }
                """);
        p.put("extra/error-indice-monitor-y-cond", """
                monitor B[k: 0..1] { int v = 0; procedure f() { v = k; } }
                monitor C { cond c[2]; procedure g(i: in int) { signal(c[i]); } }
                process P { B[1].f(); B[2].f(); } process Q { C.g(1); C.g(5); }
                """);
        p.put("extra/ciclo-entre-monitores", """
                monitor A { procedure f() { B.g(); } procedure h() { skip; } }
                monitor B { procedure g() { A.h(); } }
                process P { A.f(); } process Q { A.h(); }
                """);
        p.put("extra/error-al-inicializar", """
                monitor M { int n = 0 - 1; int a[n]; }
                process P { skip; }
                """);
        p.put("extra/no-compila", """
                process P { x = 1; }
                """);
        p.put("extra/for-if-arreglos", """
                monitor M { int a[5]; double d = 0;
                  for (int i = 0; i < 5; i = i + 2) { a[i] = i * i; }
                  procedure f(k: in int; r: out double) {
                    if (k mod 2 == 0) { a[k]++; d = d + 0.5; } else a[k]--;
                    r = d; } }
                process P[i: 0..4] { double r; M.f(i, r); write(i, ": ", r); }
                """);
        p.put("extra/cola-ordenada-tuplas", """
                monitor M { ColaOrdenada c(int, (text, double)); cond hay;
                  procedure poner(k: in int; s: in text) { push(c, (k, (s, k / 2.0))); signal_all(hay); }
                  procedure sacar() { int k; text s; double d;
                    while (empty(c)) wait(hay); pop(c, (k, (s, d))); write(k, s, d); } }
                process Prod { M.poner(3, "c"); M.poner(1, "a"); M.poner(2, "b"); }
                process Cons[i: 1..3] { M.sacar(); }
                """);
        p.put("extra/cond-arreglo-signal", """
                monitor M { cond turno[3]; int listos = 0;
                  procedure esperar(i: in int) { listos++; wait(turno[i]); }
                  procedure despertar(i: in int) { signal(turno[i]); } }
                process W[i: 0..2] { M.esperar(i); }
                process S { delay(1); for (int j = 0..2) { M.despertar(j); } }
                """);
        p.put("extra/espera-activa-y-bloques", """
                monitor M { bool listo = false; procedure abrir() { listo = true; }
                  procedure ver(r: out bool) { r = listo; } }
                process P { bool ok = false; { { int n = 0; } } while (not ok) { M.ver(ok); } }
                process Q { while (true) { } }
                process R { skip; skip; M.abrir(); }
                """);
        p.put("extra/delay-fuera-de-rango", """
                process P { delay(3601); } process Q { int s = 0 - 1; delay(s); }
                process R { delay(3600); }
                """);
        p.put("extra/desbordes-y-aritmetica", """
                monitor M { int max = 9223372036854775807; int min = 0 - 9223372036854775807 - 1;
                  procedure inc() { max++; }
                  procedure neg(r: out int) { r = -min; }
                  procedure div(r: out int) { r = min / (0 - 1); }
                  procedure modd(r: out double) { r = 5.5 mod 0.0; } }
                process A { M.inc(); }
                process B { int r; M.neg(r); }
                process C { int r; M.div(r); }
                process D { double r; M.modd(r); }
                process E { double d = -2.5; int i = -(3); bool b = false and 1 / 0 == 1;
                  bool c = true or 1 / 0 == 1; double m = 5.5 mod 2; write(d, i, b, c, m); }
                """);
        p.put("extra/inicializacion-sin-fin", """
                monitor M { int x = 0; while (true) { x++; } }
                process P { skip; }
                """);
        p.put("extra/demasiados-procesos", """
                process P[i: 1..5001] { skip; }
                """);
        p.put("extra/demasiados-monitores", """
                monitor M[i: 1..1001] { int x = 0; }
                process P { skip; }
                """);
        return p;
    }
}
