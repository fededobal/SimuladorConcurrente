package ar.edu.unlp.info.simulator.vm;

/**
 * Una variable o un elemento de arreglo, ya resuelto, que se puede leer y escribir. Lo
 * crea {@link VariableAccess#place}; asignacion, {@code ++}/{@code --}, intercambio y
 * parametros {@code out} escriben a traves de el, asi el tipo del destino y el ultimo
 * escritor de una permanente se controlan en un solo lugar.
 */
interface Place {

    /** Como lo nombran los eventos: {@code x} o {@code a[3]}. */
    String label();

    Value read();

    /** Guarda el valor con el tipo del destino; {@code writer} queda como ultimo escritor. */
    void write(Process writer, Value value);
}
