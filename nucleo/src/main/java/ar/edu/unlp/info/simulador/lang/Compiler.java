package ar.edu.unlp.info.simulador.lang;

import ar.edu.unlp.info.simulador.lang.lexer.Lexer;
import ar.edu.unlp.info.simulador.lang.parser.Parser;
import ar.edu.unlp.info.simulador.lang.parser.ast.Program;

/**
 * Fachada del front-end del lenguaje: texto fuente -> {@link Program} validado.
 * Lanza {@link CompilationException} (con numero de linea) ante cualquier error.
 */
public final class Compiler {

    private Compiler() { }

    public static Program compile(String source) {
        Program program = new Parser(new Lexer(source).tokenize()).parseProgram();
        new SemanticValidator(program).validate();
        return program;
    }
}
