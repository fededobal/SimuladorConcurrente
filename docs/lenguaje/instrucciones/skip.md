# `skip`

Sentencia que no hace nada.

## Sintaxis

```c
skip;
```

## Funcionamiento

Ocupa un paso, como cualquier otra sentencia. Sirve como cuerpo vacío de un ciclo o de una
rama, y para que un proceso deje pasar un instante. En los ejercicios, también puede
representar una acción que la consigna no detalla.

## Errores

| Situación | Mensaje |
|---|---|
| Con paréntesis | `Se esperaba ';' después de 'skip' (se encontró '(')` |

## Ejemplo

```c
process Cliente {
  skip;            // llega un instante después
  Banco.atender();
}
```
