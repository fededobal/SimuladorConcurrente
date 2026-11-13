package ar.edu.unlp.info.simulador.lang;

import ar.edu.unlp.info.simulador.lang.parser.ast.Type;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Alcance de nombres durante la validacion: cada bloque abre uno hijo. Un nombre no puede
 * declararse si ya se ve desde ahi (permanente, parametro, iterador u otra local): la VM
 * guarda las locales de una activacion juntas, y un nombre tapado terminaba escribiendo
 * sobre la variable equivocada.
 */
final class Scope {

    /** Tipo declarado de un nombre: un escalar, un arreglo de escalares o una cola. */
    record VarType(Type base, boolean isArray) {
        boolean isQueue() { return base.isQueue(); }
        boolean isScalar() { return !isArray && !base.isQueue(); }
    }

    /**
     * @param origin   que es, para los mensajes ("una variable permanente", "un parametro"...)
     * @param queueKey sitio de declaracion si es una cola (fija su cantidad de componentes)
     */
    record Symbol(VarType type, boolean readOnly, String origin, String queueKey) { }

    private final Scope parent;
    private final Map<String, Symbol> symbols = new HashMap<>();
    /** Iteradores de for que no se pueden modificar dentro de este cuerpo. */
    private final Set<String> frozen = new HashSet<>();

    /** Monitor cuyo codigo se valida (procedure o inicializacion); null en un proceso. */
    final String monitor;
    /** true dentro de un procedure: ahi se permiten wait y signal. */
    final boolean inProcedure;
    /** Nombres de las variables condicion del monitor (vacio en un proceso). */
    private final Set<String> conds;

    Scope(Scope parent, String monitor, boolean inProcedure, Set<String> conds) {
        this.parent = parent;
        this.monitor = monitor;
        this.inProcedure = inProcedure;
        this.conds = conds;
    }

    Scope child() {
        return new Scope(this, monitor, inProcedure, conds);
    }

    /** true si el nombre es una variable condicion del monitor y no la tapa otro simbolo. */
    boolean isCond(String name) {
        return conds.contains(name) && lookup(name) == null;
    }

    /** @return el simbolo visible con ese nombre, o null si no existe */
    Symbol lookup(String name) {
        for (Scope s = this; s != null; s = s.parent) {
            Symbol sym = s.symbols.get(name);
            if (sym != null) return sym;
        }
        return null;
    }

    void declare(String name, Symbol sym, int line) {
        Symbol previous = lookup(name);
        if (previous != null) {
            throw new CompilationException("Ya existe " + previous.origin() + " llamada '" + name
                    + "': elegí otro nombre para no taparla", line);
        }
        symbols.put(name, sym);
    }

    void freeze(String name) {
        frozen.add(name);
    }

    /** true si el nombre es el iterador de un for que encierra este punto del codigo. */
    boolean isFrozen(String name) {
        for (Scope s = this; s != null; s = s.parent) {
            if (s.frozen.contains(name)) return true;
            if (s.symbols.containsKey(name)) return false;
        }
        return false;
    }
}
