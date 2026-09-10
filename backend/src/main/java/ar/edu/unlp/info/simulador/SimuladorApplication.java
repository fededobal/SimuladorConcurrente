package ar.edu.unlp.info.simulador;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Punto de entrada del backend del simulador de monitores.
 *
 * <p>El proyecto tiene dos capas independientes:
 * <ul>
 *   <li>{@code lang} + {@code vm}: el nucleo del simulador (lexer, parser, validacion
 *       semantica y maquina virtual de monitores). No depende de Spring.</li>
 *   <li>{@code api}: expone el nucleo como una API REST sobre HTTP.</li>
 * </ul>
 */
@SpringBootApplication
public class SimuladorApplication {

    public static void main(String[] args) {
        SpringApplication.run(SimuladorApplication.class, args);
    }
}
