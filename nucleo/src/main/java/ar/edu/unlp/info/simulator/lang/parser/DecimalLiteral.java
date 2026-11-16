package ar.edu.unlp.info.simulator.lang.parser;

/**
 * Valor de un literal decimal del codigo fuente ("123.45"). No usa
 * {@code Double.parseDouble}: TeaVM redondea distinto que la JVM algunos literales largos, y
 * el navegador mostraria otro valor que los tests.
 */
final class DecimalLiteral {

    /** 10^0 .. 10^22: todas exactas en un double. */
    private static final double[] POWERS_OF_TEN = {
        1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11,
        1e12, 1e13, 1e14, 1e15, 1e16, 1e17, 1e18, 1e19, 1e20, 1e21, 1e22
    };

    /** Cifras que entran sin perdida en un long. */
    private static final int MAX_EXACT_DIGITS = 18;

    private DecimalLiteral() { }

    /**
     * Con hasta 18 cifras es una sola division de enteros exactos, que la JVM y TeaVM redondean
     * igual; las cifras de mas se escalan por 10. Un literal enorme da infinito: quien llama
     * lo informa como error.
     */
    static double valueOf(String lexeme) {
        int point = lexeme.indexOf('.');
        String digits = lexeme.substring(0, point) + lexeme.substring(point + 1);
        int start = 0;
        while (start < digits.length() - 1 && digits.charAt(start) == '0') start++;
        digits = digits.substring(start);
        int used = Math.min(digits.length(), MAX_EXACT_DIGITS);
        double value = Long.parseLong(digits.substring(0, used));
        int scale = (lexeme.length() - point - 1) - (digits.length() - used);
        for (; scale > POWERS_OF_TEN.length - 1; scale--) value /= 10.0;
        for (; scale < 0; scale++) value *= 10.0;
        return value / POWERS_OF_TEN[scale];
    }
}
