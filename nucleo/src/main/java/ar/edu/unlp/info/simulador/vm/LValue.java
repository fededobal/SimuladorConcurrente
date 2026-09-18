package ar.edu.unlp.info.simulador.vm;

/**
 * Lugar donde escribir el valor de un parametro {@code out}/{@code inout} al retornar de un
 * procedure. Se resuelve contra el proceso y la activacion del llamador (que siguen en la
 * pila mientras el procedure ejecuta).
 *
 * @param callerActivation activacion del llamador
 * @param name             nombre de la variable destino en el llamador
 * @param index            indice si el destino es un elemento de arreglo, si no null
 */
public record LValue(Activation callerActivation, String name, Integer index) { }
