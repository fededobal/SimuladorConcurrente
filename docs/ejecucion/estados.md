# Estados de un proceso

En cada instante, cada proceso está en uno de los estados de la tabla. El editor, la línea
de tiempo y el panel de monitores usan el mismo aspecto para cada estado.

| Estado | Significado | Aspecto |
|---|---|---|
| Ejecutando en el proceso | Avanzó en el último instante, fuera de los monitores | Franja lisa del color del proceso, en tono claro |
| Ejecutando en el monitor | Avanzó en el último instante, con un monitor tomado | Franja lisa del color del proceso |
| Compitiendo | Espera en la cola de entrada de un monitor | Rayado ocre |
| Esperando | Está demorado en una variable condición | Rayado ladrillo |
| En delay | Está demorado por un `delay`; si está en un monitor, lo conserva | Punteado verde, con los instantes que faltan |
| Sin turno | Podía avanzar, pero no le tocó en este instante | Gris |

Un proceso que terminó deja de mostrarse en el editor. Un proceso que terminó por un error
de ejecución se marca en rojo, con la línea y el mensaje
([Errores en tiempo de ejecución](/problemas/errores-en-tiempo-de-ejecucion)).

## Transiciones

| Desde | Hacia | Causa |
|---|---|---|
| Ejecutando | Compitiendo | Llama a un monitor ocupado |
| Compitiendo | Ejecutando en el monitor | El monitor se libera y el sorteo lo elige |
| Ejecutando en el monitor | Esperando | Ejecuta `wait` |
| Esperando | Compitiendo | Otro proceso ejecuta `signal` o `signal_all` sobre esa variable |
| Ejecutando | En delay | Ejecuta `delay` |
| En delay | Ejecutando | Pasan los instantes indicados |
