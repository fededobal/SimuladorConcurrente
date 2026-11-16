package ar.edu.unlp.info.simulador.lang.parser;

import ar.edu.unlp.info.simulador.lang.CompilationException;
import ar.edu.unlp.info.simulador.lang.lexer.Token;
import ar.edu.unlp.info.simulador.lang.parser.ast.Expr;
import ar.edu.unlp.info.simulador.lang.parser.ast.Stmt;
import ar.edu.unlp.info.simulador.lang.parser.ast.Type;

import java.util.ArrayList;
import java.util.List;

/**
 * Sintaxis de las colas: los tipos de las componentes en la declaracion y las sentencias
 * {@code push} y {@code pop}. Las tres admiten las mismas formas (componentes sueltas, una
 * tupla, o la clave separada del resto entre parentesis) y rechazan los parentesis de mas
 * con un mensaje que muestra la forma valida.
 */
final class QueueSyntaxParser {

    private final TokenCursor tokens;
    private final ExpressionParser expressions;

    QueueSyntaxParser(TokenCursor tokens, ExpressionParser expressions) {
        this.tokens = tokens;
        this.expressions = expressions;
    }

    /**
     * Los tipos de las componentes de una cola: {@code (int)}, {@code (int, text, text)} o,
     * con la clave separada del resto, {@code (int, (text, text))}. El grupo entre parentesis
     * solo agrupa: las dos ultimas formas declaran la misma cola. Solo se admite un grupo,
     * despues de la primera componente, y adentro van tipos sueltos.
     */
    List<Type> parseElementTypes(Type queue, String name) {
        // la forma, con el nombre que escribio el alumno: "Cola c(tipo, (tipo, ...))"
        String form = queue.keyword() + " " + name + "(tipo, (tipo, ...))";
        if (!tokens.match("(")) {
            throw tokens.error("Declarar la cola con los tipos de sus componentes: "
                    + queue.keyword() + " " + name + "(tipo, ...)");
        }
        if (tokens.check("(")) {
            throw tokens.error("La primera componente de '" + name + "' va sin paréntesis; "
                    + "el grupo entre paréntesis va después de ella: " + form);
        }
        List<Type> types = new ArrayList<>();
        types.add(parseElementType());
        if (tokens.match(",")) {
            if (tokens.match("(")) {
                do {
                    if (tokens.check("(")) {
                        throw tokens.error("Dentro del grupo de '" + name
                                + "' van solo tipos, sin más paréntesis: " + form);
                    }
                    types.add(parseElementType());
                } while (tokens.match(","));
                tokens.consume(")",
                        "Se esperaba ')' al cerrar el grupo de tipos de '" + name + "'");
                if (!tokens.check(")")) {
                    throw tokens.error("Después del grupo entre paréntesis se cierra la "
                            + "declaración de '" + name + "': " + form);
                }
            } else {
                do {
                    if (tokens.check("(")) {
                        throw tokens.error("El grupo entre paréntesis de '" + name
                                + "' va justo después de la primera componente: " + form);
                    }
                    types.add(parseElementType());
                } while (tokens.match(","));
            }
        }
        tokens.consume(")", "Se esperaba ')' al cerrar los tipos de '" + name + "'");
        return types;
    }

    private Type parseElementType() {
        Token t = tokens.peek();
        if (!TokenCursor.isScalarType(t)) {
            throw tokens.error("Las componentes de una cola son int, double, bool o text "
                    + "(se encontró '" + TokenCursor.describe(t) + "')");
        }
        tokens.advance();
        return Type.fromKeyword(t.lexeme());
    }

    /**
     * {@code push(c, ...)} y {@code pop(c, ...)}. Las componentes se escriben de tres formas,
     * que significan lo mismo: sueltas, {@code push(c, id, nombre, apellido)}; como tupla,
     * {@code push(c, (id, nombre, apellido))}; o con la clave separada del resto,
     * {@code push(c, (id, (nombre, apellido)))}. Igual para {@code pop}. Mas parentesis que
     * esos es error.
     */
    Stmt parseQueueOp() {
        Token kw = tokens.advance();
        tokens.consume("(", "Se esperaba '(' después de '" + kw.lexeme() + "'");
        String queue = tokens.consumeIdent("Se esperaba el nombre de la cola");
        tokens.consume(",", "Se esperaba ',' después del nombre de la cola");
        Stmt op;
        if (kw.is("push")) {
            op = new Stmt.QueuePush(queue, parsePushElements(queue), kw.line());
        } else {
            op = new Stmt.QueuePop(queue, parsePopTargets(queue), kw.line());
        }
        tokens.consume(")", "Se esperaba ')'");
        tokens.consume(";", "Se esperaba ';'");
        return op;
    }

