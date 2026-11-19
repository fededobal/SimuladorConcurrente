# Versiones anteriores de los ejemplos

El simulador guarda en el navegador el programa que quedó abierto. Si ese programa es un
ejemplo y después el ejemplo cambia, quien lo tenía abierto sigue viendo la versión vieja
hasta volver a elegirlo en el menú. Para que eso no pase, al iniciar el simulador compara
el programa guardado con los archivos de esta carpeta: si coincide con una versión anterior
de un ejemplo (sin contar el valor de las constantes), abre la versión actual y conserva
los valores de las constantes que tenía.

Al cambiar un ejemplo de `ejemplos/`, copiar acá la versión que se reemplaza con el nombre
`<ejemplo>.<n>.mon`, donde `<ejemplo>` es el nombre del archivo sin la extensión y `<n>` un
número correlativo:

```bash
git show HEAD:ejemplos/21-banco.mon > ejemplos/anteriores/21-banco.2.mon
```

Estos archivos no se ofrecen en el menú ni se ejecutan en las pruebas.
