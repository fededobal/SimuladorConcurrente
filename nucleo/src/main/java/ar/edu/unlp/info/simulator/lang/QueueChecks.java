package ar.edu.unlp.info.simulator.lang;

import ar.edu.unlp.info.simulator.lang.Scope.Symbol;
import ar.edu.unlp.info.simulator.lang.parser.ast.Stmt;
import ar.edu.unlp.info.simulator.lang.parser.ast.Type;

import java.util.List;
import java.util.function.Function;

/**
 * Controles de push y pop contra la declaracion de la cola: la cantidad de componentes y que
 * cada una se pueda guardar donde va (las conversiones de siempre: un int donde va un double,
 * un numero donde va un text).
 */
final class QueueChecks {

    private QueueChecks() { }

    /**
     * Las componentes de un push, contra la declaracion de la cola: la misma cantidad y, para
     * cada una, un valor que se pueda guardar en ese tipo (las conversiones de siempre: un int
     * donde va un double, un numero donde va un text).
     */
    static void checkPush(Stmt.QueuePush qp, Scope scope) {
        List<Type> comps = elementTypes(qp.queue(), scope, qp.line());
        checkComponentCount(qp.queue(), comps, qp.elements().size(), "push", qp.line());
        for (int i = 0; i < comps.size(); i++) {
            Type value = ExprTyper.typeOf(qp.elements().get(i), scope);
            if (!ExprTyper.assignable(comps.get(i), value)) {
                throw new CompilationException("La componente " + (i + 1) + " de '" + qp.queue()
                        + "' es " + comps.get(i).keyword() + " y se está encolando un "
                        + value.keyword(), qp.line());
            }
        }
    }

    /**
     * Los destinos de un pop: uno por componente, cada uno capaz de guardar la suya.
     * {@code targetType} da el tipo de un destino y controla que se pueda escribir: eso lo
     * sabe el validador, que conoce los alcances.
     */
    static void checkPop(Stmt.QueuePop qp, Scope scope, Function<String, Type> targetType) {
        List<Type> comps = elementTypes(qp.queue(), scope, qp.line());
        checkComponentCount(qp.queue(), comps, qp.targets().size(), "pop", qp.line());
        for (int i = 0; i < comps.size(); i++) {
            String target = qp.targets().get(i);
            Type destination = targetType.apply(target);
            if (!ExprTyper.assignable(destination, comps.get(i))) {
                throw new CompilationException("La componente " + (i + 1) + " de '" + qp.queue()
                        + "' es " + comps.get(i).keyword() + " y no se puede guardar en '" + target
                        + "', que es " + destination.keyword(), qp.line());
            }
        }
    }

    private static void checkComponentCount(String queue, List<Type> comps, int used, String op,
            int line) {
        if (used != comps.size()) {
            throw new CompilationException("La cola '" + queue + "' guarda "
                    + describeComponents(comps) + ": este " + op + " tiene " + used
                    + (used == 1 ? " componente" : " componentes") + " y se esperaba"
                    + (comps.size() == 1 ? " 1" : "n " + comps.size()), line);
        }
    }

    /** "(int, text)" o, con una sola componente, "int". */
    private static String describeComponents(List<Type> comps) {
        if (comps.size() == 1) return comps.get(0).keyword();
        StringBuilder sb = new StringBuilder("(");
        for (int i = 0; i < comps.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(comps.get(i).keyword());
        }
        return sb.append(')').toString();
    }

    private static List<Type> elementTypes(String name, Scope scope, int line) {
        Symbol sym = ExprTyper.known(name, scope, line);
        if (sym.elementTypes() == null) {
            throw new CompilationException("'" + name + "' no es una cola", line);
        }
        return sym.elementTypes();
    }
}
