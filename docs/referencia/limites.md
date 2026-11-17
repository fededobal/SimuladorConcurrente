# Límites

| Elemento | Límite | Al superarlo |
|---|---|---|
| Procesos en total | 5000 | No arranca: `Demasiados procesos` |
| Monitores por arreglo de monitores | 1000 | No arranca: `Demasiados monitores en M` |
| Elementos de un arreglo | De 0 a 100 000 | Error de ejecución: `Tamaño de arreglo inválido` |
| Pasos del código de inicialización de un monitor | 100 000 | No arranca: `La inicialización del monitor M no terminó` |
| Niveles de anidamiento de bloques y paréntesis | 100 | Error de compilación |
| Operaciones encadenadas en una expresión | 200 | Error de compilación |
| Valores `int` | De −9 223 372 036 854 775 808 a 9 223 372 036 854 775 807 (64 bits) | Error de ejecución: `Desborde de entero` |
| Instantes de un `delay` | De 0 a 3600 | Error de ejecución |
| Líneas del panel de salida | Las últimas 500 | Las anteriores se descartan, con un aviso |
| Instantes de la línea de tiempo | Los últimos 1000 | Los anteriores dejan de mostrarse |
| Iteraciones sin sentencias observables en un instante | 4000 | El proceso registra una espera activa y pierde el turno |

## Parámetros de la simulación

| Parámetro | Valor |
|---|---|
| Probabilidad de avance de cada proceso con turnos al azar | 80 % |
| Duración de un instante | Lento 1,2 s · Normal 0,6 s · Rápido 0,3 s · Muy rápido 0,12 s |
| Semilla del azar | Se toma del reloj al compilar |
