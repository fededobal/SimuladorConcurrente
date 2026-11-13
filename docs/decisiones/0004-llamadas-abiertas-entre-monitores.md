# 0004. Liberar el monitor del llamador en las llamadas entre monitores

- Estado: reemplazada por 0007
- Fecha: 2026-09-23

## Contexto
Un procedure de un monitor A puede llamar a un procedure de otro monitor B. La teoría de la
cátedra (`docs/monitores.md`) no trata el caso. Hasta esta decisión, el simulador
implementaba la llamada cerrada: el proceso retenía A mientras ejecutaba en B, incluso si
hacía `wait` en B. La verificación del 23/09/2026 mostró la consecuencia con un programa
de dos monitores: P llama de A a B y espera en B, y Q necesita entrar a A para avisarle.
Con la llamada cerrada el programa quedaba en interbloqueo en 194 de 200 semillas con
turnos al azar y en todas con turnos en ronda, aunque la sincronización de cada monitor
era correcta.

## Alternativas
1. **Llamada cerrada.** El proceso retiene A durante la llamada. Es el comportamiento
   anterior. Hace aparecer interbloqueos que el alumno no puede explicar a partir de un
   solo monitor.
2. **Llamada abierta.** El proceso libera A al llamar a B y vuelve a competir por A al
   retornar, como después de un `wait`. Cada monitor se razona por separado; el costo es
   que el estado de A puede cambiar mientras el proceso está en B.
3. **Prohibir las llamadas entre monitores.** Simplifica el modelo, pero quita un recurso
   que los ejercicios pueden necesitar.

## Decisión
Se adopta la alternativa 2. Al ejecutar `B.g()` dentro de un procedure de A:

1. Los argumentos se evalúan una sola vez, con A todavía tomado.
2. El proceso libera A (evento `RELEASE`) y despierta a su cola de entrada.
3. Entra a B o espera en la cola de entrada de B.
4. Al retornar de B, libera B y compite por A en su cola de entrada.
5. Los parámetros `out` que apuntan a variables de A se escriben recién al reingresar a A,
   para no modificar el estado de A sin tenerlo tomado.

Una llamada desde un procedure a su propio monitor es error de compilación.

## Consecuencias
- Desaparece el interbloqueo por llamadas anidadas; un proceso tiene a lo sumo un monitor
  tomado a la vez.
- Después de volver de B, el procedure de A no puede suponer que el estado de A sigue igual
  que antes de la llamada: vale el mismo criterio que después de un `wait`.
- Las invariantes de exclusión mutua se verificaron con 36 programas, 200 semillas y las dos
  políticas (`InvariantesTest`), incluidas las llamadas anidadas con `wait`.
- `docs/monitores.md` y la referencia del lenguaje documentan el comportamiento.
