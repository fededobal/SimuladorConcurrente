package ar.edu.unlp.info.simulador.lang;

import ar.edu.unlp.info.simulador.lang.parser.ast.Expr;
import ar.edu.unlp.info.simulador.lang.parser.ast.Type;

/**
 * Tipos de las expresiones, calculados al compilar. Un error de tipos ({@code if (x)} con
 * x entero, {@code "a" * 2}) se informa antes de correr, con su linea.
 *
 * <p>Conversiones implicitas: solo int a double y un numero a text. {@code +} con un text
 * concatena. Las comparaciones son entre numeros o entre valores del mismo tipo.
 */
final class ExprTyper {

    private ExprTyper() { }

    /** @return el tipo escalar de la expresion; un arreglo o una cola enteros son error */
    static Type typeOf(Expr e, Scope scope) {
        return switch (e) {
            case Expr.IntLit ignored -> Type.INT;
            case Expr.DoubleLit ignored -> Type.DOUBLE;
            case Expr.BoolLit ignored -> Type.BOOLEAN;
            case Expr.TextLit ignored -> Type.TEXT;
            case Expr.VarRef v -> scalarOf(v.name(), scope, v.line());
            case Expr.ArrayAccess a -> {
                Scope.VarType t = known(a.name(), scope, a.line()).type();
                if (!t.isArray()) throw error("'" + a.name() + "' no es un arreglo", a.line());
                expect(a.index(), Type.INT, scope, "El índice de '" + a.name() + "'");
                yield t.base();
            }
            case Expr.EmptyQueue q -> {
                if (scope.isCond(q.queue())) {
                    throw error("En la práctica no se permite preguntar si una variable "
                            + "condición está vacía", q.line());
                }
                if (!known(q.queue(), scope, q.line()).type().isQueue()) {
                    throw error("'" + q.queue() + "' no es una cola: empty se usa con una Cola o "
                            + "una ColaOrdenada", q.line());
                }
                yield Type.BOOLEAN;
            }
            case Expr.Unary u -> unary(u, scope);
            case Expr.Binary b -> binary(b, scope);
        };
    }

    /** Argumento de write: ademas de escalares, se puede mostrar un arreglo o una cola enteros. */
    static void checkWriteArg(Expr e, Scope scope) {
        if (e instanceof Expr.VarRef v && !known(v.name(), scope, v.line()).type().isScalar()) {
            return;
        }
        typeOf(e, scope);
    }

    /** Exige un tipo exacto: condiciones (boolean), indices y tamanos (int). */
    static void expect(Expr e, Type wanted, Scope scope, String what) {
        Type t = typeOf(e, scope);
        if (t != wanted) {
            throw error(what + " tiene que ser " + wanted.keyword() + " y es " + t.keyword(),
                    e.line());
        }
    }

    /** Controla que el valor de la expresion se pueda guardar en un destino del tipo dado. */
    static void checkAssignable(Type target, Expr value, Scope scope, String destination,
            int line) {
        Type v = typeOf(value, scope);
        if (!assignable(target, v)) {
            throw error("No se puede guardar un " + v.keyword() + " en '" + destination
                    + "', que es " + target.keyword(), line);
        }
    }

    static boolean assignable(Type target, Type value) {
        return target == value
                || target == Type.DOUBLE && value == Type.INT
                || target == Type.TEXT && isNumeric(value);
    }

    static Scope.Symbol known(String name, Scope scope, int line) {
        Scope.Symbol sym = scope.lookup(name);
        if (sym == null) throw error("Nombre no declarado en este alcance: " + name, line);
        return sym;
    }

    // ----------------------------------------------------------------

    private static Type scalarOf(String name, Scope scope, int line) {
        Scope.VarType t = known(name, scope, line).type();
        if (t.isArray()) {
            throw error("'" + name + "' es un arreglo: falta el índice, " + name + "[índice]",
                    line);
        }
        if (t.isQueue()) {
            throw error("'" + name + "' es una cola: se usa con push, pop y empty", line);
        }
        return t.base();
    }

    private static Type unary(Expr.Unary u, Scope scope) {
        Type t = typeOf(u.operand(), scope);
        if (u.op().equals("not")) {
            if (t != Type.BOOLEAN) throw error("'not' se aplica a un bool, no a un "
                    + t.keyword(), u.line());
            return Type.BOOLEAN;
        }
        if (!isNumeric(t)) throw error("El '-' se aplica a un número, no a un " + t.keyword(),
                u.line());
        return t;
    }

    private static Type binary(Expr.Binary b, Scope scope) {
        Type l = typeOf(b.left(), scope);
        Type r = typeOf(b.right(), scope);
        return switch (b.op()) {
            case "and", "or" -> {
                if (l != Type.BOOLEAN || r != Type.BOOLEAN) {
                    throw error("'" + b.op() + "' une dos bool, no un " + l.keyword() + " y un "
                            + r.keyword(), b.line());
                }
                yield Type.BOOLEAN;
            }
            case "+" -> l == Type.TEXT || r == Type.TEXT ? Type.TEXT : numeric(b, l, r);
            case "-", "*", "/", "mod" -> numeric(b, l, r);
            case "==", "!=" -> {
                if (!(isNumeric(l) && isNumeric(r)) && l != r) throw cannotCompare(b, l, r);
                yield Type.BOOLEAN;
            }
            default -> {   // < <= > >=
                if (!(isNumeric(l) && isNumeric(r)) && !(l == Type.TEXT && r == Type.TEXT)) {
                    throw cannotCompare(b, l, r);
                }
                yield Type.BOOLEAN;
            }
        };
    }

    private static Type numeric(Expr.Binary b, Type l, Type r) {
        if (!isNumeric(l) || !isNumeric(r)) {
            throw error("El operador '" + b.op() + "' se aplica a números, no a un " + l.keyword()
                    + " y un " + r.keyword(), b.line());
        }
        return l == Type.INT && r == Type.INT ? Type.INT : Type.DOUBLE;
    }

    private static CompilationException cannotCompare(Expr.Binary b, Type l, Type r) {
        return error("No se puede comparar un " + l.keyword() + " con un " + r.keyword()
                + " usando '" + b.op() + "'", b.line());
    }

    private static boolean isNumeric(Type t) {
        return t == Type.INT || t == Type.DOUBLE;
    }

    private static CompilationException error(String message, int line) {
        return new CompilationException(message, line);
    }
}
