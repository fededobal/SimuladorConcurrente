package ar.edu.unlp.info.simulador.lang.parser.ast;

import java.util.List;

/**
 * Sentencia del lenguaje. Cada sentencia (o la evaluacion de una guarda, o una llamada a
 * monitor) es un paso atomico del scheduler.
 */
public sealed interface Stmt
        permits Stmt.Block, Stmt.Assign, Stmt.IncDec, Stmt.MonitorCall, Stmt.CondOp,
                Stmt.QueuePush, Stmt.QueuePop, Stmt.Write, Stmt.IfStmt, Stmt.WhileStmt, Stmt.ForStmt,
                Stmt.Skip, VarDecl {

    int line();

    record Block(List<Stmt> statements, int line) implements Stmt { }

    /** {@code target = value;} o {@code target[index] = value;} */
    record Assign(String target, Expr index, Expr value, int line) implements Stmt { }

    /** {@code target++;} / {@code target--;} (opcionalmente indexado). */
    record IncDec(String target, Expr index, boolean increment, int line) implements Stmt { }

    /** {@code Monitor.procedure(args);} */
    record MonitorCall(String monitor, String procedure, List<Expr> args, int line) implements Stmt { }

    enum CondOpKind { WAIT, SIGNAL, SIGNAL_ALL }

    /** {@code wait(cv);} / {@code signal(cv);} / {@code signal_all(cv);} (cv opcionalmente indexada). */
    record CondOp(CondOpKind kind, String cond, Expr index, int line) implements Stmt { }

    /** {@code push(cola, e1, e2, ...);} */
    record QueuePush(String queue, List<Expr> elements, int line) implements Stmt { }

    /** {@code write(e1, e2, ...);} - escribe una linea en la pantalla de salida. */
    record Write(List<Expr> args, int line) implements Stmt { }

    /** {@code pop(cola, x, y, ...);} */
    record QueuePop(String queue, List<String> targets, int line) implements Stmt { }

    /** {@code if (cond) then [else elseBranch]}. Ramas siempre normalizadas a Block. */
    record IfStmt(Expr condition, Block thenBranch, Block elseBranch, int line) implements Stmt { }

    record WhileStmt(Expr condition, Block body, int line) implements Stmt { }

    /**
     * {@code for (init; condition; step) body}. La forma de rango
     * {@code for (int i = a..b)} se normaliza a esta en el parser.
     * {@code init} es un {@link VarDecl} (iterador nuevo) o un {@link Assign} (variable existente).
     * {@code limit} es null salvo en la forma de rango: una variable oculta con la cota
     * {@code b}, que se evalua una sola vez al entrar al for.
     */
    record ForStmt(Stmt init, VarDecl limit, Expr condition, Stmt step, Block body, int line)
            implements Stmt { }

    record Skip(int line) implements Stmt { }
}
