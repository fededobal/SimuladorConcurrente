package ar.edu.unlp.info.simulator.lang.parser;

import ar.edu.unlp.info.simulator.lang.lexer.Token;
import ar.edu.unlp.info.simulator.lang.parser.ast.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Analizador sintactico (descenso recursivo). Produce un {@link Program}: los monitores con sus
 * declaraciones y procedures, y los procesos. Las sentencias las analiza
 * {@link StatementParser} y las expresiones {@link ExpressionParser}. No hace chequeos
 * semanticos (eso es {@link ar.edu.unlp.info.simulator.lang.SemanticValidator}).
 */
public final class Parser {

    private final TokenCursor tokens;
    private final ExpressionParser expressions;
    private final StatementParser statements;

    public Parser(List<Token> tokens) {
        this.tokens = new TokenCursor(tokens);
        this.expressions = new ExpressionParser(this.tokens);
        this.statements = new StatementParser(this.tokens, expressions);
    }

    // ================================================================= programa

    public Program parseProgram() {
        List<MonitorDef> monitors = new ArrayList<>();
        List<ProcessDef> processes = new ArrayList<>();

        while (!tokens.atEnd()) {
            if (tokens.check("monitor")) {
                monitors.add(parseMonitor());
            } else if (tokens.check("process")) {
                processes.add(parseProcess());
            } else if (TokenCursor.isDeclStart(tokens.peek())) {
                throw tokens.error("No se permiten variables globales");
            } else {
                throw tokens.error("Se esperaba 'monitor' o 'process'");
            }
        }
        return new Program(monitors, processes);
    }

    // ================================================================= monitor

    private MonitorDef parseMonitor() {
        Token kw = tokens.consume("monitor", "Se esperaba 'monitor'");
        String name = tokens.consumeIdent("Se esperaba el nombre del monitor");
        ProcessDef.QuantDef quant =
                tokens.match("[") ? parseQuant("del arreglo de monitores") : null;
        tokens.consume("{", "Se esperaba '{' para abrir el monitor");

        List<VarDecl> perm = new ArrayList<>();
        List<CondDecl> conds = new ArrayList<>();
        List<Stmt> init = new ArrayList<>();
        List<ProcedureDef> procedures = new ArrayList<>();

        while (!tokens.check("}") && !tokens.atEnd()) {
            if (tokens.check("cond")) {
                conds.addAll(parseCondDecls());
            } else if (tokens.check("procedure")) {
                procedures.add(parseProcedure());
            } else if (TokenCursor.isDeclStart(tokens.peek())) {
                perm.addAll(statements.parseVarDecls());
            } else {
                init.add(statements.parseStatement());
            }
        }
        tokens.consume("}", "Se esperaba '}' para cerrar el monitor");
        return new MonitorDef(name, quant, perm, conds, init, procedures, kw.line());
    }

    private List<CondDecl> parseCondDecls() {
        Token kw = tokens.consume("cond", "Se esperaba 'cond'");
        List<CondDecl> result = new ArrayList<>();
        do {
            String name = tokens.consumeIdent("Se esperaba el nombre de la variable condición");
            boolean isArray = false;
            Expr size = null;
            if (tokens.match("[")) {
                isArray = true;
                size = parseExpr();
                tokens.consume("]", "Se esperaba ']' en la declaración de 'cond'");
            }
            result.add(new CondDecl(name, isArray, size, kw.line()));
        } while (tokens.match(","));
        tokens.consume(";", "Se esperaba ';' al final de la declaración de 'cond'");
        return result;
    }

    private ProcedureDef parseProcedure() {
        Token kw = tokens.consume("procedure", "Se esperaba 'procedure'");
        String name = tokens.consumeIdent("Se esperaba el nombre del procedure");
        tokens.consume("(", "Se esperaba '(' después del nombre del procedure");
        List<Param> params = parseParams();
        tokens.consume(")", "Se esperaba ')' al cerrar los parámetros");
        Stmt.Block body = statements.parseBlock();
        return new ProcedureDef(name, params, body, kw.line());
    }

