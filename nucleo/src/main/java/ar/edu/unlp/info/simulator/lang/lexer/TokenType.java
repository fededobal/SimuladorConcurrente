package ar.edu.unlp.info.simulator.lang.lexer;

public enum TokenType {
    /** Identificador (nombre de variable, monitor, procedure, proceso, etc.). */
    IDENTIFIER,
    /** Literal numerico entero o decimal. */
    NUMBER,
    /** Literal de texto entre comillas dobles. */
    STRING,
    /** Palabra reservada del lenguaje. */
    KEYWORD,
    /** Operador o signo de puntuacion. */
    SYMBOL,
    /** Fin de la entrada. */
    EOF
}
