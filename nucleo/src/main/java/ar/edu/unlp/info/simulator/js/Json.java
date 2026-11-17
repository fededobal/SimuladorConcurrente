package ar.edu.unlp.info.simulator.js;

import ar.edu.unlp.info.simulator.vm.LogEntry;
import ar.edu.unlp.info.simulator.vm.Snapshot;

import java.util.List;

/**
 * Serializacion manual a JSON. Jackson usa reflexion y TeaVM compila de forma estatica:
 * hay que escribirlo a mano.
 *
 * <p>Las formas producidas son exactamente las que declara {@code frontend/src/types.ts};
 * el contrato se prueba en {@code SimulatorJsTest}.
 */
final class Json {

    private Json() { }

    // ------------------------------------------------------------------ primitivas

    static void quoted(StringBuilder sb, String s) {
        if (s == null) {
            sb.append("null");
            return;
        }
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"'  -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default   -> {
                    if (c < 0x20) {
                        sb.append("\\u");
                        String hex = Integer.toHexString(c);
                        sb.append("0000", 0, 4 - hex.length()).append(hex);
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        sb.append('"');
    }

    /** Campo de tipo Integer: null se serializa como null, no como 0. */
    private static void num(StringBuilder sb, Integer n) {
        sb.append(n == null ? "null" : n.toString());
    }

    private static void field(StringBuilder sb, String name) {
        quoted(sb, name);
        sb.append(':');
    }

    // ------------------------------------------------------------------ DTOs

    private static void procRef(StringBuilder sb, Snapshot.ProcRef p) {
        if (p == null) {
            sb.append("null");
            return;
        }
        sb.append("{");
        field(sb, "id");    sb.append(p.id()).append(',');
        field(sb, "name");  quoted(sb, p.name()); sb.append(',');
        field(sb, "color"); quoted(sb, p.color());
        sb.append("}");
    }

    private static void varView(StringBuilder sb, Snapshot.VarView v) {
        sb.append("{");
        field(sb, "name");         quoted(sb, v.name()); sb.append(',');
        field(sb, "type");         quoted(sb, v.type()); sb.append(',');
        field(sb, "value");        quoted(sb, v.value()); sb.append(',');
        field(sb, "isArray");      sb.append(v.isArray()).append(',');
        field(sb, "lastWriterId"); num(sb, v.lastWriterId()); sb.append(',');
        field(sb, "elements");
        if (v.elements() == null) sb.append("null");
        else list(sb, v.elements(), Json::quoted);
        sb.append(',');
        field(sb, "size");         sb.append(v.size());
        sb.append("}");
    }

    private static void condView(StringBuilder sb, Snapshot.CondView c) {
        sb.append("{");
        field(sb, "name");  quoted(sb, c.name()); sb.append(',');
        field(sb, "queue"); list(sb, c.queue(), Json::procRef);
        sb.append("}");
    }

    private static void monitorView(StringBuilder sb, Snapshot.MonitorView m) {
        sb.append("{");
        field(sb, "name");       quoted(sb, m.name()); sb.append(',');
        field(sb, "vars");       list(sb, m.vars(), Json::varView); sb.append(',');
        field(sb, "conds");      list(sb, m.conds(), Json::condView); sb.append(',');
        field(sb, "lockOwner");  procRef(sb, m.lockOwner()); sb.append(',');
        field(sb, "entryQueue"); list(sb, m.entryQueue(), Json::procRef);
        sb.append("}");
    }

    private static void processView(StringBuilder sb, Snapshot.ProcessView p) {
        sb.append("{");
        field(sb, "id");          sb.append(p.id()).append(',');
        field(sb, "name");        quoted(sb, p.name()); sb.append(',');
        field(sb, "color");       quoted(sb, p.color()); sb.append(',');
        field(sb, "state");       quoted(sb, p.state()); sb.append(',');
        field(sb, "blockReason"); quoted(sb, p.blockReason()); sb.append(',');
        field(sb, "blockedOn");   quoted(sb, p.blockedOn()); sb.append(',');
        field(sb, "location");    quoted(sb, p.location()); sb.append(',');
        field(sb, "line");        sb.append(p.line()).append(',');
        field(sb, "locals");      list(sb, p.locals(), Json::varView); sb.append(',');
        field(sb, "error");       quoted(sb, p.error()); sb.append(',');
        field(sb, "advanced");    sb.append(p.advanced()).append(',');
        field(sb, "advanceOrder"); sb.append(p.advanceOrder()).append(',');
        field(sb, "holding");     list(sb, p.holding(), Json::quoted); sb.append(',');
        field(sb, "delayRemaining"); sb.append(p.delayRemaining() == null ? "null" : p.delayRemaining());
        sb.append("}");
    }

    private static void outputLine(StringBuilder sb, Snapshot.OutputLine o) {
        sb.append("{");
        field(sb, "instant"); sb.append(o.instant()).append(',');
        field(sb, "process"); quoted(sb, o.process()); sb.append(',');
        field(sb, "color");   quoted(sb, o.color()); sb.append(',');
        field(sb, "text");    quoted(sb, o.text());
        sb.append("}");
    }

    static void snapshot(StringBuilder sb, Snapshot s) {
        sb.append("{");
        field(sb, "instant");   sb.append(s.instant()).append(',');
        field(sb, "processes"); list(sb, s.processes(), Json::processView); sb.append(',');
        field(sb, "monitors");  list(sb, s.monitors(), Json::monitorView); sb.append(',');
        field(sb, "output");    list(sb, s.output(), Json::outputLine);
        sb.append("}");
    }

    static void logEntry(StringBuilder sb, LogEntry e) {
        sb.append("{");
        field(sb, "id");           quoted(sb, e.id()); sb.append(',');
        field(sb, "instant");      sb.append(e.instant()).append(',');
        field(sb, "processId");    num(sb, e.processId()); sb.append(',');
        field(sb, "processColor"); quoted(sb, e.processColor()); sb.append(',');
        field(sb, "kind");         quoted(sb, e.kind()); sb.append(',');
        field(sb, "resource");     quoted(sb, e.resource()); sb.append(',');
        field(sb, "message");      quoted(sb, e.message());
        sb.append("}");
    }

    // ------------------------------------------------------------------ utilidades

    /** Escritor de un elemento: evita repetir el bucle de cada lista. */
    interface Writer<T> {
        void write(StringBuilder sb, T item);
    }

    static <T> void list(StringBuilder sb, List<T> items, Writer<T> writer) {
        sb.append('[');
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) sb.append(',');
            writer.write(sb, items.get(i));
        }
        sb.append(']');
    }

    /**
     * Error de compilacion o de ejecucion: {@code {error, line}} ({@code ApiError} en types.ts).
     */
    static String error(String message, int line) {
        StringBuilder sb = new StringBuilder("{");
        field(sb, "error"); quoted(sb, message); sb.append(',');
        field(sb, "line");  sb.append(line > 0 ? Integer.toString(line) : "null");
        return sb.append("}").toString();
    }
}
