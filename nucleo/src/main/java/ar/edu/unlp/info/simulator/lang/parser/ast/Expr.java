package ar.edu.unlp.info.simulator.lang.parser.ast;

import java.util.List;

/**
 * Expresion del lenguaje. Las expresiones se parsean a un arbol (no se guardan como texto
 * para evaluar despues), lo que permite validarlas y evaluarlas de forma deterministica.
 */
public sealed interface Expr {

    int line();

    record IntLit(long value, int line) implements Expr { }

    record DoubleLit(double value, int line) implements Expr { }

    record BoolLit(boolean value, int line) implements Expr { }

    record TextLit(String value, int line) implements Expr { }

    /** Referencia a una variable simple (local, parametro, permanente, constante o iterador). */
    record VarRef(String name, int line) implements Expr { }

    /** Acceso indexado a un arreglo: {@code nombre[indice]}. */
    record ArrayAccess(String name, Expr index, int line) implements Expr { }

    /** Operador unario: {@code -} o {@code not}. */
    record Unary(String op, Expr operand, int line) implements Expr { }

    /** Operador binario aritmetico, de comparacion o logico. */
    record Binary(String op, Expr left, Expr right, int line) implements Expr { }

    /** {@code empty cola} : true si la cola no tiene elementos. */
    record EmptyQueue(String queue, int line) implements Expr { }

    /** Utilidad: lista de sub-expresiones directas (para recorridos del validador). */
    default List<Expr> children() {
        return switch (this) {
            case ArrayAccess a -> List.of(a.index());
            case Unary u -> List.of(u.operand());
            case Binary b -> List.of(b.left(), b.right());
            case IntLit ignored -> List.of();
            case DoubleLit ignored -> List.of();
            case BoolLit ignored -> List.of();
            case TextLit ignored -> List.of();
            case VarRef ignored -> List.of();
            case EmptyQueue ignored -> List.of();
        };
    }
}
