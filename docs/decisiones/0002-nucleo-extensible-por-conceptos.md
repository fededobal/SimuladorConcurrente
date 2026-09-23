# 0002. Organizar el núcleo para soportar varios conceptos de concurrencia

- Estado: reemplazada por 0003 (el alcance se limitó a monitores)
- Fecha: 2026-09-18

## Contexto
El simulador implementa hoy un único concepto, monitores con disciplina *signal and
continue*. El objetivo del proyecto es abarcar otros temas de la materia, como semáforos,
barreras, variables compartidas con sentencias `await` y pasaje de mensajes. La lógica de
monitores está implementada dentro de `VirtualMachine`, que concentra además el
planificador, los instantes, la detección de interbloqueo y la generación de estados. Si
cada concepto nuevo se incorpora de la misma manera, la clase crece sin límite y un cambio
en un concepto puede alterar el comportamiento de otro.

## Alternativas
1. **Incorporar cada concepto dentro de `VirtualMachine`.** Requiere menos trabajo inicial,
   pero acopla todos los conceptos y dificulta probarlos por separado.
2. **Una máquina virtual independiente por concepto.** Aísla los conceptos, pero duplica
   el planificador, los estados de proceso y la visualización, y obliga a mantener varias
   versiones de la misma semántica común.
3. **Una máquina virtual común con primitivas por concepto.** El planificador, los
   procesos, los instantes, el interbloqueo y los estados son comunes; cada concepto
   aporta sus primitivas en un paquete propio y las ejecuta a través de una interfaz
   acotada de la máquina virtual. Cada programa se compila bajo un modelo explícito que
   determina qué construcciones del lenguaje están habilitadas.

## Decisión
Se propone la alternativa 3. Antes de incorporar el segundo concepto se extrae la lógica de
monitores a `vm/monitores/` sin cambiar su comportamiento, verificado por los casos
canónicos existentes. Los nodos del árbol sintáctico permanecen en un único paquete,
porque Java solo admite subtipos de una interfaz sellada del mismo paquete cuando el código
no se organiza en módulos con nombre. La vista de estado incorpora una representación
genérica de recursos para que el puente con la interfaz no deba modificarse con cada
concepto.

## Consecuencias
- Cada concepto se prueba con sus propios casos canónicos, y los de los demás conceptos
  funcionan como pruebas de no regresión.
- El validador rechaza construcciones ajenas al modelo elegido, lo que evita que el
  alumno combine primitivas de temas distintos sin advertirlo.
- La extracción inicial requiere una refactorización de `VirtualMachine` sin cambios de
  comportamiento, que debe realizarse en commits separados de cualquier funcionalidad nueva.
- Queda por definir, junto con la cátedra, qué combinaciones de conceptos se permiten en un
  mismo programa.