    private List<Expr> parsePushElements(String queue) {
        String validForms = "push(" + queue + ", componentes), push(" + queue
                + ", (componentes)) o push(" + queue + ", (clave, (resto)))";
        List<Expr> elems = new ArrayList<>();
        if (tupleAhead()) {
            tokens.advance();
            if (tupleAhead()) {
                throw tokens.error("Sobran paréntesis en el push a '" + queue
                        + "'; las formas válidas son " + validForms);
            }
            elems.add(expressions.parseExpr());
            if (tokens.match(",")) {
                if (tupleAhead()) {
                    // la clave y, entre parentesis, el resto de las componentes
                    tokens.advance();
                    do {
                        if (tupleAhead()) {
                            throw tokens.error("Dentro del grupo van las componentes sueltas, "
                                    + "sin más paréntesis: push(" + queue
                                    + ", (clave, (resto)))");
                        }
                        elems.add(expressions.parseExpr());
                    } while (tokens.match(","));
                    tokens.consume(")", "Se esperaba ')' al cerrar el grupo de la tupla");
                    if (tokens.check(",")) {
                        throw tokens.error("Después del grupo entre paréntesis se cierra la "
                                + "tupla: push(" + queue + ", (clave, (resto)))");
                    }
                } else {
                    do {
                        if (tupleAhead()) {
                            throw tokens.error("El grupo entre paréntesis va justo después de la "
                                    + "primera componente: push(" + queue
                                    + ", (clave, (resto)))");
                        }
                        elems.add(expressions.parseExpr());
                    } while (tokens.match(","));
                }
            }
            tokens.consume(")", "Se esperaba ')' al cerrar la tupla");
            return elems;
        }
        do {
            if (tupleAhead()) {
                throw tokens.error("Los paréntesis de la tupla van alrededor de todas las "
                        + "componentes; las formas válidas son " + validForms);
            }
            elems.add(expressions.parseExpr());
        } while (tokens.match(","));
        return elems;
    }

    private List<String> parsePopTargets(String queue) {
        String targetError = "Se esperaba una variable destino para 'pop'";
        String validForms = "pop(" + queue + ", destinos), pop(" + queue + ", (destinos)) o pop("
                + queue + ", (clave, (resto)))";
        List<String> targets = new ArrayList<>();
        if (tokens.match("(")) {
            if (tokens.check("(")) {
                throw tokens.error("Sobran paréntesis en el pop de '" + queue
                        + "'; las formas válidas son " + validForms);
            }
            targets.add(tokens.consumeIdent(targetError));
            if (tokens.match(",")) {
                if (tokens.match("(")) {
                    do {
                        targets.add(tokens.consumeIdent(targetError));
                    } while (tokens.match(","));
                    tokens.consume(")", "Se esperaba ')' al cerrar el grupo de destinos");
                    if (tokens.check(",")) {
                        throw tokens.error("Después del grupo entre paréntesis se cierra la "
                                + "tupla: pop(" + queue + ", (clave, (resto)))");
                    }
                } else {
                    do {
                        if (tokens.check("(")) {
                            throw tokens.error("El grupo entre paréntesis va justo después del "
                                    + "primer destino: pop(" + queue
                                    + ", (clave, (resto)))");
                        }
                        targets.add(tokens.consumeIdent(targetError));
                    } while (tokens.match(","));
                }
            }
            tokens.consume(")", "Se esperaba ')' al cerrar la tupla");
            return targets;
        }
        do {
            if (tokens.check("(")) {
                throw tokens.error("Los paréntesis de la tupla van alrededor de todos los "
                        + "destinos; las formas válidas son " + validForms);
            }
            targets.add(tokens.consumeIdent(targetError));
        } while (tokens.match(","));
        return targets;
    }

    /**
     * true si lo que sigue es una tupla {@code (e1, e2, ...)}. Un parentesis con una sola
     * expresion no lo es: es una expresion agrupada, como {@code push(c, (a + b) * 2)}. Mira
     * hacia adelante sin consumir nada.
     */
    private boolean tupleAhead() {
        if (!tokens.check("(")) return false;
        int start = tokens.mark();
        try {
            tokens.advance();
            // "((" con una tupla adentro tambien cuenta: quien llama avisa que sobran parentesis
            if (tokens.check("(") && tupleAhead()) return true;
            expressions.parseExpr();
            return tokens.check(",");
        } catch (CompilationException e) {
            return false;
        } finally {
            tokens.reset(start);
        }
    }
}
