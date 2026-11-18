# 0007. Retener el monitor del llamador en las llamadas entre monitores

- Estado: aceptada
- Fecha: 2026-11-13
- Reemplaza a: 0004

## Contexto
El ADR 0004 adoptó la llamada abierta: cuando un procedure de un monitor A llama a un
procedure de otro monitor B, el proceso libera A durante la llamada y vuelve a competir por
él al retornar. La decisión partió de que la teoría de la cátedra no trataba el caso y de
una medición: con la llamada cerrada, un programa de dos monitores (P llama de A a B y
espera en B, mientras Q necesita entrar a A para avisarle) quedaba en deadlock en 194
de 200 semillas.

La explicación práctica de monitores de la cátedra (Explicación 3, diapositiva 2) sí trata
el caso: "En un procedimiento de un monitor TAMBIÉN se puede llamar a procedimientos de
OTRO monitor. Pero cuidado porque el monitor desde donde se hizo el llamado se mantiene
ocupado (inaccesible por otro proceso) hasta que el procedimiento llamado en el segundo
monitor TERMINE POR COMPLETO su ejecución". Es la llamada cerrada. El deadlock que el
ADR 0004 quería evitar es el que la cátedra señala como un riesgo que el alumno debe
conocer.

## Alternativas
1. **Mantener la llamada abierta.** Evita el deadlock, pero enseña un comportamiento
   que la cátedra describe al revés, y el alumno no ve el riesgo del que se le advierte.
2. **Llamada cerrada.** Coincide con la explicación práctica. El deadlock aparece, y
   hay que mostrar con claridad por qué ocurre.

## Decisión
Se adopta la alternativa 2. Al ejecutar `B.g()` dentro de un procedure de A:

1. Los argumentos se evalúan una sola vez.
2. El proceso conserva A y entra a B o espera en la cola de entrada de B.
3. Si hace `wait` en B, libera solo B; A sigue tomado.
4. Al retornar de B libera B, escribe los parámetros `out` y sigue en A sin competir.

Para que el deadlock se entienda, el mensaje de *deadlock* nombra a cada proceso
bloqueado que retiene un monitor (por ejemplo, "P espera en B.c y retiene A"), y el
estado de cada proceso informa los monitores que tiene tomados (campo `holding`).

Una llamada a un procedure del mismo monitor sigue siendo error de compilación. Un ciclo
entre monitores (A llama a B, que llama a A) es error de ejecución del proceso: con la
llamada cerrada se esperaría a sí mismo indefinidamente.

## Consecuencias
- Desaparecen el evento `RELEASE` de la llamada y la escritura diferida de los `out`
  hacia el monitor llamador. `RELEASE` queda solo para el proceso que termina con error.
- Un proceso puede tener varios monitores tomados a la vez. La interfaz lo marca como
  ejecutando dentro de un monitor si tiene al menos uno.
- El programa del contexto queda en deadlock en la mayoría de las semillas;
  `VirtualMachineTest.llamadaCerradaRetieneElMonitorDelLlamador` lo verifica y controla el
  mensaje.
