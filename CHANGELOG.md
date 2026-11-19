# Registro de cambios

Todos los cambios del proyecto quedan registrados en este archivo, con su autor y fecha.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones
siguen [Versionado Semántico](https://semver.org/lang/es/).

Reglas:
- Cada commit agrega al menos una entrada en **[Sin publicar]** (excepto los de tipo `style`).
  El hook `commit-msg` lo verifica.
- Formato de entrada: `- Descripción en infinitivo o sustantivo, terminada en punto. (Autor, AAAA-MM-DD)`
- El autor es el nombre configurado en git (`git config user.name`).
- Secciones: Agregado, Cambiado, Corregido, Eliminado, Documentación, Interno.
- Al publicar una versión, **[Sin publicar]** pasa a llamarse `[X.Y.Z] - AAAA-MM-DD` y se
  abre una sección nueva vacía.

## [Sin publicar]

### Agregado
- Función `random(inf, sup)`: una expresión `int` que vale un entero al azar entre los dos límites, incluidos (`delay(random(1, 5))`, `int tiempo = random(1, 10);`). Sale de la semilla de la ejecución, así que Repetir vuelve a dar los mismos valores. Los límites al revés son error de ejecución, y no se admite en el rango de un arreglo de procesos o de monitores ni en el tamaño de un arreglo. `random` pasa a ser palabra reservada. No figura en el material de la cátedra. (Federico Dobal, 2026-11-19)
- Topes en todas las listas de los paneles, con un botón para ver el resto: variables condición de un monitor (6, primero las que tienen procesos dormidos), variables permanentes (8), monitores del panel (8), variables locales de un proceso (8), procesos de la tabla «Por qué nadie avanza» (8) y el valor de un texto largo (60 caracteres). Se suman a los que ya tenían las colas, los arreglos y la lista de procesos. (Federico Dobal, 2026-11-19)
- Línea de tiempo: la columna con los nombres de los procesos y los monitores se ensancha o se angosta arrastrando su borde derecho (también con las flechas del teclado); de entrada toma el ancho del nombre más largo y doble clic vuelve a ese ancho. Un nombre que no entra se abrevia sin perder el índice. (Federico Dobal, 2026-11-19)
- Panel Monitores: los monitores de un vector (`monitor Escritorio[id: 0..2]`) van juntos en un panel con un selector. Con «Todos» se muestran ordenados por uso, primero el que tiene más procesos entre compitiendo, ejecutando y bloqueados, y al cambiar el orden las tarjetas se deslizan a su lugar; al elegir un monitor del vector se muestra solo ese. Con más de cinco, un botón abre el resto. Un monitor que no es de un vector se muestra como antes. (Federico Dobal, 2026-11-19)
- Editor: guías de sangría, una línea vertical fina por nivel, como en VS Code; la del bloque en el que está el cursor se ve más marcada. El renglón del cursor lleva un recuadro y su número se destaca en el margen (no con texto seleccionado ni sin foco). El ancho de un nivel sale del propio programa (2 o 4 espacios). Gris transparente en el tema claro y gris azulado en el oscuro. El editor dibuja su propio cursor, alineado con el recuadro: el de Safari, con el interlineado del editor, se dibujaba unos píxeles más arriba que el renglón. (Federico Dobal, 2026-11-18)
- Barra de desplazamiento propia en todos los paneles del simulador y en la guía: fina y redondeada, con una flecha arriba y otra abajo en las verticales que desplazan de a poco (apretadas, repiten). En Firefox queda la barra fina del sistema con los mismos colores. (Federico Dobal, 2026-11-18)
- Constantes del programa: `#define N 5`, al principio, declara una cantidad fija como la `N` de los enunciados (`cond espera[N]`, `process Persona[id: 0..N-1]`). No es una variable: el compilador pone el número donde aparece el nombre. El menú Constantes, en el encabezado del editor, las agrega, las cambia y las quita sin escribir la línea a mano; el nombre se colorea como un número. (Federico Dobal, 2026-11-18)
- Orden de una `ColaOrdenada`: `ColaOrdenada fila(int, int) desc;` ordena de mayor a menor, como pide el ejercicio 3 de la Explicación 3; sin nada o con `asc` sigue ordenando de menor a mayor. `asc` y `desc` pasan a ser palabras reservadas. (Federico Dobal, 2026-11-18)
- Continuidad entre instantes en toda la pantalla: el chip del proceso que avanzó late una vez y la pestaña Procesos lo marca con una barra de su color; las etiquetas del editor cambian de color sin saltar; el proceso que sale de una cola o de una zona se desvanece mientras los demás se corren; el número de instante, los contadores de las pestañas, la salida, los carteles, los menús, los avisos y el cambio de tema entran o cambian con una transición. Una regla global apaga todo con la preferencia de reducir el movimiento. (Federico Dobal, 2026-11-18)
- Visor de monitores animado: un punto del color del proceso recorre la flecha que usó, los nombres entran y se reacomodan en las zonas sin saltar, y las flechas, las zonas y la pastilla de estado cambian de color con una transición. Los valores de variables y locales que cambian se destacan un momento, y el relato, las colas y la salida entran con un fundido. (Federico Dobal, 2026-11-18)
- Transiciones entre instantes: en el editor, la franja y la etiqueta de cada proceso se deslizan con su chip hasta el renglón nuevo; en la línea de tiempo, el tramo que sigue se alarga, el que empieza se descubre, y el cursor del instante y el desplazamiento se corren juntos. La duración sigue a la velocidad elegida y se apaga con la preferencia de reducir el movimiento. (Federico Dobal, 2026-11-17)
- Guía: botón «Abrir en el simulador» en los ejemplos de código (abre el programa completo, o el ejemplo del que sale un fragmento) y botón «Copiar» siempre visible; figura con el dibujo del monitor y la flecha destacada en `wait`; lo esencial de `wait`, `signal`, `signal_all` y `delay` en etiquetas; avisos «En el simulador» y «Atención»; los mensajes de error se muestran como en el simulador. El simulador abre un ejemplo del menú desde un enlace `#ejemplo=…`. (Federico Dobal, 2026-11-17)
- Pestaña Procesos: cada proceso con lo que está haciendo, su línea, sus variables locales y un botón para avanzar un instante solo con él. Aviso en el editor cuando el renglón de un proceso queda fuera de la vista, que lleva hasta esa línea con un clic. Leyenda de los procesos en el encabezado del editor. Diálogo con todos los atajos (tecla «?»). (Federico Dobal, 2026-11-17)
- Atajos de teclado para la simulación, los de un depurador: F5 ejecuta o pausa, F10 da un paso y Shift+F5 detiene. Funcionan también con el cursor en el código. F5 deja de recargar la pestaña (Ctrl/Cmd+R sigue haciéndolo); «?» abre la lista de atajos. (Federico Dobal, 2026-11-17)
- Aviso de interbloqueo: cuando ningún proceso puede avanzar, un cartel sobre el editor dice en qué instante pasó, qué espera cada proceso bloqueado (en qué `wait`, a qué monitor quiere entrar, qué monitores retiene) y por qué nadie puede despertarlo, con el detalle que informa el motor. Desde el cartel se puede ir al instante en la línea de tiempo, repetir la ejecución con la misma semilla o abrir la ayuda. El panel de monitores suma la tabla «Por qué nadie avanza» y la línea de tiempo marca el instante con una raya roja. (Federico Dobal, 2026-11-17)
- Enlace para compartir: un botón de la barra copia una dirección que abre el programa en el simulador de quien la reciba, con su nombre y, si ya se ejecutó, con la semilla y la política de turnos para repetir la misma ejecución. El código viaja en la propia dirección: no se sube a ningún servidor. (Federico Dobal, 2026-11-17)
- El trabajo se guarda: el programa del editor se guarda solo en el navegador y sigue ahí al recargar la pestaña. El botón con el nombre del programa abre un menú para ponerle nombre, empezar uno nuevo, abrir y descargar archivos `.mon`, guardarlo en «Mis programas» (desde ahí sus cambios se guardan en esa copia) y abrir cualquiera de los propios o de los ejemplos, que antes estaban en un menú aparte. (Federico Dobal, 2026-11-17)
- Avanzar un proceso elegido: el botón Paso tiene al lado un menú con los procesos del programa; al elegir uno, en ese instante avanza solo ese (los demás no se mueven). Sirve para armar a mano un entrelazado puntual. Solo se pueden elegir los procesos que están listos; de los demás se indica el estado. (Federico Dobal, 2026-11-17)
- Botón Repetir: vuelve al instante 0 con la misma semilla, así la ejecución se repite igual (con la misma política de turnos) y se puede volver a mirar un entrelazado o un interbloqueo paso a paso. La semilla de la ejecución se muestra junto al instante y ahora tiene cinco cifras, para poder anotarla o dictarla. (Federico Dobal, 2026-11-17)
- Intercambio `x :=: y`, la notación de la cátedra para intercambiar dos variables (`v_actual :=: v_proxima`): vale con variables y elementos de arreglo del mismo tipo, ocupa un solo paso y se controla como una asignación (no se puede usar con un parámetro `in`, un iterador, un arreglo completo ni una cola). (Federico Dobal, 2026-11-16)
- Modo oscuro en la documentación, con los mismos colores que el simulador y el botón de VitePress arriba a la derecha. El simulador y la documentación comparten el tema: elegirlo en uno lo cambia en el otro, y el elegido se mantiene al recargar aunque cambie el tema del sistema. (Federico Dobal, 2026-11-16)
- Modo oscuro: un botón con una luna o un sol, al final de la barra, pasa del tema claro al oscuro y vuelve. La primera vez se usa el tema del sistema operativo; después el navegador recuerda el elegido. El oscuro conserva el gris frío y el acento azul del claro, y los nombres de los procesos se aclaran lo justo para leerse sobre el fondo oscuro. (Federico Dobal, 2026-11-16)
- Documentación: al elegir una coincidencia del buscador, la palabra buscada queda resaltada en el artículo; el resaltado se quita con un clic en el texto, con Escape o al navegar. (Federico Dobal, 2026-11-14)
- Documentación: página "Índice" al principio con todas las páginas y qué cubre cada una; botón para ocultar y mostrar la barra lateral (el navegador recuerda la elección); buscador más ancho. (Federico Dobal, 2026-11-14)
- Botón "Documentación" en la barra del simulador, que abre el sitio de documentación. (Federico Dobal, 2026-11-13)
- Sitio de documentación con VitePress, publicado junto con el simulador en /docs/: tema claro con el mismo acento, barra lateral, buscador (⌘K), índice "En esta página", navegación anterior/siguiente y enlace al simulador. Reúne los documentos existentes (teoría de monitores, conceptos de concurrencia, referencia del lenguaje, especificación EBNF y decisiones de diseño) y una portada nueva. Se levanta con `npm run docs:dev` en `frontend/`. (Federico Dobal, 2026-11-13)
- Línea de tiempo: un carril por monitor, arriba de los procesos y con fondo gris, que muestra quién tuvo el monitor en cada instante (con su color y su nombre) y "libre" en los huecos: la exclusión mutua se ve de un vistazo. (Federico Dobal, 2026-11-13)
- Línea de tiempo: al pasar el mouse por una columna, una tarjeta cuenta en palabras qué pasó en ese instante, con cada proceso en su color; un clic la deja fija. Dos botones de zoom cambian el ancho de las columnas. (Federico Dobal, 2026-11-13)
- En el dibujo de cada monitor, tocar una zona (Compitiendo, En wait o En monitor) o un punto limita la lista de abajo a esa zona, completa y sin plegar, con la cantidad de procesos y un botón "ver todo" para volver; la zona elegida se marca con el borde oscuro. También con el teclado (Tab, Enter). (Federico Dobal, 2026-11-13)
- Los paneles Salida, Línea de tiempo y Monitores se amplían con el botón de su encabezado (o con un clic sobre el dibujo de un monitor): el panel pasa a la derecha del editor a toda altura, así el alumno sigue viendo el código mientras mira el detalle, y se cierra con el mismo botón o con Escape. Todos los paneles se agrandan o achican arrastrando el borde que mira al editor, también con las flechas del teclado; al recargar la página vuelven a su tamaño y lugar iniciales. (Federico Dobal, 2026-11-13)
- Cada monitor del panel muestra, bajo el título "Variables del monitor", sus variables permanentes dibujadas según su estructura: un escalar con su valor, un arreglo como celdas con su índice, una Cola o ColaOrdenada como casilleros con el frente a la izquierda, y un punto con el color del último proceso que escribió cada una. (Federico Dobal, 2026-11-13)
- Una fila "En wait(cond)" por cada variable condición con alguien esperando, en el orden en que se declararon; las filas Compitiendo y En monitor también aparecen solo cuando hay alguien. Plegado muestra hasta cinco procesos y un botón "+n más" abre el resto. Si el monitor no tiene ningún proceso, lo dice en una línea. (Federico Dobal, 2026-11-13)
- Versión extendida de cada monitor, al ampliar el panel: el dibujo más grande y las listas con más aire. Todo lo que puede desbordarse (listas de procesos, celdas de arreglos y colas, etiquetas de procesos en un mismo renglón del editor) muestra hasta cinco elementos y un botón "+n más" para abrir el resto. (Federico Dobal, 2026-11-13)
- Zoom del editor de código: dos botones que flotan arriba a la derecha del editor agrandan o achican solo la letra del programa; el navegador recuerda el tamaño. (Federico Dobal, 2026-11-13)
- Panel Monitores: cada monitor se dibuja como en la teoría, con las zonas 1 (espera acceso), 2 (cola por variable condición) y 3 (ejecutando). Los procesos son puntos de su color que se mueven entre zonas, y se resalta la flecha recorrida en el último instante (Call, entra, wait, signal, Return). Debajo se listan la cola de entrada, la cola de cada cond en orden y los eventos del instante en ese monitor. El dueño que está en delay o esperando en otro monitor lleva un anillo y una aclaración. (Federico Dobal, 2026-11-13)
- Instrucción delay(segundos): el proceso se demora ese tiempo real y, si está en un monitor, lo sigue teniendo tomado. Al lado de su nombre en el editor aparece un contador con los segundos que faltan, y la línea de tiempo lo muestra con el estado "en delay". Un proceso en delay no cuenta como interbloqueo: la simulación espera que termine. (Federico Dobal, 2026-11-13)
- Arreglos de monitores, como en la cátedra: monitor Escritorio[id: 0..2] declara un monitor por índice, cada uno con sus variables, cond y cola de entrada, y se llama con Escritorio[i].atencion(...). Adentro, id es el índice de ese monitor. (Federico Dobal, 2026-11-13)
- push y pop aceptan la tupla entre paréntesis, como la escribe la cátedra: push(C, (idC, S)) y pop(C, (IdC, S)). La forma sin paréntesis sigue valiendo. (Federico Dobal, 2026-11-13)
- La línea de tiempo se agranda o achica arrastrando su borde superior (también con las
  flechas del teclado). Doble clic en el borde vuelve al alto automático. (Federico Dobal, 2026-09-23)
- Línea de tiempo abajo de la pantalla: una fila por proceso y una columna por instante con
  su estado (ejecutando, compitiendo por el monitor, esperando en una variable condición o
  listo). Ejecutando se pinta con el color del proceso y, dentro de un monitor, cada instante
  lleva una "M". En cada instante suben arriba los procesos que avanzaron, en el orden de su
  turno. Las franjas del editor usan los mismos colores. El snapshot trae el campo `advanceOrder` con el turno de cada proceso.
  (Federico Dobal, 2026-09-23)
- La interfaz muestra los errores de ejecución: el proceso, la línea (marcada en rojo en el
  editor) y el mensaje. Si después la simulación queda en interbloqueo o termina, el estado
  dice "deadlock tras un error" o "fin con errores". Antes el proceso desaparecía del
  editor sin ningún aviso. (Federico Dobal, 2026-09-23)
- La franja de cada proceso distingue a los que avanzaron en el último instante
  ("ejecutando") de los que están listos; el snapshot trae el campo `advanced`.
  (Federico Dobal, 2026-09-23)
- `empty(c)` con paréntesis, además de `empty c`. (Federico Dobal, 2026-09-23)
- Menú "Ejemplos" en la barra para cargar los programas de `ejemplos/`. Si el editor tiene un
  programa propio, pide confirmación antes de reemplazarlo. (Federico Dobal, 2026-09-18)
- Selector de política de planificación: turnos al azar o en ronda (*round robin*). Se puede
  cambiar en medio de una ejecución. (Federico Dobal, 2026-09-18)
- Declarar varias variables del mismo tipo en una línea: `text lista, comp;`,
  `int i = 0, j;`. Cada nombre lleva su propio tamaño y valor inicial. (Federico Dobal, 2026-09-23)
- Ejemplo del corralón (práctica de monitores, punto 4a): un empleado atiende a los clientes
  en orden de llegada. (Federico Dobal, 2026-09-23)

### Cambiado
- Inspector: el botón de su esquina lo amplía como a la línea de tiempo: queda más ancho y a toda la altura, delante de la línea de tiempo, que sigue a la vista debajo del editor, hasta volverlo a su lugar con el mismo botón o con Escape. Antes solo se ensanchaba y la línea de tiempo lo cortaba por abajo. (Federico Dobal, 2026-11-19)
- Línea de tiempo: al pasar el mouse por un instante el puntero cambia a la mano y la columna se resalta más, sin ningún texto emergente; lo que pasó se lee en el cartel que abre el clic. (Federico Dobal, 2026-11-19)
- Línea de tiempo: el cartel de un instante aparece al hacer clic en él, no al pasar el mouse, y acompaña al puntero corrido hacia un costado, así no tapa lo que se está mirando; se cierra con otro clic en el mismo instante o con Escape. Pasar el mouse solo resalta la columna. (Federico Dobal, 2026-11-19)
- Dibujo del monitor: las tres zonas pasan a llamarse «1 · Compitiendo», «2 · Bloqueado» y «3 · Ejecutando» (antes Compiten, En wait y Adentro), en el panel Monitores, en la figura de la guía y en las páginas que las nombran. (Federico Dobal, 2026-11-19)
- Ejemplos rehechos: 21 programas, uno por tema de monitores, tomados de la Teoría 4 y de la Explicación 3 (exclusión mutua implícita, parámetros `out`, *busy waiting*, `wait` y `signal`, código de inicialización, buffer limitado con arreglos, espera con `if` que falla y su corrección con `while`, *passing the condition*, `signal_all`, lectores y escritores, *covering conditions*, `Cola`, `ColaOrdenada`, variables condición privadas, prioridad con `desc`, *rendezvous*, vector de monitores, llamadas entre monitores, *deadlock* y el problema completo del banco). Reemplazan a los nueve anteriores; el simulador abre con el de exclusión mutua. (Federico Dobal, 2026-11-18)
- Términos del material de la cátedra en el motor y en la interfaz: el simulador dice «Deadlock» (en la barra, el cartel, la línea de tiempo y el mensaje del motor) donde decía «Interbloqueo»; el evento de un ciclo sin avanzar se llama «busy waiting»; y un proceso que hizo `wait` está «dormido» en la leyenda, en la línea de tiempo y en el encabezado de cada monitor, que además distingue si el dueño está dormido en otro monitor o compite por entrar a él. (Federico Dobal, 2026-11-18)
- Notación de la cátedra que ahora compila tal cual: `cola` como nombre de una variable (`cond cola;`, `wait(cola)`), sin dejar de ser el tipo cuando declara una cola; y el `else` sin `;` antes cuando el cuerpo del `if` es una sola sentencia (`if (s == 0) wait(pos) else s = s-1;`). El wait con prioridad, `wait(cv, rank)`, se rechaza con un mensaje que dice que no se usa en la práctica, como el de `empty(cv)`. (Federico Dobal, 2026-11-18)
- Barra de estado: cuando la ejecución terminó o quedó en interbloqueo, el atajo F5 se rotula «Ejecutar de nuevo». (Federico Dobal, 2026-11-17)
- Guía con forma de libro: siete capítulos numerados en la barra lateral, con la página actual destacada; migas con el número de sección en la barra superior; título con su número; anterior y siguiente numerados, y páginas relacionadas junto al índice de cada página. La portada pasa a ser un índice con una tarjeta por capítulo, un recorrido sugerido para la primera vez, las 15 instrucciones a un clic, los términos más consultados del glosario y los programas de ejemplo listos para abrir. La presentación queda como página 1.1. (Federico Dobal, 2026-11-17)
- Panel de monitores nuevo: el dibujo tiene zonas grandes con el nombre completo de cada proceso (antes un punto con dos letras) y resalta la flecha recorrida; debajo cuenta en palabras qué pasó en el último instante, lista las colas completas (plegando las variables condición vacías cuando son muchas) y muestra las variables en una tabla con su tipo, su valor y qué proceso las escribió y en qué instante. (Federico Dobal, 2026-11-17)
- Pantalla nueva. La barra agrupa Ejecutar, Paso, Detener y Repetir, muestra la velocidad y los turnos como menús compactos con el valor actual, y deja el estado y el instante grandes y siempre a la vista. A la derecha, un inspector con pestañas (Monitores, Procesos y Salida): la salida ya no tapa a los monitores. La línea de tiempo ocupa todo el ancho, con el instante actual destacado y un rótulo en cada tramo. Abajo, una barra de estado con la posición del cursor, la cantidad de procesos y monitores, los turnos, la semilla, el estado del guardado y los atajos. (Federico Dobal, 2026-11-17)
- Colores de los procesos más vivos y más distintos entre sí: en un programa de dos procesos, uno es azul y el otro rosa fuerte. Siguen fuera de la paleta el rojo, el ámbar, el verde y, ahora, el violeta, que identifican el error y los estados. (Federico Dobal, 2026-11-17)
- `delay(n)` se mide en instantes y no en segundos: ejecutarlo ocupa un instante y el proceso no avanza durante los `n` siguientes (ADR 0008). Si nadie puede avanzar pero alguno está demorado, los instantes pasan igual, así la demora se ve con su duración en la línea de tiempo y se puede recorrer paso a paso. Un programa con `delay` ahora se repite igual con la misma semilla. La etiqueta del proceso dice cuántos instantes le faltan. Los programas que usaban `delay` como segundos conservan el valor, que pasa a contarse en instantes. (Federico Dobal, 2026-11-17)
- El estado de la barra dice «interbloqueo» en lugar de «deadlock», como el resto de los textos y la documentación. (Federico Dobal, 2026-11-17)
- Editor: cada renglón con procesos lleva una sola franja lisa, un chip con la inicial del proceso en el margen y, al final del código, una etiqueta que dice quién está ahí y qué hace ("Productor · en Buffer", "Cliente ×8 · dormidos en wait(esperaCli[…])"), con un ícono por estado. Los procesos en el mismo estado y lugar comparten etiqueta. Los estados usan colores más separados: ámbar para el que compite, violeta para el que espera y verde azulado para el delay. (Federico Dobal, 2026-11-17)
- Todas las palabras reservadas aceptan cualquier combinación de mayúsculas (`OR`, `OUT`, `While`, `cola`, `colaOrdenada`), como aparecen en el material de la cátedra; antes solo `monitor`, `procedure` y `process`. Los nombres que declara el programa siguen distinguiendo mayúsculas, y un nombre que coincide con una palabra reservada en cualquier forma (`cond cola;`, `int Out;`) pasa a ser error. El resaltado del editor sigue la misma regla. (Federico Dobal, 2026-11-16)
- Los paneles del simulador (barra, editor, línea de tiempo y monitores) quedan al ras, sin el hueco gris entre tarjetas; una línea fina los separa. El borde de cada panel se sigue arrastrando para cambiar su tamaño. (Federico Dobal, 2026-11-16)
- Documentación: todas las celdas de las tablas empiezan con mayúscula, salvo las que empiezan con un nombre del lenguaje en código. (Federico Dobal, 2026-11-14)
- Documentación: ocultar y mostrar la barra lateral se anima con una transición en vez de reacomodar la página de golpe, y la barra superior tiene fondo blanco translúcido con desenfoque. (Federico Dobal, 2026-11-14)
- En la documentación, el título "Simulador de Monitores" de la barra se quita: a la izquierda queda solo el botón "Volver al simulador". (Federico Dobal, 2026-11-13)
- El error por una variable fuera de un monitor o un proceso dice solo "No se permiten variables globales". (Federico Dobal, 2026-11-13)
- Los errores de compilación que mostraban un ejemplo con valores inventados ahora describen la forma en términos generales, con el nombre que escribió el alumno: "Declarar la cola con los tipos de sus componentes: Cola c(tipo, ...)", "'a' es un arreglo: falta el índice, a[índice]", "las formas válidas son push(c, componentes), push(c, (componentes)) o push(c, (clave, (resto)))". (Federico Dobal, 2026-11-13)
- **Cambio incompatible.** Las colas se declaran con los tipos de sus componentes: `Cola c(int)`, `Cola p(int, text)`, `ColaOrdenada g(int, text, text)` o, con la clave separada del resto, `ColaOrdenada g(int, (text, text))` (las dos últimas son la misma cola). `Cola c;` deja de compilar y el mensaje dice cómo escribirla. Con eso cada `push` y cada `pop` se verifica al compilar, en cantidad y tipo de cada componente, con las conversiones de la asignación; las componentes se escriben sueltas, como tupla o con la clave agrupada: `push(g, id, n, a)`, `push(g, (id, n, a))`, `push(g, (id, (n, a)))`, y más paréntesis es error. La clave de una ColaOrdenada no puede ser `bool`. Las tuplas se muestran entre paréntesis, `(7, Ana)`, en el panel y en la salida. Nuevo ejemplo 09, la guardia con tuplas (gravedad, id). (Federico Dobal, 2026-11-13)
- Barra más ordenada: una línea separa los controles de ejecución de las opciones; los selectores llevan su rótulo ("velocidad", "turnos") y los botones una explicación emergente; el número del instante lleva su rótulo. La línea de tiempo y el panel Monitores, vacíos antes de la primera ejecución, explican qué van a mostrar. (Federico Dobal, 2026-11-13)
- Línea de tiempo rediseñada para leerse mejor: las filas quedan fijas en el orden de declaración, con una línea entre familias, en vez de subir las que avanzaron; las esperas se dibujan en un tono de fondo y dicen su causa ("espera entrar a Corralon", "wait(esperaCli[3])"); dentro del monitor el tramo es liso, con el nombre del monitor una vez (recortado con puntos suspensivos a los caracteres que entren si no cabe entero), en lugar de una "M" por instante; fuera del monitor, el mismo color más claro. (Federico Dobal, 2026-11-13)
- Los paneles ya no recuerdan su tamaño entre recargas: al abrir la página, cada uno arranca en su tamaño y lugar iniciales. (Federico Dobal, 2026-11-13)
- Pantalla en dos columnas: a la izquierda el editor con la línea de tiempo debajo, a la derecha el panel Monitores a toda altura. La salida deja de tener un lugar fijo: se abre con el botón "Salida" de la barra, que muestra cuántas líneas hay, y se cierra con el mismo botón o con Escape. (Federico Dobal, 2026-11-13)
- En las listas de cada monitor, una flecha separa el rótulo (Compitiendo, En monitor, En wait) de los nombres de los procesos. (Federico Dobal, 2026-11-13)
- En el dibujo del monitor las tres zonas son cuadrados con las esquinas redondeadas, rotulados "Compitiendo", "En wait" y "En monitor" en lugar de los números 1, 2 y 3, con los mismos nombres que las listas de abajo. (Federico Dobal, 2026-11-13)
- En el panel Monitores cada monitor es un bloque con marco y una banda con su nombre, para distinguir uno de otro cuando hay varios. (Federico Dobal, 2026-11-13)
- Interfaz en un tema claro y sobrio, pensado para el aula: fondo gris, cada panel como una tarjeta blanca con aire alrededor, un solo color de acento y menos colores en la sintaxis. Los estados de la línea de tiempo y del editor pasan a tonos apagados (ocre compitiendo, ladrillo esperando, verde en delay) y conservan el rayado, los puntos y la "M", para no depender solo del color. Se quita el modo oscuro. (Federico Dobal, 2026-11-13)
- Paleta de procesos en tonos apagados entre el azul y el magenta, con contraste de 4,5:1 o más sobre blanco para que los nombres se lean como texto; un test lo verifica junto con el tono. (Federico Dobal, 2026-11-13)
- En el panel Monitores, cada lista de procesos muestra hasta 6 nombres; si hay más, un botón "+N más" la despliega entera y "ver menos" la vuelve a cerrar. (Federico Dobal, 2026-11-13)
- En el panel Monitores, los procesos en wait se agrupan por variable condición, una línea por cada una que tiene procesos. (Federico Dobal, 2026-11-13)
- El panel de abajo toma el alto de su contenido: al abrir la página es bajo y crece con los procesos hasta un poco más de la mitad de la pantalla. El panel Monitores es más ancho y, debajo de cada dibujo, lista los procesos compitiendo, en monitor y en wait (con su variable condición). (Federico Dobal, 2026-11-13)
- El panel Monitores pasa abajo a la derecha, junto a la línea de tiempo; entre los dos ocupan algo más de la mitad de la pantalla y el alto se sigue cambiando arrastrando el borde. El dibujo es más chico y sobrio (trazos grises, sin rellenos ni etiquetas de color) y los puntos de los procesos ya no se salen de su zona en algunos navegadores. (Federico Dobal, 2026-11-13)
- Escribir empty sobre una variable condición da el error "En la práctica no se permite preguntar si una variable condición está vacía". Antes el mensaje decía que el nombre no estaba declarado. (Federico Dobal, 2026-11-13)
- Los parámetros de un procedure se escriben como en la cátedra: ';' separa grupos y ',' separa nombres del mismo modo y tipo, como en Pasar(idP, edad: in int; R: out text). También se acepta la forma de C, con el tipo adelante (request(int id, tiempo)), siempre de entrada. Separar grupos con coma es error. (Federico Dobal, 2026-11-13)
- El tipo lógico se escribe bool y el resto de la división, mod, como en la notación de la cátedra. Escribir boolean o % da un error que indica qué usar. Las palabras monitor, procedure y process se aceptan con cualquier combinación de mayúsculas (Monitor, Procedure, PROCESS). (Federico Dobal, 2026-11-13)
- Cuando un procedure de un monitor llama a otro monitor, conserva el suyo hasta que la llamada termina, aunque haga wait en el otro, como explica la cátedra (ADR 0007, reemplaza al 0004). El mensaje de interbloqueo dice qué monitor retiene cada proceso bloqueado y el snapshot informa los monitores tomados de cada proceso (campo holding). (Federico Dobal, 2026-11-13)
- Cuando un monitor se libera, entra en ese mismo instante uno de los procesos de la cola de entrada elegido al azar, y no el que llegó primero. Así lo explica la cátedra en la explicación práctica de monitores (ADR 0006). (Federico Dobal, 2026-11-13)
- Al liberarse un monitor, el primero de la cola de entrada entra en ese mismo instante y el
  resto sigue esperando en orden de llegada. Antes se despertaba a toda la cola y el
  siguiente entraba recién en un instante posterior, con el monitor libre mientras tanto
  (ADR 0005). (Federico Dobal, 2026-09-23)
- En la línea de tiempo y el editor, el estado "listo" pasa a llamarse "sin turno": un
  proceso que podía avanzar pero al que el planificador no eligió en ese instante.
  (Federico Dobal, 2026-09-23)
- Los colores de proceso ya no incluyen rojos, amarillos ni verdes: quedan reservados para
  los estados (rojo esperando, amarillo compitiendo). (Federico Dobal, 2026-09-23)
- Llamadas abiertas entre monitores: un procedure de A que llama a B libera A durante la
  llamada y vuelve a competir por A al retornar, como después de un `wait`. Antes retenía A
  y podía quedar en interbloqueo aunque cada monitor estuviera bien sincronizado (ADR 0004).
  (Federico Dobal, 2026-09-23)
- El compilador controla los tipos: una condición tiene que ser `boolean`, un índice `int`,
  y una asignación, un argumento o un valor inicial tienen que coincidir con el tipo del
  destino. Solo se convierten solos un `int` a `double` y un número a `text`. Antes estos
  errores aparecían al ejecutar, y `int x = 2.9` truncaba en silencio. (Federico Dobal, 2026-09-23)
- Un nombre no puede tapar a otro que ya se ve (permanente, parámetro, iterador, local o
  `cond`): un `for (int i ...)` dentro de `process P[i: ...]` modificaba el iterador de la
  familia, y una local dentro de un `if` seguía tapando a la permanente después del bloque.
  (Federico Dobal, 2026-09-23)
- La cota de un `for` de rango se evalúa una sola vez, al entrar, y el iterador de un `for`
  no se puede modificar dentro del cuerpo. (Federico Dobal, 2026-09-23)
- Un arreglo o una cola no se asignan, pasan como argumento ni encolan enteros: es error de
  compilación. Antes `a = 5` convertía el arreglo en un número y `a = b` lo compartía.
  (Federico Dobal, 2026-09-23)
- Llamar desde un procedure a otro del mismo monitor es error de compilación. `empty` sobre
  algo que no es cola también, y la comparación encadenada (`1 < 2 < 3`) explica cómo
  escribirla. (Federico Dobal, 2026-09-23)
- Títulos más cortos para los programas del menú "Ejemplos". (Federico Dobal, 2026-09-21)

### Corregido
- Ejemplos actualizados: si en el navegador quedó guardada la copia sin tocar de una versión anterior de un ejemplo, al abrir el simulador se reemplaza por la versión actual, con los valores de las constantes que tenía, y un aviso lo indica. Antes seguía abierta la versión vieja hasta volver a elegir el ejemplo en el menú; por eso el banco seguía dando deadlock con otro `N` después de corregido. Un programa editado o guardado en «Mis programas» no se toca. (Federico Dobal, 2026-11-19)
- Control de desborde visual en toda la pantalla: nada se corta ni se sale de su panel, por largos que sean los nombres o por angosto que esté el panel. La tabla «Por qué nadie avanza» ya no queda cortada por el borde (en un panel angosto cada proceso pasa a un bloque); en las colas, las variables condición, la tabla de variables y la pestaña Procesos un nombre largo se abrevia sin perder el índice o pasa a otro renglón; los menús desplegables se corren para entrar en la ventana; la leyenda de procesos del editor no deja nombres por la mitad y el aviso de procesos fuera de la vista se abrevia. Todo lo abreviado muestra el texto completo al dejar el mouse encima. (Federico Dobal, 2026-11-19)
- Ejemplo «Problema completo: banco y escritorios»: termina con cualquier valor de `N`. Los empleados atendían una cantidad fija de clientes y, al cambiar `N` desde el menú Constantes, un empleado o un cliente quedaba dormido para siempre y la ejecución terminaba en deadlock. Ahora `Banco` cuenta los clientes que faltan y `Proximo` le avisa al empleado cuando no queda ninguno. Los tests corren cada ejemplo con sus constantes en otros valores. (Federico Dobal, 2026-11-19)
- Visor de monitores: cuando un proceso salía del monitor (return), su punto recorría solo la flecha corta de afuera, apareciendo y desvaneciéndose, y casi no se veía. Ahora sale del nombre del proceso en la zona 3, cruza el borde y se va por la flecha hacia la derecha. (Federico Dobal, 2026-11-18)
- Buscador de la guía: el número de sección quedaba pegado al título en los resultados («7.4Programas de ejemplo»); ahora los separa un espacio («7.4 Programas de ejemplo»). En la página el título se ve igual. (Federico Dobal, 2026-11-18)
- Guía: al llegar desde el buscador, el resaltado de la palabra buscada partía el título de la página («As ignación»), y los títulos con código separaban cada pieza. El texto del título va ahora en un solo bloque al lado del número. (Federico Dobal, 2026-11-18)
- Guía: al tocar «Copiar» en un ejemplo de código, con el mouse todavía sobre el botón aparecía además el cartel «Copied» de VitePress al lado; ahora solo el botón dice «Copiado». (Federico Dobal, 2026-11-18)
- Guía: entre 1025 y 1440 px de ancho (el de muchos proyectores), las migas de una página con título largo empujaban el botón «Abrir el simulador» fuera de la pantalla. Ahora se acortan con «…»: primero los capítulos intermedios, después la página actual. (Federico Dobal, 2026-11-18)
- Guía en un teléfono: seis páginas con tablas anchas (Notación de la cátedra, Errores de compilación y de ejecución, Programas de ejemplo, Instrucciones y Variables condición) se desplazaban de costado y la última columna quedaba fuera de la pantalla; ahora la tabla se desplaza dentro de su recuadro. Un título largo se parte al lado del número de sección, en vez de dejar el número solo en un renglón. (Federico Dobal, 2026-11-18)
- Glosario: el enlace a las variables del panel de monitores llevaba a una sección que no existe. (Federico Dobal, 2026-11-18)
- Línea de tiempo: con el zoom más chico, los tramos de un instante se encimaban con el siguiente. (Federico Dobal, 2026-11-17)
- Inspector: la tabla de variables ya no se sale de la tarjeta ni hace desplazar el panel de costado (un arreglo o una cola lleva sus celdas en un renglón propio), el panel no se puede angostar por debajo de 340 px y las pastillas no pasan a dos renglones. La barra superior se compacta de a poco en anchos medios en vez de mandar botones al renglón de abajo. (Federico Dobal, 2026-11-17)
- Buscador de la guía: las teclas del atajo quedaban fuera del recuadro porque el texto no entraba en el ancho fijo; ahora el ancho sale del texto y el alto coincide con el del botón «Abrir el simulador». (Federico Dobal, 2026-11-17)
- Botón para ampliar la línea de tiempo al costado del editor, a toda altura, que se había perdido en el rediseño de la pantalla; Escape o el mismo botón la devuelven a su lugar, y el inspector conserva su pestaña. (Federico Dobal, 2026-11-17)
- Editor: el aviso que resume los renglones con procesos fuera de la vista decía «+1 renglones más»; ahora concuerda en singular. (Federico Dobal, 2026-11-17)
- Con muchos procesos la interfaz ya llega a la velocidad «muy rápido»: la línea de tiempo dibuja solo las filas visibles y el editor solo los chips que se ven. Con 1000 procesos, cada paso pasó de 46 ms y 5500 nodos en pantalla a 16 ms y 500. (Federico Dobal, 2026-11-17)
- Documentación: los 64 ejemplos de código se resaltaban como si fueran C, de modo que `wait`, `cond` o `process` no se veían como palabras reservadas y los nombres seguidos de paréntesis se pintaban como funciones. Ahora usan una gramática propia del lenguaje, con las mismas palabras y los mismos colores que el editor del simulador, en claro y en oscuro. (Federico Dobal, 2026-11-17)
- Con muchos procesos, Ejecutar dejaba la interfaz sin responder: cada paso tardaba más que el intervalo entre pasos y se encolaban uno detrás de otro. Ahora cada paso programa el siguiente al terminar, así el navegador siempre llega a dibujar y a atender Pausar. (Federico Dobal, 2026-11-17)
- La aplicación no tenía ícono (el navegador pedía un `favicon.ico` que no existe). Ahora el simulador y la documentación comparten el ícono nuevo, y los cuadros de aviso de la documentación dicen «Nota» y «Atención» en lugar de «TIP» y «WARNING». (Federico Dobal, 2026-11-17)
- Accesibilidad: el estado de la simulación se anuncia a los lectores de pantalla cuando cambia (`aria-live`) y el error de compilación se anuncia como alerta, igual que los de ejecución; el área de código tiene nombre accesible. (Federico Dobal, 2026-11-17)
- Legibilidad: el gris de los textos secundarios pasa de un contraste de 2,5:1 a más de 4,5:1, y ningún texto de la interfaz mide menos de 12 px (rótulos de la línea de tiempo, tipos de las variables, notas de las colas, leyendas). El dibujo del monitor ocupa el ancho del panel para que sus rótulos se lean en un proyector. (Federico Dobal, 2026-11-17)
- Editor: las franjas rayadas de varios procesos en un mismo renglón se sumaban hasta tapar el código, y en un renglón largo el nombre del proceso quedaba fuera de la vista. La etiqueta ahora se ancla al borde visible del editor y los botones de zoom quedan por encima. (Federico Dobal, 2026-11-17)
- Barra de controles: a 1280 px de ancho (la resolución de muchos proyectores) el estado, el instante y el botón de tema quedaban fuera de la pantalla. Ahora los controles bajan a un segundo renglón, el menú de ejemplos tiene un ancho máximo y la píldora de estado ya no se parte en dos líneas. (Federico Dobal, 2026-11-17)
- En pantallas angostas (un teléfono), la barra de controles baja de línea en lugar de estirar la página: antes velocidad, turnos, Ejemplos, Salida y Documentación quedaban fuera de la pantalla. (Federico Dobal, 2026-11-16)
- Documentación: debajo del botón "Volver al simulador" aparecía una segunda línea divisoria y, al lado, un área vacía con cursor de enlace; eran restos del enlace del título que el tema deja aunque no haya título. El botón pasa fuera de ese enlace, alineado con el texto de la barra lateral. (Federico Dobal, 2026-11-14)
- Documentación: al plegar o desplegar la barra lateral ya no se mueve la barra superior; solo se deslizan la barra lateral y el contenido. (Federico Dobal, 2026-11-14)
- En la documentación, el enlace al simulador caía en una página 404 porque el enrutador del sitio lo tomaba como una página propia. Lo reemplaza un botón "Volver al simulador", arriba a la izquierda, que navega de verdad a la raíz. (Federico Dobal, 2026-11-13)
- Mensajes de nombre repetido: "Ya existe un parámetro llamado" (antes "llamada"), y al declarar una cond con el nombre de una variable permanente el error dice que la que ya existe es la variable, no que la cond está duplicada. (Federico Dobal, 2026-11-13)
- El límite de 6 procesos de "En wait" cuenta el total de procesos dormidos; antes se aplicaba a cada variable condición y, con un arreglo de cond (una por proceso), la lista salía entera. (Federico Dobal, 2026-11-13)
- El editor resalta delay como palabra reservada. (Federico Dobal, 2026-11-13)
- Los mensajes de error llevan tildes ("Línea", "División por cero", "Índice", "tamaño",
  "expresión"...). Un espacio no separable o una marca BOM, que llegan al copiar de un PDF,
  cuentan como espacio, y una comilla tipográfica explica que van comillas rectas. El modo
  `inout` tiene su propio mensaje. (Federico Dobal, 2026-09-23)
- El iterador oculto de `for (1..n)` y la cota de los `for` de rango ya no aparecen entre
  las variables del proceso. (Federico Dobal, 2026-09-23)
- `%` con operandos `double` calcula el resto real: `5.5 % 2` da `1.5`; antes truncaba los
  operandos y `5 % 0.5` daba "Módulo por cero". (Federico Dobal, 2026-09-23)
- Comparar dos `int` de forma exacta (antes se comparaban como `double` y por encima de 2^53
  se confundían) y tratar como error de ejecución comparar u ordenar valores de clases
  distintas: `"10" == 10` daba `true` y una `ColaOrdenada` con claves mezcladas quedaba en
  un orden arbitrario. Un `boolean` ya no se usa como número. (Federico Dobal, 2026-09-23)
- La salida conserva las últimas 500 líneas y avisa cuántas descartó; antes guardaba las
  primeras y dejaba de mostrar lo que el programa escribía. (Federico Dobal, 2026-09-23)
- Con turnos al azar, el navegador ejecuta el mismo entrelazado que la JVM para la misma
  semilla: el scheduler usa un generador propio en lugar de `java.util.Random`, que TeaVM
  implementa con otro `nextInt`. Los tests JUnit prueban ahora las mismas corridas que ven
  los alumnos. (Federico Dobal, 2026-09-23)
- Mostrar los `double` muy grandes y leer los literales decimales largos sin
  `Double.toString` ni `Double.parseDouble`, que en TeaVM dan otros dígitos que en la JVM.
  (Federico Dobal, 2026-09-23)
- Informar como error de ejecución, con su línea, un tamaño de arreglo o de `cond` negativo;
  antes aparecía "Error interno del simulador". (Federico Dobal, 2026-09-23)
- Controlar el rango de índices, tamaños, cotas de familias e índices de `cond` antes de
  convertirlos a `int`: `a[4294967296]` ya no lee `a[0]`. (Federico Dobal, 2026-09-23)
- Tratar un resultado `double` infinito o indefinido como error de ejecución; en el
  navegador hacía fallar al motor. Un literal decimal demasiado grande es error de
  compilación. (Federico Dobal, 2026-09-23)
- Mostrar los `double` grandes igual en la JVM y en el navegador (`1.0E20`); antes la JVM
  mostraba `9223372036854775807.0`. (Federico Dobal, 2026-09-23)
- Aceptar solo dígitos ASCII en números e identificadores, como la gramática; un dígito
  árabe se aceptaba en la JVM y no en el navegador. (Federico Dobal, 2026-09-23)
- Limitar el anidamiento de bloques y expresiones con un error de compilación claro; antes
  un programa muy anidado terminaba en "Error interno" solo en el navegador.
  (Federico Dobal, 2026-09-23)
- Informar como error que la inicialización de un monitor no termina; antes se cortaba en
  silencio a los 100 000 pasos. (Federico Dobal, 2026-09-23)
- Terminar solo el proceso afectado ante un error interno, en lugar de dejar la simulación
  en un interbloqueo falso, y que ninguna función del puente lance una excepción.
  (Federico Dobal, 2026-09-23)
- Limitar los arreglos a 100 000 elementos y los procesos a 5000, y abreviar los arreglos
  largos al mostrarlos; antes un programa así congelaba o cerraba la pestaña.
  (Federico Dobal, 2026-09-23)
- Deshabilitar "Detener" cuando la simulación terminó o quedó en interbloqueo: ya no puede
  avanzar. (Federico Dobal, 2026-09-23)
- Liberar el monitor cuando un proceso falla dentro de un procedimiento; antes la simulación
  se informaba como interbloqueo. (Federico Dobal, 2026-09-18)
- Informar el desborde de un entero como error de ejecución con su línea; antes la interfaz
  mostraba `Error: null`. (Federico Dobal, 2026-09-18)
- Devolver como error, y no como excepción, una falla al inicializar las variables de un
  monitor. Ninguna función del motor lanza excepciones hacia la interfaz. (Federico Dobal, 2026-09-18)
- `++` y `--` sobre un `double` (variable o elemento de arreglo) suman o restan 1.0 en lugar
  de truncar el valor. (Federico Dobal, 2026-09-18)
- Un número entero demasiado grande en el programa es un error de compilación en español y
  con su línea. (Federico Dobal, 2026-09-18)
- Evitar que la memoria crezca sin tope en ejecuciones largas: los eventos ya no guardan el
  estado completo y el registro conserva los últimos 2000. Con 50 procesos y 2000 pasos, el
  consumo pasa de unos 1000 MB a menos de 2 MB. (Federico Dobal, 2026-09-18)
- Tab sangra también una línea en blanco; antes no hacía nada si el renglón estaba vacío.
  (Federico Dobal, 2026-09-23)
- Una `ColaOrdenada` local de un proceso se reconoce como declaración. (Federico Dobal, 2026-09-23)
- El menú "Ejemplos" oculta la segunda línea solo si es la de `// espera:`; antes la descartaba
  siempre y un ejemplo sin ella perdía una línea de código. (Federico Dobal, 2026-09-23)

### Eliminado
- Documentación: el botón para ocultar la barra lateral; la barra queda fija. (Federico Dobal, 2026-11-14)
- Quitar el texto de ayuda del panel de salida cuando todavía no hay nada escrito.
  (Federico Dobal, 2026-09-21)
- Quitar de la barra la semilla visible y el campo para fijarla, agregados en esta misma
  versión; cada corrida vuelve a usar una semilla nueva sin mostrarla. (Federico Dobal, 2026-09-18)
- Quitar el botón "Compartir" de la barra, que se había agregado en esta misma versión.
  (Federico Dobal, 2026-09-18)
- Sacar de `main` el prototipo de semáforos (`legacy/`); queda en el tag de git
  `prototipo-semaforos`. (Federico Dobal, 2026-09-18)
- Quitar la skill `nuevo-concepto-concurrencia` y las menciones a otros conceptos de
  concurrencia en las reglas del repositorio. (Federico Dobal, 2026-09-18)
- Eliminar la API REST de Spring Boot, que la interfaz no usaba desde que el motor corre en
  el navegador. El núcleo queda sin dependencias de Spring. (Federico Dobal, 2026-09-18)
- Quitar las skills de terceros "caveman" y sus copias duplicadas. (Federico Dobal, 2026-09-18)

### Documentación
- Guía: páginas del panel de monitores (vectores de monitores y su selector, topes de las listas, nombres largos), de la línea de tiempo (cartel con un clic, columna de nombres ajustable) y de los procedimientos que las usan; captura nueva del selector y capturas regeneradas con el ejemplo del banco actual y los nombres nuevos de las zonas. (Federico Dobal, 2026-11-19)
- Guía alineada con el material de la cátedra (`docs/clases-materia/`), que pasa a ser la fuente de verdad del proyecto en lugar del resumen de `docs/monitores/`: se usan sus términos (*deadlock*, *busy waiting*, *passing the condition*, variables condición privadas, proceso dormido); la espera con `while` deja de presentarse como regla absoluta y se explica cuándo un `if` es correcto y cuándo falla; la tabla de notación se corrige (la equivalencia de `insertar` atendía primero al más joven). Páginas nuevas: Constantes; ADR 0009 (constantes del programa) y 0010 (orden de la `ColaOrdenada`). La página de diagnóstico pasa a `/operacion/deadlock`. Capturas regeneradas con los ejemplos nuevos. (Federico Dobal, 2026-11-18)
- Capturas de la guía regeneradas con el botón de ampliar de la línea de tiempo y la tabla de variables nueva. (Federico Dobal, 2026-11-17)
- Guía actualizada a la pantalla nueva: se reescriben las páginas de la interfaz (disposición, barra, editor, monitores, procesos y salida, línea de tiempo) y se agrega «Programas y archivos»; los procedimientos de operación usan el cartel de interbloqueo, la tabla «Por qué nadie avanza», Repetir y el avance de un proceso elegido; la referencia de atajos suma F5, F10 y Shift+F5. Las doce capturas se regeneraron. (Federico Dobal, 2026-11-17)
- ADR 0008 (delay medido en instantes); referencia de `delay`, especificación (semántica y EBNF) y páginas de ejecución, límites y solución de problemas actualizadas. (Federico Dobal, 2026-11-17)
- La portada aclara, en la sección «Origen del simulador», que el simulador es un trabajo de la PPS y no una herramienta de la materia Programación Concurrente ni de su cátedra, y que de esa materia toma la notación, el modelo de monitores y los problemas de los ejemplos. Se reescriben las frases de la portada, de Primer programa, de Notación de la cátedra, del README y de la descripción del sitio que daban a entender lo contrario. (Federico Dobal, 2026-11-16)
- Capturas del simulador en la documentación: la pantalla con sus cinco zonas numeradas, la barra, el editor con los seis estados de las franjas y con un error de compilación y otro de ejecución, la línea de tiempo con una tarjeta fija, el panel de monitores, la salida y un interbloqueo entre dos monitores. Están en las páginas de Interfaz, en Primer programa, en Diagnóstico de un interbloqueo y en Errores de compilación, con texto alternativo y epígrafe. (Federico Dobal, 2026-11-16)
- Se quita la fecha de «Última actualización» del pie de todas las páginas de la documentación. (Federico Dobal, 2026-11-16)
- Glosario rediseñado: índice alfabético, una tarjeta por término con su categoría en color (modelo, sincronización o ejecución), un recuadro «En el simulador» que indica dónde se observa cada concepto en la pantalla y enlaces a las páginas que lo amplían. Se agregan código de inicialización, ColaOrdenada, estado, parámetros in y out, y turno. (Federico Dobal, 2026-11-16)
- Documentación reorganizada como guía de referencia y operación, con siete secciones: Introducción (presentación, primer programa y notación de la cátedra), Lenguaje (una página por instrucción con sintaxis, funcionamiento, errores y ejemplo), Ejecución (instantes, estados, acceso al monitor, variables condición y finalización), Interfaz, Operación (procedimientos paso a paso), Solución de problemas (mensajes de compilación y de ejecución textuales del motor, interbloqueos y resultados que varían) y Referencia (límites, atajos, glosario y ejemplos). Los conceptos de la teoría se explican desde lo que muestra el simulador; la página «Notación de la cátedra» indica cómo escribir las formas de las clases que el simulador no acepta. Se corrigieron afirmaciones que no coincidían con el simulador: los turnos en ronda no se repiten exactamente, el dibujo de un monitor muestra hasta seis procesos por zona y la salida del ejemplo Productor/Consumidor no alterna estrictamente. Se elimina la página «Índice». (Federico Dobal, 2026-11-16)
- Material de la cátedra en `docs/clases-materia/`: la teoría 4, la presentación de la clase 4 y las dos versiones de la explicación 3 (monitores), en PDF. Queda como referencia de la semántica y fuera del sitio de documentación. (Federico Dobal, 2026-11-16)
- Salen del sitio las páginas "Qué avisa el compilador", "Qué no existe", "Ejemplo completo" y la especificación EBNF (esta última sigue en `docs/lenguaje/especificacion.md` como documento de desarrollo). (Federico Dobal, 2026-11-13)
- Las páginas del sitio pasan a un formato esquemático: tablas para controles, atajos, estados, zonas y reglas, recuadros para lo importante y párrafos de dos o tres renglones como máximo. (Federico Dobal, 2026-11-13)
- La portada del sitio habla solo del simulador, con la lista de lo que ofrece enlazada a cada página, las simplificaciones y los créditos, sin detalles de implementación. La sección Simulador se divide en una página por panel: la pantalla, barra de controles, editor, línea de tiempo, monitores, salida y ejecución (instantes, estados, fin, interbloqueo y errores). (Federico Dobal, 2026-11-13)
- El sitio de documentación queda solo con lo que hace falta para usar el simulador: la pantalla, el lenguaje y los programas de ejemplo. La teoría de monitores y las decisiones de diseño salen del sitio (los archivos siguen en `docs/` para el desarrollo y la PPS) y se quitan las notas de versión. (Federico Dobal, 2026-11-13)
- Página "Qué avisa el compilador" completa: todos los errores de compilación agrupados por tema (escritura, estructura, procedures, llamadas, variables condición, tipos, nombres, arreglos, colas) con su significado, y los errores de ejecución, tal como se muestran en pantalla. Se verificó contra una batería de 111 programas, uno por error. (Federico Dobal, 2026-11-13)
- La documentación se reorganiza como sitio: la teoría de monitores en páginas por tema (qué es un monitor, variables condición, llamadas entre monitores, diferencia con los semáforos, ejemplos canónicos, técnicas e interbloqueo, conceptos previos); el lenguaje en una página por tema y por instrucción (estructura, palabras reservadas, tipos, colas, monitores, procesos, sentencias, if y while, for, wait y signal, push y pop, write, delay, expresiones, alcance, errores, qué no existe, ejemplo completo y especificación); una sección Simulador que explica cada panel de la pantalla; y en Referencia los nueve programas de ejemplo comentados, las notas de versión (este archivo) y las decisiones de diseño. Los archivos `referencia_lenguaje.md`, `sintaxis_especificacion.md`, `monitores.md` y `conceptos_concurrencia.md` pasan a `docs/lenguaje/` y `docs/monitores/`; se actualizan las referencias en README, CONTRIBUTING, CLAUDE.md, las skills y los ADR. (Federico Dobal, 2026-11-13)
- Volver a versionar la documentación técnica de `docs/` (teoría, referencia, especificación y
  decisiones), que las reglas del repositorio y las skills tratan como fuente de verdad; solo
  quedan fuera los informes de revisión y de verificación. (Federico Dobal, 2026-09-23)
- Actualizar `monitores.md` (sin `inout` ni constantes globales, el buffer limitado compila,
  llamadas abiertas entre monitores), la referencia (tipos y conversiones, alcance sin tapado,
  `for` con cota fija, `empty(c)`, topes, mensajes con tildes, cadenas sin escapes) y la
  especificación, con la EBNF alineada con el parser. ADR 0004: llamadas abiertas.
  (Federico Dobal, 2026-09-23)
- El README enlaza la documentación y describe los errores de ejecución y las franjas.
  (Federico Dobal, 2026-09-23)
- Registrar en el ADR 0003 que el alcance del simulador es solo monitores y cuáles son las
  funcionalidades previstas; el ADR 0002 queda reemplazado. (Federico Dobal, 2026-09-18)
- Sincronizar el README con la versión sin servidor (interfaz actual, carpetas, ejemplos,
  semilla, política y enlaces) y corregir la definición de instante en la referencia y la
  especificación del lenguaje: evaluar una guarda no consume un paso. (Federico Dobal, 2026-09-18)
- Describir en el README los seis controles de la barra. (Federico Dobal, 2026-09-18)
- README más breve: qué permite hacer el simulador y cómo correrlo, sin enlaces a `docs/`.
  (Federico Dobal, 2026-09-23)

### Interno
- Script `scripts/desborde.mjs`: abre el simulador real con programas exigentes (nombres largos, vectores de monitores, colas y arreglos grandes, deadlock) en varios anchos de ventana y de panel, con los menús abiertos, y lista cada elemento cuyo contenido se corta o se sale de su lugar; termina con error si encuentra alguno. (Federico Dobal, 2026-11-19)
- Partir el componente de la línea de tiempo: la fila (carril de monitor o proceso), el cartel del instante y la medición de texto pasan a archivos propios, sin cambio de comportamiento. (Federico Dobal, 2026-11-19)
- `scripts/capturas.mjs` regenera las capturas de la guía con el simulador real: abre cada programa por enlace, con semilla fija, de modo que las imágenes salen iguales cada vez. (Federico Dobal, 2026-11-17)
- Estilos por componente con CSS Modules (`Componente.module.css`); `index.css` conserva los tokens de color, los botones, los menús y los colores de estado, que son compartidos. `App.tsx` se parte en `TopBar`, `EditorPane`, `Inspector`, `Timeline` y `StatusBar`; los cálculos de la línea de tiempo pasan a `timelineLayout.ts`, con tests. (Federico Dobal, 2026-11-17)
- Interfaz: el estado de cada paso reutiliza del anterior los objetos que no cambiaron (`reuse.ts`), de modo que los componentes memorizados de los monitores y procesos que no se movieron no se vuelven a dibujar. El motor sigue entregando el estado completo: medido, generarlo y leerlo cuesta 3 ms con 1000 procesos, así que la diferencia se calcula del lado de la interfaz, que es donde estaba el costo. (Federico Dobal, 2026-11-17)
- El estado que entrega el núcleo incluye, para cada variable permanente, el instante de su última escritura (`lastWriteInstant`), además de quién la escribió. Lo usa la tabla de variables del panel de monitores. (Federico Dobal, 2026-11-17)
- Núcleo: los procesos que avanzaron en el instante se guardan en un conjunto ordenado en lugar de una lista, y el estado arma una sola vez la posición de cada uno en el turno. Con miles de procesos avanzando a la vez, un paso del motor pasa de 152 ms a 23 ms (5000 procesos) y de 9 ms a 4 ms (1000). (Federico Dobal, 2026-11-17)
- ESLint deja de revisar la caché de VitePress (`npm run lint` terminaba con tres avisos ajenos al proyecto) y se quita la dependencia `react-resizable-panels`, que no se usaba. (Federico Dobal, 2026-11-17)
- Tests de la interfaz con Vitest (`npm run test` en `frontend/`, incluido en `npm run check` y en el CI): prueban la lógica pura, sin navegador. Los primeros cubren el coloreado del editor y el armado de las marcas de los procesos. (Federico Dobal, 2026-11-17)
- Partir el editor de código en módulos: el coloreado (`editor/highlight.ts`), las ayudas de edición (`editor/editing.ts`) y la medición de los renglones (`editor/useLineMetrics.ts`) salen de `CodeEditor.tsx`, que queda con el componente y las marcas de los procesos. (Federico Dobal, 2026-11-17)
- Unificar en un solo lugar (`Place`, creado por `VariableAccess.place`) la lectura y escritura de una variable o de un elemento de arreglo, que estaba repetida en la asignación, `++`/`--`, el intercambio `:=:` y los parámetros `out`; se elimina `LValue`. Sin cambios de comportamiento: los tests de caracterización pasan sin regenerarse. (Federico Dobal, 2026-11-16)
- Clase `QueueChecks` en `lang/`, con los controles de push y pop contra la declaración de la cola que tenía `SemanticValidator`, que queda en 375 líneas. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Clase `NameCollector` en `lang/`, con la primera pasada del validador (nombres repetidos de monitores, procesos, permanentes, cond, procedures y parámetros), y record `MonitorInfo` en su propio archivo. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- El paquete Java del núcleo pasa de `ar.edu.unlp.info.simulador` a `ar.edu.unlp.info.simulator`; se actualizan el `pom.xml`, el cálculo de la huella del motor, el hook de pre-commit, CLAUDE.md y las skills que nombran la ruta. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `SimulatorJs`: el snapshot y el estado final que comparten las respuestas de `create`, `step` y `state` se arman en `appendState`; se corrigen dos `@param` que habían quedado con los nombres viejos. El JSON es el mismo. (Federico Dobal, 2026-11-16)
- Los `switch` sobre tipos sealed (`Stmt`, `Expr`, `Value`) del validador, el AST, el snapshot y `Value` nombran cada caso en lugar de usar `default`: si se agrega una sentencia, una expresión o un valor, el compilador marca cada lugar a completar. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `SemanticValidator`: partir la recolección de nombres (`collectMonitor`, `collectPermanentVars`, `collectConds`, `collectProcedures`, `declareTopLevel`) y sacar de `checkMonitorCall` el control de los argumentos out (`checkOutArgument`) y de `checkStmt` el de `++`/`--` (`checkIncDec`). Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Clase `StatementParser` en `lang/parser/`, con el análisis de las sentencias que tenía `Parser`; `Parser` queda en 195 líneas con la estructura del programa (monitores, procedures, parámetros, procesos). Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `TokenCursor`: la clasificación de tokens (`isScalarType`, `isDeclStart`) pasa del `Parser` al cursor, que la comparten el parser y la sintaxis de colas. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Líneas del núcleo dentro de las 100 columnas del `.editorconfig`: cortes de línea, Javadoc en varias líneas y tres variables extraídas donde el corte quedaba ilegible. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Convenciones: los nombres de los tests van en inglés (con Javadoc y mensajes en español), el núcleo ya está todo en inglés, y `nucleo/CLAUDE.md` describe los colaboradores de la VM y cuándo se regeneran los golden master. (Federico Dobal, 2026-11-16)
- Golden master con nombres en inglés: la carpeta `characterization/`, `compile-errors.{mon,txt}`, las claves del corpus (`example/`, `canon/`, `variant/`, `extra/`) y sus archivos, las etiquetas de cada corrida y la propiedad `-Dcharacterization.regenerate=true`. (Federico Dobal, 2026-11-16)
- Tests del núcleo con nombres en inglés: clases (`CharacterizationTest`, `InvariantsTest`, `ProgramCorpus`, `ExamplesTest`, `VmRegressionTest`), métodos `@Test` (el nombre sigue describiendo el comportamiento) y variables. Los tests son los mismos. (Federico Dobal, 2026-11-16)
- Puente al navegador con nombres en inglés: `SimuladorJs` pasa a `SimulatorJs` y sus funciones a `create`, `restart`, `step`, `state` y `release`; `api.ts` las usa como `engine.*`, y `simulador.d.ts`, el smoke, el `pom.xml` y la documentación nombran las nuevas. El JSON que viaja no cambia. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Nombres en inglés en `lang/`: los orígenes de un símbolo del validador (`PERMANENT_ORIGIN`, `LOCAL_ORIGIN`, `PARAMETER_ORIGIN`, `ITERATOR_ORIGIN`) y las variables locales que quedaban en castellano. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Nombres en inglés en `vm/`: `Azar` pasa a `SeededRandom` (con `shuffle`), los topes `TOPE_*` a `MAX_*`, `PROB_AVANCE` a `ADVANCE_PROBABILITY` y las variables locales en castellano a su equivalente; CLAUDE.md, la skill de semántica, la especificación y el ADR 0006 nombran las clases y constantes nuevas. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `Scheduler`: separar el turno de round robin (`roundRobinTurn`) y el aleatorio (`randomTurn`). Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `VirtualMachine`: un solo condicional para el turno vacío en `step`, el programa como parámetro de `initialize` en lugar de campo, y `namesList` para enumerar los monitores del mensaje de interbloqueo. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `Process`: `isReady`, `isSystem` y la fábrica `Process.system` reemplazan las comparaciones con `State.READY`, los `id < 0` y el `-1`/`#888888` sueltos de la VM, el scheduler, el log y el snapshot. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Clase `StatementExecutor` en `vm/`, con la ejecución de cada sentencia que tenía `VirtualMachine`; la VM queda en 320 líneas y coordina al scheduler, al ejecutor, al protocolo de monitores y al log. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Clase `SimulationClock` en `vm/`, con el instante y la hora en ms que tenía `VirtualMachine` como campos sueltos. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Clase `MonitorProtocol` en `vm/`, con el protocolo de los monitores que tenía `VirtualMachine`: entrar, liberar con traspaso, wait/signal/signal_all y terminar con error soltando los monitores. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `EventKind` en `vm/`: los tipos de evento del log pasan de textos sueltos a un enum. El JSON que recibe el navegador no cambia. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `VirtualMachine`: extraer `runMonitorInit`, `procedureActivation`, `writeOutParameters`, `pushedElement` y `assignPopped` de los métodos que hacían dos cosas. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `VirtualMachine.executeStmt`: un despacho por tipo de sentencia y `isStructural` aparte, en lugar de un `yield` por caso. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `VariableAccess.arraySlot`: el acceso a un elemento de arreglo (índice, arreglo y control de rango) que repetían la asignación y el `++`/`--` de la VM. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `Parser`: nombres en inglés para el contador de nombres ocultos, el parámetro de `parseQuant` y `parseStatementUnchecked`. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Clase `QueueSyntaxParser` en `lang/parser/`, con la sintaxis de las colas que tenía `Parser` (tipos de las componentes, push y pop). Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Clase `ExpressionParser` en `lang/parser/`, con la gramática de las expresiones que tenía `Parser`. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Clase `TokenCursor` en `lang/parser/`, con el recorrido de los tokens y el tope de anidamiento que tenía `Parser`. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Clase `DecimalLiteral` en `lang/parser/`, con la conversión de los literales decimales que tenía `Parser`. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `Parser`: partir `parseFor` en una función por forma del for y sacar de `parseStatement` y `parsePrimary` el skip, el delay, los literales numéricos y `empty`. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `Parser`: extraer `parseArguments`, que se repetía en write y en la llamada a un monitor, y juntar los operadores de comparación en una constante. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Golden master de la compilación (`CompileErrorsCharacterizationTest`): unos 200 programas, uno por mensaje de error del lexer, el parser, el validador y el tipado, más casos válidos y generados (anidamientos, literales largos), con el mensaje y la línea exactos que ve el alumno. El golden de la VM suma espera activa, delay fuera de rango, desbordes, inicialización sin fin y topes de tamaño. (Federico Dobal, 2026-11-16)
- `ProgramLoader.familyBounds`: las cotas de un arreglo de monitores o de una familia de procesos se evalúan y se cuentan en un solo lugar, que usan la carga de monitores, la de procesos y el error de índice fuera de rango de la VM. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Clase `Scheduler` en `vm/`, con la elección del turno de cada instante que tenía `VirtualMachine` (`PROB_AVANCE`, el cursor de round robin y el paso a paso). Usa el mismo `Azar` que la VM, así una semilla da el mismo resultado que antes. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Clase `EventLog` en `vm/`, con el registro de eventos que tenía `VirtualMachine` (eventos del instante, últimos 2000 de la ejecución, numeración y silencio durante la inicialización). El tope pasa a ser `EventLog.TOPE_LOG`. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `VirtualMachine`: sacar de `step` el avance del turno (`runTurn`) y el de cada proceso con su manejo de errores (`runProcess`). Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `VirtualMachine`: sacar de `executeStmt` el if, el while y el for (`execIf`, `execWhile`, `execFor`) y de `execMonitorCall` el armado del destino de un parámetro out (`outTarget`). Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `VirtualMachine`: partir `execCondOp` en `condKey`, `execWait`, `execSignal` y `execSignalAll`. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- `VirtualMachine`: extraer `logDeadlock`, `destination` y `enqueueEntrant`, que estaban repetidos en el paso, en la entrada al monitor y en signal/signal_all. Sin cambios de comportamiento. (Federico Dobal, 2026-11-16)
- Test de caracterización del núcleo (golden master): corre cada programa del corpus de invariantes y otros once (delay, errores de ejecución, ciclo entre monitores, errores al inicializar, colas ordenadas con tuplas) por el puente `SimuladorJs`, con las dos políticas, tres semillas y el modo paso a paso, y compara cada respuesta con la guardada en `nucleo/src/test/resources/caracterizacion/`. Es la red para refactorizar sin cambiar lo que ve el alumno; se regenera con `mvn test -Dcaracterizacion.regenerar=true`. (Federico Dobal, 2026-11-16)
- Lint: las reglas de hooks de React se aplican solo a la aplicación (`src/`); el tema de la documentación es Vue y sus composables no siguen esas reglas. (Federico Dobal, 2026-11-16)
- En desarrollo, el servidor de Vite redirige `/docs/` al de VitePress (puerto 5174) y `./dev.sh` levanta los dos, así el botón Documentación funciona también en local. (Federico Dobal, 2026-11-13)
- El snapshot trae los elementos de cada arreglo y cola uno por uno (`elements`, hasta 50) y la cantidad total (`size`), además del texto; en un escalar `elements` es null. Con eso la interfaz dibuja celdas sin tener que interpretar el texto. (Federico Dobal, 2026-11-13)
- Separar de la máquina virtual la carga del programa, el acceso a variables, la salida y la construcción del snapshot, para poder sumarle funcionalidad sin que siga creciendo. (Federico Dobal, 2026-11-13)
- `EjemplosTest` lee la línea `// espera:` partiendo en el primer punto y el primer `=`, así
  un valor esperado puede tener decimales. El README, `CLAUDE.md` y `.java-version` indican
  que el núcleo necesita JDK 21. (Federico Dobal, 2026-09-23)
- Actualizar `CLAUDE.md` y las skills `semantica-concurrencia` y `extender-lenguaje` con las
  decisiones vigentes: invariante 4 (misma semilla, mismo resultado en JVM y navegador, sin
  repetir corridas desde la interfaz), llamadas abiertas y las clases nuevas del validador.
  (Federico Dobal, 2026-09-23)
- Corregir comentarios y Javadoc que no correspondían al código (política de turnos, copia de
  arreglos, pasos atómicos, cómo regenerar el motor). (Federico Dobal, 2026-09-23)
- `InvariantesTest` controla después de cada paso las invariantes de la VM (exclusión mutua,
  colas, determinismo, deadlock honesto, topes y resultado de los ejemplos) sobre 36
  programas, con 25 semillas y las dos políticas. (Federico Dobal, 2026-09-23)
- Ignorar en git la carpeta `.ua/`, donde Understand-Anything guarda el grafo de
  conocimiento local del proyecto. (Federico Dobal, 2026-09-21)
- Incorporar reglas del repositorio, hooks de git, integración continua, registro de cambios
  y configuración de Claude Code. (Federico Dobal, 2026-09-18)
- Registrar la huella del núcleo en `simulador.hash` al regenerar el motor, y sumar los
  scripts `smoke` y `check` al frontend. (Federico Dobal, 2026-09-18)
- Agregar tests de regresión para los bugs B1 a B6 de la revisión (desactivados hasta
  arreglarlos) y tests del contrato del puente `SimuladorJs`. (Federico Dobal, 2026-09-18)
- Verificar en cada push y PR los tests del núcleo, que el motor esté al día y que el
  frontend compile sin errores de lint. (Federico Dobal, 2026-09-18)
- Renombrar la carpeta `backend/` a `nucleo/`: sin servidor, contiene el motor del
  simulador que se compila a JavaScript. (Federico Dobal, 2026-09-18)
- Reunir los programas de ejemplo en `ejemplos/`, con el resultado esperado en su encabezado,
  y verificarlos con 25 semillas en JUnit y en el smoke del motor. (Federico Dobal, 2026-09-18)
- El hook `pre-commit` acepta un cambio del núcleo cuyo motor regenerado sale idéntico, y
  exige en cambio que no queden cambios del motor sin agregar al commit. (Federico Dobal, 2026-09-18)
- Dejar `docs/` fuera del repositorio: se ignora y se deja de seguir, pero los archivos quedan
  en la copia local. (Federico Dobal, 2026-09-23)

## [0.1.0] - 2026-09-17

Reconstruido a partir del historial de git; varios commits no tenían descripción.

### Agregado
- Prototipo inicial del simulador basado en semáforos. (Federico Dobal, 2026-05-21)
- Tipo `double` y sintaxis sin distinción de mayúsculas en el prototipo. (Federico Dobal, 2026-05-22)
- Reestructuración a simulador de monitores con núcleo Java y frontend React. (Federico Dobal, 2026-09-10)
- Reinicio de la interfaz para incorporar funciones de forma incremental. (Federico Dobal, 2026-09-17)

### Corregido
- Solo las variables simples muestran su valor antes y después. (Federico Dobal, 2026-05-22)
- Un proceso READY que va a bloquearse en el instante se muestra como BLOCKED. (Federico Dobal, 2026-07-28)
