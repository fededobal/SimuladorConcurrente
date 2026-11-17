# Programas y archivos

El programa del editor se guarda solo en el navegador: sigue ahí al recargar la pestaña o
al volver otro día. El menú con el nombre del programa, en la barra, reúne lo que se puede
hacer con él.

<figure>

![Menú del programa abierto: campo Nombre, acciones Nuevo programa, Abrir un archivo .mon, Descargar como .mon y Guardar en Mis programas, y las listas Mis programas y Ejemplos](/capturas/programas.png)

<figcaption>Menú del programa, con sus acciones y las listas de programas propios y de ejemplos.</figcaption>
</figure>

| Acción | Qué hace |
|---|---|
| Nombre | Cambia el nombre del programa; es el del archivo al descargarlo |
| **Nuevo programa** | Vacía el editor |
| **Abrir un archivo .mon…** | Carga un archivo de texto de la computadora |
| **Descargar como .mon** | Guarda el programa como archivo en la computadora |
| **Guardar en Mis programas** | Lo agrega a la lista de programas propios |
| **Mis programas** | Abre uno de los guardados; el ícono de la derecha lo borra |
| **Ejemplos** | Abre uno de los [programas de ejemplo](/referencia/ejemplos) |

## Guardado automático

| Programa abierto | Dónde quedan los cambios |
|---|---|
| Un borrador (todavía no está en **Mis programas**) | En el navegador, como único borrador |
| Uno de **Mis programas** | En su copia de la lista, además del borrador |

La barra de estado indica «Guardado en este navegador» o «Guardado en Mis programas». Antes
de reemplazar un borrador propio por otro programa, el simulador pide confirmación.

::: warning Atención
Los programas se guardan en el navegador y en esa computadora, no en una cuenta. Borrar los
datos del navegador los elimina. Para conservar un programa o llevarlo a otra máquina,
conviene descargarlo como `.mon` o compartirlo con un enlace.
:::

## Enlace para compartir

El botón con el eslabón, en la barra, copia una dirección que abre el programa en el
simulador de quien la reciba. El enlace lleva el nombre y el código y, si el programa ya se
ejecutó, la semilla y la política de turnos, de modo que la primera ejecución de quien lo
abre repite la misma.

El código viaja dentro de la dirección: no se sube a ningún servidor. Al abrir un enlace, si
el editor tenía un borrador propio sin guardar, ese borrador pasa a **Mis programas**.
