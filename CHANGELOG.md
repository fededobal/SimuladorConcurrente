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
