package ar.edu.unlp.info.simulador.js;

import ar.edu.unlp.info.simulador.vm.LogEntry;
import ar.edu.unlp.info.simulador.vm.Snapshot;

import java.util.List;

/**
 * Serializacion manual a JSON. Jackson usa reflexion y TeaVM compila de forma estatica:
 * hay que escribirlo a mano.
 *
 * <p>Las formas producidas son exactamente las que declara {@code frontend/src/types.ts};
 * el contrato se prueba en {@code SimuladorJsTest}.
 */
final class Json {

    private Json() { }

    // ------------------------------------------------------------------ primitivas

    static void str(StringBuilder sb, String s) {
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

    private static void campo(StringBuilder sb, String nombre) {
        str(sb, nombre);
        sb.append(':');
    }

    // ------------------------------------------------------------------ DTOs

    private static void procRef(StringBuilder sb, Snapshot.ProcRef p) {
        if (p == null) {
            sb.append("null");
            return;
        }
        sb.append("{");
        campo(sb, "id");    sb.append(p.id()).append(',');
        campo(sb, "name");  str(sb, p.name()); sb.append(',');
        campo(sb, "color"); str(sb, p.color());
        sb.append("}");
    }

    private static void varView(StringBuilder sb, Snapshot.VarView v) {
        sb.append("{");
        campo(sb, "name");         str(sb, v.name()); sb.append(',');
        campo(sb, "type");         str(sb, v.type()); sb.append(',');
        campo(sb, "value");        str(sb, v.value()); sb.append(',');
        campo(sb, "isArray");      sb.append(v.isArray()).append(',');
        campo(sb, "lastWriterId"); num(sb, v.lastWriterId());
        sb.append("}");
    }

    private static void condView(StringBuilder sb, Snapshot.CondView c) {
        sb.append("{");
        campo(sb, "name");  str(sb, c.name()); sb.append(',');
        campo(sb, "queue"); lista(sb, c.queue(), Json::procRef);
        sb.append("}");
    }

    private static void monitorView(StringBuilder sb, Snapshot.MonitorView m) {
        sb.append("{");
        campo(sb, "name");       str(sb, m.name()); sb.append(',');
        campo(sb, "vars");       lista(sb, m.vars(), Json::varView); sb.append(',');
        campo(sb, "conds");      lista(sb, m.conds(), Json::condView); sb.append(',');
        campo(sb, "lockOwner");  procRef(sb, m.lockOwner()); sb.append(',');
        campo(sb, "entryQueue"); lista(sb, m.entryQueue(), Json::procRef);
        sb.append("}");
    }

    private static void processView(StringBuilder sb, Snapshot.ProcessView p) {
        sb.append("{");
        campo(sb, "id");          sb.append(p.id()).append(',');
        campo(sb, "name");        str(sb, p.name()); sb.append(',');
        campo(sb, "color");       str(sb, p.color()); sb.append(',');
        campo(sb, "state");       str(sb, p.state()); sb.append(',');
        campo(sb, "blockReason"); str(sb, p.blockReason()); sb.append(',');
        campo(sb, "blockedOn");   str(sb, p.blockedOn()); sb.append(',');
        campo(sb, "location");    str(sb, p.location()); sb.append(',');
        campo(sb, "line");        sb.append(p.line()).append(',');
        campo(sb, "locals");      lista(sb, p.locals(), Json::varView); sb.append(',');
        campo(sb, "error");       str(sb, p.error()); sb.append(',');
        campo(sb, "advanced");    sb.append(p.advanced());
        sb.append("}");
    }

    private static void outputLine(StringBuilder sb, Snapshot.OutputLine o) {
        sb.append("{");
        campo(sb, "instant"); sb.append(o.instant()).append(',');
        campo(sb, "process"); str(sb, o.process()); sb.append(',');
        campo(sb, "color");   str(sb, o.color()); sb.append(',');
        campo(sb, "text");    str(sb, o.text());
        sb.append("}");
    }

    static void snapshot(StringBuilder sb, Snapshot s) {
        sb.append("{");
        campo(sb, "instant");   sb.append(s.instant()).append(',');
        campo(sb, "processes"); lista(sb, s.processes(), Json::processView); sb.append(',');
        campo(sb, "monitors");  lista(sb, s.monitors(), Json::monitorView); sb.append(',');
        campo(sb, "output");    lista(sb, s.output(), Json::outputLine);
        sb.append("}");
    }

    static void logEntry(StringBuilder sb, LogEntry e) {
        sb.append("{");
        campo(sb, "id");           str(sb, e.id()); sb.append(',');
        campo(sb, "instant");      sb.append(e.instant()).append(',');
        campo(sb, "processId");    num(sb, e.processId()); sb.append(',');
        campo(sb, "processColor"); str(sb, e.processColor()); sb.append(',');
        campo(sb, "kind");         str(sb, e.kind()); sb.append(',');
        campo(sb, "resource");     str(sb, e.resource()); sb.append(',');
        campo(sb, "message");      str(sb, e.message());
        sb.append("}");
    }

    // ------------------------------------------------------------------ utilidades

    /** Escritor de un elemento: evita repetir el bucle de cada lista. */
    interface Escritor<T> {
        void escribir(StringBuilder sb, T item);
    }

    static <T> void lista(StringBuilder sb, List<T> items, Escritor<T> escritor) {
        sb.append('[');
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) sb.append(',');
            escritor.escribir(sb, items.get(i));
        }
        sb.append(']');
    }

    /** Error de compilacion o de ejecucion: {@code {error, line}} ({@code ApiError} en types.ts). */
    static String error(String mensaje, int linea) {
        StringBuilder sb = new StringBuilder("{");
        campo(sb, "error"); str(sb, mensaje); sb.append(',');
        campo(sb, "line");  sb.append(linea > 0 ? Integer.toString(linea) : "null");
        return sb.append("}").toString();
    }
}
