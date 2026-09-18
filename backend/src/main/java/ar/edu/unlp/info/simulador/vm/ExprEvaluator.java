package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.lang.parser.ast.Expr;

import java.util.function.Function;

/**
 * Evalua una {@link Expr} contra un resolvedor de nombres. El resolvedor mapea el nombre de
 * una variable simple, arreglo o cola a su {@link Value} actual.
 */
public final class ExprEvaluator {

    private final Function<String, Value> resolver;

    public ExprEvaluator(Function<String, Value> resolver) {
        this.resolver = resolver;
    }

    public Value eval(Expr e) {
        return switch (e) {
            case Expr.IntLit i -> new Value.IntVal(i.value());
            case Expr.DoubleLit d -> new Value.DoubleVal(d.value());
            case Expr.BoolLit b -> new Value.BoolVal(b.value());
            case Expr.TextLit t -> new Value.TextVal(t.value());
            case Expr.VarRef v -> resolve(v.name(), v.line());
            case Expr.ArrayAccess a -> evalArrayAccess(a);
            case Expr.EmptyQueue q -> evalEmpty(q);
            case Expr.Unary u -> evalUnary(u);
            case Expr.Binary b -> evalBinary(b);
        };
    }

    public int evalInt(Expr e) {
        return (int) eval(e).asLong();
    }

    public boolean evalBool(Expr e) {
        return eval(e).asBool();
    }

    // ----------------------------------------------------------------

    private Value resolve(String name, int line) {
        Value v = resolver.apply(name);
        if (v == null) {
            throw new RuntimeError("Variable no definida: " + name, line);
        }
        return v;
    }

    private Value evalArrayAccess(Expr.ArrayAccess a) {
        Value base = resolve(a.name(), a.line());
        if (!(base instanceof Value.ArrayVal arr)) {
            throw new RuntimeError("'" + a.name() + "' no es un arreglo", a.line());
        }
        int idx = (int) eval(a.index()).asLong();
        if (idx < 0 || idx >= arr.size()) {
            throw new RuntimeError(
                    "Indice " + idx + " fuera de rango para '" + a.name() + "' (tamano " + arr.size() + ")",
                    a.line());
        }
        return arr.get(idx);
    }

    private Value evalEmpty(Expr.EmptyQueue q) {
        Value base = resolve(q.queue(), q.line());
        if (!(base instanceof Value.QueueVal cola)) {
            throw new RuntimeError("'" + q.queue() + "' no es una cola", q.line());
        }
        return new Value.BoolVal(cola.isEmpty());
    }

    private Value evalUnary(Expr.Unary u) {
        Value operand = eval(u.operand());
        return switch (u.op()) {
            case "-" -> operand instanceof Value.DoubleVal
                    ? new Value.DoubleVal(-operand.asDouble())
                    : new Value.IntVal(negateExact(operand.asLong(), u.line()));
            case "not" -> new Value.BoolVal(!operand.asBool());
            default -> throw new RuntimeError("Operador unario desconocido: " + u.op(), u.line());
        };
    }

    private Value evalBinary(Expr.Binary b) {
        // corto-circuito para logicos
        if (b.op().equals("and")) {
            return new Value.BoolVal(eval(b.left()).asBool() && eval(b.right()).asBool());
        }
        if (b.op().equals("or")) {
            return new Value.BoolVal(eval(b.left()).asBool() || eval(b.right()).asBool());
        }

        Value l = eval(b.left());
        Value r = eval(b.right());

        return switch (b.op()) {
            case "+" -> {
                if (l instanceof Value.TextVal || r instanceof Value.TextVal) {
                    yield new Value.TextVal(l.asText() + r.asText());
                }
                yield arith(l, r, Double::sum, Math::addExact, b.line());
            }
            case "-" -> arith(l, r, (x, y) -> x - y, Math::subtractExact, b.line());
            case "*" -> arith(l, r, (x, y) -> x * y, Math::multiplyExact, b.line());
            case "/" -> {
                if (bothInt(l, r)) {
                    if (r.asLong() == 0) throw new RuntimeError("Division por cero", b.line());
                    if (l.asLong() == Long.MIN_VALUE && r.asLong() == -1) {
                        throw RuntimeError.overflow(b.line());
                    }
                    yield new Value.IntVal(l.asLong() / r.asLong());
                }
                if (r.asDouble() == 0) throw new RuntimeError("Division por cero", b.line());
                yield new Value.DoubleVal(l.asDouble() / r.asDouble());
            }
            case "%" -> {
                if (r.asLong() == 0) throw new RuntimeError("Modulo por cero", b.line());
                yield new Value.IntVal(l.asLong() % r.asLong());
            }
            case "==" -> new Value.BoolVal(equalValues(l, r));
            case "!=" -> new Value.BoolVal(!equalValues(l, r));
            case "<" -> new Value.BoolVal(l.asDouble() < r.asDouble());
            case "<=" -> new Value.BoolVal(l.asDouble() <= r.asDouble());
            case ">" -> new Value.BoolVal(l.asDouble() > r.asDouble());
            case ">=" -> new Value.BoolVal(l.asDouble() >= r.asDouble());
            default -> throw new RuntimeError("Operador desconocido: " + b.op(), b.line());
        };
    }

    private interface DoubleOp { double apply(double a, double b); }
    private interface LongOp { long apply(long a, long b); }

    /** Las operaciones enteras usan las variantes exactas de Math: un desborde es error del alumno. */
    private static Value arith(Value l, Value r, DoubleOp dOp, LongOp lOp, int line) {
        if (bothInt(l, r)) {
            try {
                return new Value.IntVal(lOp.apply(l.asLong(), r.asLong()));
            } catch (ArithmeticException e) {
                throw RuntimeError.overflow(line);
            }
        }
        return new Value.DoubleVal(dOp.apply(l.asDouble(), r.asDouble()));
    }

    private static long negateExact(long v, int line) {
        if (v == Long.MIN_VALUE) throw RuntimeError.overflow(line);
        return -v;
    }

    private static boolean bothInt(Value l, Value r) {
        return l instanceof Value.IntVal && r instanceof Value.IntVal;
    }

    private static boolean equalValues(Value l, Value r) {
        if (l instanceof Value.TextVal || r instanceof Value.TextVal) {
            return l.asText().equals(r.asText());
        }
        if (l instanceof Value.BoolVal || r instanceof Value.BoolVal) {
            return l.asBool() == r.asBool();
        }
        return l.asDouble() == r.asDouble();
    }
}
