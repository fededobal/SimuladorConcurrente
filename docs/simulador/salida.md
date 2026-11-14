# La salida

Se abre con el botón Salida de la barra y muestra lo que los procesos escriben con
[`write`](/lenguaje/instrucciones/write): una línea por llamada, con el instante y el nombre
del proceso en su color.

Como los procesos corren en paralelo, el orden de la salida cambia entre corridas con turnos
al azar: verlo es la forma más directa de entender el entrelazado.

La pantalla guarda las últimas 500 líneas; si el programa escribe más, arriba aparece un
aviso con la cantidad de líneas anteriores que se descartaron. Se cierra con el mismo botón,
con el de la esquina del panel o con Escape.