    /**
     * Grupos de parametros separados por ';'. Dentro de un grupo, la coma separa nombres del
     * mismo tipo. Un grupo se escribe como la catedra ({@code idP, edad: in int}) o al estilo
     * C ({@code int a, b}, siempre de entrada).
     */
    private List<Param> parseParams() {
        List<Param> params = new ArrayList<>();
        if (tokens.check(")")) return params;
        do {
            boolean cStyle = TokenCursor.isScalarType(tokens.peek());
            params.addAll(cStyle ? parseCStyleGroup() : parseParamGroup());
        } while (tokens.match(";"));
        return params;
    }

    /** {@code nombre {, nombre} : [modo] tipo} */
    private List<Param> parseParamGroup() {
        List<Token> names = new ArrayList<>();
        do {
            names.add(tokens.consumeIdentToken("Se esperaba el nombre del parámetro"));
        } while (tokens.match(","));
        tokens.consume(":", "Se esperaba ':' después del nombre del parámetro");
        ParamMode mode = ParamMode.IN;
        if (tokens.match("out")) {
            mode = ParamMode.OUT;
        } else {
            tokens.match("in");
        }
        if (tokens.peek().is("inout")) {
            throw tokens.error("El modo inout no existe: un parámetro es in (se lee) "
                    + "u out (se devuelve)");
        }
        if (!TokenCursor.isScalarType(tokens.peek())) {
            throw tokens.error("Se esperaba un tipo escalar (int, double, bool, text) "
                    + "para el parámetro");
        }
        Type type = Type.fromKeyword(tokens.advance().lexeme());
        rejectCommaBetweenGroups();
        List<Param> group = new ArrayList<>();
        for (Token n : names) group.add(new Param(n.lexeme(), type, mode, n.line()));
        return group;
    }

    /** {@code tipo nombre {, nombre}}, al estilo C: parametros de entrada. */
    private List<Param> parseCStyleGroup() {
        Type type = Type.fromKeyword(tokens.advance().lexeme());
        List<Param> group = new ArrayList<>();
        do {
            if (TokenCursor.isScalarType(tokens.peek())) rejectCommaBetweenGroups();
            Token n = tokens.consumeIdentToken("Se esperaba el nombre del parámetro");
            group.add(new Param(n.lexeme(), type, ParamMode.IN, n.line()));
        } while (tokens.match(","));
        return group;
    }

    private void rejectCommaBetweenGroups() {
        if (tokens.check(",") || TokenCursor.isScalarType(tokens.peek())) {
            throw tokens.error("Los parámetros de distinto grupo se separan con ';' "
                    + "(la coma separa nombres del mismo tipo)");
        }
    }

    // ================================================================= proceso

    private ProcessDef parseProcess() {
        Token kw = tokens.consume("process", "Se esperaba 'process'");
        String name = tokens.consumeIdent("Se esperaba el nombre del proceso");
        ProcessDef.QuantDef quant =
                tokens.match("[") ? parseQuant("de la familia de procesos") : null;
        Stmt.Block body = statements.parseBlock();
        return new ProcessDef(name, quant, body, kw.line());
    }

    /** {@code [iterador: desde..hasta]}, ya consumido el '['. */
    private ProcessDef.QuantDef parseQuant(String ofWhat) {
        String iterator = tokens.consumeIdent("Se esperaba el iterador " + ofWhat);
        tokens.consume(":", "Se esperaba ':' en el cuantificador");
        Expr from = parseExpr();
        tokens.consume("..", "Se esperaba '..' en el cuantificador");
        Expr to = parseExpr();
        tokens.consume("]", "Se esperaba ']' al cerrar el cuantificador");
        return new ProcessDef.QuantDef(iterator, from, to);
    }

    // ================================================================= expresiones

    private Expr parseExpr() {
        return expressions.parseExpr();
    }
}
