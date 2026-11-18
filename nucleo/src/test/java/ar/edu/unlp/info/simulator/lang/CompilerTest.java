package ar.edu.unlp.info.simulator.lang;

import ar.edu.unlp.info.simulator.lang.parser.ast.Param;
import ar.edu.unlp.info.simulator.lang.parser.ast.ParamMode;
import ar.edu.unlp.info.simulator.lang.parser.ast.Program;
import ar.edu.unlp.info.simulator.lang.parser.ast.Type;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CompilerTest {

    @Test
    void compilesTheTheoryCounter() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor TOTAL {
                    int cant = 0;
                    procedure incrementar() { cant = cant + 1; }
                    procedure verificar(R: out int) { R = cant; }
                }
                process empleado[id: 0..4] { while (true) { TOTAL.incrementar(); } }
                process coordinador { int c = 0; while (true) { TOTAL.verificar(c); } }
                """));
    }

    @Test
    void compilesBufferWithConditionVariables() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor Buffer {
                    int dato = 0;
                    bool hayDato = false;
                    cond P, C;
                    procedure Enviar(D: in int) {
                        if (hayDato) wait(P);
                        dato = D; hayDato = true;
                        signal(C);
                    }
                    procedure Recibir(R: out int) {
                        if (not hayDato) wait(C);
                        R = dato; hayDato = false;
                        signal(P);
                    }
                }
                process A { int x = 0; Buffer.Enviar(1); }
                process B { int y = 0; Buffer.Recibir(y); }
                """));
    }

    @Test
    void rejectsGlobalVariables() {
        CompilationException ex = assertThrows(CompilationException.class, () -> Compiler.compile("""
                int N = 5;
                monitor M { procedure op() { skip; } }
                process P { M.op(); }
                """));
        assertTrue(ex.getMessage().toLowerCase().contains("global"), ex.getMessage());
    }

    @Test
    void rejectsInoutParameter() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { procedure op(a: inout int) { a = 1; } }
                process P { int x = 0; M.op(x); }
                """));
    }

    @Test
    void acceptsSortedQueue() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M {
                  ColaOrdenada c(int, int);
                  procedure guardar(prio: in int; dato: in int) { push(c, prio, dato); }
                  procedure sacar(p: out int; d: out int) { pop(c, p, d); }
                }
                process P { int a = 0; int b = 0; M.guardar(2, 20); M.sacar(a, b); }
                """));
    }

    /** La cantidad de componentes de un push o un pop es la de la declaracion. */
    @Test
    void rejectsComponentCountDifferentFromDeclared() {
        CompilationException ex = assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M {
                  ColaOrdenada c(int, int);
                  procedure guardar(x: in int) { push(c, x, 1); }
                  procedure sacar(r: out int) { pop(c, r); }
                }
                process P { int a = 0; M.guardar(1); M.sacar(a); }
                """));
        assertTrue(ex.getMessage().contains("guarda (int, int)"), ex.getMessage());
        assertTrue(ex.getMessage().contains("1 componente"), ex.getMessage());
    }

    /** Las dos formas de declarar y las tres de encolar y desencolar significan lo mismo. */
    @Test
    void acceptsAllFormsToDeclarePushAndPop() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M {
                  ColaOrdenada g(int, (text, text));
                  Cola h(int, text, text);
                  Cola u(int);
                  procedure f(id: in int; n: in text; a: in text) {
                    push(g, (id, (n, a)));
                    push(g, (id, n, a));
                    push(g, id, n, a);
                    push(h, id, (n + a) + "!", a);
                    push(u, (id + 1) * 2);
                  }
                  procedure s(id: out int; n: out text; a: out text) {
                    pop(g, (id, (n, a)));
                    pop(g, (id, n, a));
                    pop(g, id, n, a);
                    pop(u, id);
                  }
                }
                process P { int i = 0; text n = "", a = ""; M.f(1, "n", "a"); M.s(i, n, a); }
                """));
    }

    /** Los mensajes de nombre repetido concuerdan con lo que se repite. */
    @Test
    void duplicateNameMessagesAgreeInGender() {
        assertTrue(errorOf("""
                monitor M { procedure f(a: in int) { int a = 0; } } process P { M.f(1); }
                """).contains("un parámetro llamado 'a': elegí otro nombre para no taparlo"));
        assertTrue(errorOf("process P { int x = 0; int x = 1; }")
                .contains("una variable local llamada 'x': elegí otro nombre para no taparla"));
        // una cond y una variable con el mismo nombre: el error nombra a la que se declaro
        // primero y se informa en la segunda
        assertTrue(errorOf("monitor M { int c;\n cond c; } process P { skip; }")
                .startsWith("Línea 2: Ya existe una variable permanente llamada 'c'"));
        assertTrue(errorOf("monitor M { cond c;\n int c; } process P { skip; }")
                .startsWith("Línea 2: Ya existe una variable condición llamada 'c'"));
    }

    /** Una cola sin tipos ya no compila, y el mensaje dice como escribirla. */
    @Test
    void rejectsQueueWithoutTypes() {
        assertTrue(errorOf("process P { Cola c; }").contains("tipos de sus componentes"));
        assertTrue(errorOf("process P { ColaOrdenada c; }").contains("ColaOrdenada c(tipo, ...)"));
    }

    /** Solo un grupo, despues de la primera componente, y sin mas parentesis adentro. */
    @Test
    void rejectsExtraParenthesesInQueues() {
        assertTrue(errorOf("process P { ColaOrdenada c((int, text)); }")
                .contains("primera componente de 'c' va sin paréntesis"));
        assertTrue(errorOf("process P { Cola c(int, (text, (text))); }")
                .contains("sin más paréntesis"));
        assertTrue(errorOf("process P { Cola c(int, (text), text); }")
                .contains("se cierra la declaración"));
        assertTrue(errorOf("process P { Cola c(int, text, (text, text)); }")
                .contains("justo después de la primera componente"));
        assertTrue(errorOf("process P { Cola c(int, text); push(c, ((1, (2, 3)))); }")
                .contains("Sobran paréntesis"));
        // (3) es una expresion agrupada, no una tupla: son tres componentes y los numeros se
        // guardan en text, asi que compila
        assertDoesNotThrow(() -> Compiler.compile(
                "process P { Cola c(int, text, text); push(c, (1, (2, (3)))); }"));
        assertTrue(errorOf("process P { Cola c(int, text, text); push(c, (1, (true, (3)))); }")
                .contains("componente 2 de 'c' es text y se está encolando un bool"));
        assertTrue(errorOf("process P { Cola c(int, text, text); push(c, 1, (\"a\", \"b\")); }")
                .contains("alrededor de todas las componentes"));
        assertTrue(errorOf("process P { Cola c(int, text); int x; text t; pop(c, ((x, t))); }")
                .contains("Sobran paréntesis"));
    }

    /** Cada componente se controla contra el tipo declarado, en el push y en el pop. */
    @Test
    void rejectsIncompatibleTypesInPushAndPop() {
        assertTrue(errorOf("process P { Cola c(int, text); push(c, \"a\", 1); }")
                .contains("componente 1 de 'c' es int"));
        assertTrue(errorOf("process P { Cola c(int, text); int x; int y; pop(c, x, y); }")
                .contains("componente 2 de 'c' es text y no se puede guardar en 'y'"));
        assertTrue(errorOf("process P { ColaOrdenada c(bool); }")
                .contains("tiene que ser int, double o text"));
        // las conversiones de siempre valen: un int en un double, un numero en un text
        assertDoesNotThrow(() -> Compiler.compile(
                "process P { Cola c(double, text); double d; text t; push(c, 1, 2); pop(c, d, t); }"));
    }

    @Test
    void rejectsUndeclaredMonitor() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                process P { NoExiste.op(); }
                """));
    }

    @Test
    void rejectsWaitOutsideProcedure() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { cond c; procedure op() { signal(c); } }
                process P { wait(c); }
                """));
    }

    @Test
    void rejectsWrongArity() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { procedure op(a: in int) { a = a; } }
                process P { M.op(1, 2); }
                """));
    }

    @Test
    void rejectsOutWithNonAssignableArgument() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { procedure op(r: out int) { r = 1; } }
                process P { M.op(1 + 2); }
                """));
    }

    /** Los semaforos no existen: 'sem', 'await', 'p' y 'v' son identificadores comunes. */
    @Test
    void semaphoresAreNotKeywords() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M {
                  int sem = 0;
                  procedure op(await: in int) { sem = await; }
                }
                process P { int p = 1; int v = 2; M.op(p); M.op(v); }
                """));
    }

    @Test
    void acceptsTheThreeForForms() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M { int n = 0; procedure op() { n++; } }
                process P {
                  int i = 0;
                  for (int k = 0; k < 3; k++) { M.op(); }
                  for (int k = 1..3) { M.op(); }
                  for (i = 1..3) { M.op(); }
                  for (1..3) { M.op(); }
                }
                """));
    }

    @Test
    void rejectsProgramWithoutProcesses() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { int x = 0; }
                """));
    }

    @Test
    void acceptsSeveralVariablesInOneDeclaration() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M {
                  int a, b = 1, v[3] = ([3] 0), w[2];
                  Cola c1(int), c2(text, text);
                  procedure op(x: in text) { text lista, comp; lista = x; comp = lista; }
                }
                process P {
                  text lista, comp = "c";
                  int i = 0, j;
                  if (i == 0) int k, m;
                  M.op(comp);
                }
                """));
    }

    @Test
    void rejectsCommaWithoutNameInDeclaration() {
        CompilationException ex = assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { procedure op() { skip; } }
                process P {
                  int a, ;
                  M.op();
                }
                """));
        assertTrue(ex.getMessage().contains("nombre de la variable"), ex.getMessage());
        assertEquals(3, ex.getLine());
    }

    @Test
    void rejectsRepeatedPermanentVariableInList() {
        CompilationException ex = assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { int a, a; procedure op() { skip; } }
                process P { M.op(); }
                """));
        assertTrue(ex.getMessage().contains("duplicada"), ex.getMessage());
    }

    @Test
    void acceptsLocalSortedQueue() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M { procedure op() { skip; } }
                process P { ColaOrdenada pendientes(int); push(pendientes, 1); M.op(); }
                """));
    }

    /** La gramatica define digitos ASCII; un digito arabe da el mismo error en JVM y navegador. */
    @Test
    void nonAsciiDigitsAreNotNumbers() {
        CompilationException ex = assertThrows(CompilationException.class,
                () -> Compiler.compile("process P { int x = \u0663; }"));
        assertTrue(ex.getMessage().contains("inesperado"), ex.getMessage());
    }

    @Test
    void excessiveNestingIsCompileError() {
        String deep = "(".repeat(150) + "1" + ")".repeat(150);
        CompilationException ex = assertThrows(CompilationException.class,
                () -> Compiler.compile("process P { int x = " + deep + "; }"));
        assertTrue(ex.getMessage().contains("anidamiento"), ex.getMessage());

        String blocks = "{".repeat(150) + "skip;" + "}".repeat(150);
        assertThrows(CompilationException.class,
                () -> Compiler.compile("process P { " + blocks + " }"));

        String reasonable = "(".repeat(40) + "1" + ")".repeat(40);
        assertDoesNotThrow(() -> Compiler.compile("process P { int x = " + reasonable + "; }"));
    }

    /** 1 + 1 + ... no anida parentesis pero arma un arbol igual de hondo. */
    @Test
    void tooLongExpressionIsCompileError() {
        String sum = "1" + " + 1".repeat(300);
        CompilationException ex = assertThrows(CompilationException.class,
                () -> Compiler.compile("process P { int x = " + sum + "; }"));
        assertTrue(ex.getMessage().contains("demasiado larga"), ex.getMessage());
        assertEquals(1, ex.getLine());
    }

    @Test
    void infiniteDecimalLiteralIsCompileError() {
        CompilationException ex = assertThrows(CompilationException.class,
                () -> Compiler.compile("process P { double d = 1" + "0".repeat(400) + ".0; }"));
        assertTrue(ex.getMessage().contains("fuera de rango"), ex.getMessage());
    }

    private static String errorOf(String program) {
        return assertThrows(CompilationException.class, () -> Compiler.compile(program)).getMessage();
    }

    /** D-1: los errores de tipos se informan al compilar. */
    @Test
    void checksTypesAtCompileTime() {
        assertTrue(errorOf("process P { int x = 1; if (x) skip; }").contains("tiene que ser bool"));
        assertTrue(errorOf("process P { int x = \"a\" * 2; }").contains("se aplica a números"));
        assertTrue(errorOf("process P { int x = \"hola\"; }").contains("No se puede guardar un text"));
        assertTrue(errorOf("process P { int x = 2.9; }").contains("No se puede guardar un double"));
        assertTrue(errorOf("process P { bool b = \"10\" == 10; }").contains("No se puede comparar"));
        assertTrue(errorOf("process P { int x = true; }").contains("No se puede guardar un bool"));
        assertTrue(errorOf("process P { text t = true; }").contains("No se puede guardar un bool"));
        assertTrue(errorOf("process P { int a[2]; a[1.5] = 1; }").contains("tiene que ser int"));
        assertTrue(errorOf("""
                monitor M { procedure f(x: in int) { skip; } }
                process P { M.f(2.5); }
                """).contains("No se puede guardar un double"));
        assertTrue(errorOf("""
                monitor M { procedure f(r: out text) { r = "a"; } }
                process P { int n; M.f(n); }
                """).contains("no se puede guardar en 'n'"));
        // conversiones permitidas: int a double, numero a text, + con text concatena
        assertDoesNotThrow(() -> Compiler.compile("""
                process P { double d = 3; text t = 5; text u = 2.5; text v = "x" + 1 + true;
                            bool b = 1 < 2.5 and "a" < "b"; }
                """));
    }

    /** VI-6: un nombre no puede tapar a otro que ya se ve (la VM guarda las locales juntas). */
    @Test
    void shadowingNamesIsNotAllowed() {
        assertTrue(errorOf("process P[i: 0..1] { for (int i = 0..5) { skip; } }")
                .contains("el iterador de la familia"));
        assertTrue(errorOf("""
                monitor M { int cant = 0; procedure f() { if (true) { int cant = 5; } } }
                process P { M.f(); }
                """).contains("una variable permanente llamada 'cant'"));
        assertTrue(errorOf("""
                monitor M { int x = 0; procedure f(x: in int) { skip; } }
                process P { M.f(1); }
                """).contains("una variable permanente"));
        assertTrue(errorOf("""
                monitor M { procedure f(x: in int) { int x = 1; } }
                process P { M.f(1); }
                """).contains("un parámetro"));
        assertTrue(errorOf("process P { int x = 1; int x = 2; }").contains("Ya existe"));
        assertTrue(errorOf("""
                monitor M { cond libre; procedure f() { int libre = 1; } }
                process P { M.f(); }
                """).contains("variable condición"));
        // bloques hermanos pueden reusar un nombre: uno no ve al otro
        assertDoesNotThrow(() -> Compiler.compile("""
                process P { { int x = 1; } { text x = "a"; } for (int i = 1..2) { skip; } for (int i = 1..2) { skip; } }
                """));
    }

    /** D-3: el iterador de un for solo lo cambia el paso del for. */
    @Test
    void forIteratorCannotBeModifiedInBody() {
        assertTrue(errorOf("process P { for (int i = 1..3) { i = 5; } }").contains("iterador 'i'"));
        assertTrue(errorOf("process P { int i; for (i = 0; i < 3; i++) { i++; } }").contains("iterador 'i'"));
        assertTrue(errorOf("process P { for (double d = 1..3) { skip; } }").contains("tiene que ser int"));
        assertDoesNotThrow(() -> Compiler.compile("process P { int i; for (i = 0; i < 3; i++) { skip; } i = 7; }"));
    }

    /** VI-5: un arreglo o una cola no se asignan, pasan ni encolan enteros. */
    @Test
    void wholeArrayOrQueueIsNotAValue() {
        assertTrue(errorOf("process P { int a[2]; a = 5; }").contains("completo"));
        assertTrue(errorOf("process P { int a[2]; int b[2]; a = b; }").contains("completo"));
        assertTrue(errorOf("process P { int a[2]; int x = a; }").contains("falta el índice"));
        assertTrue(errorOf("process P { Cola c(int); Cola d(int); push(c, d); }").contains("es una cola"));
        assertTrue(errorOf("process P { int x; x[0] = 1; }").contains("no es un arreglo"));
        assertTrue(errorOf("""
                monitor M { procedure dar(r: out int) { r = 3; } }
                process P { Cola c(int); M.dar(c); }
                """).contains("es una cola"));
        assertTrue(errorOf("""
                monitor M { procedure dar(r: out int) { r = 3; } }
                process P { int a[2]; M.dar(a); }
                """).contains("falta el índice"));
        assertTrue(errorOf("""
                monitor M { procedure ver(x: in int) { skip; } }
                process P { int a[2]; M.ver(a); }
                """).contains("falta el índice"));
        assertDoesNotThrow(() -> Compiler.compile("process P { int a[2]; Cola c(int); write(a, c); }"));
    }

    /** D-4: un procedure no puede llamar a su propio monitor. */
    @Test
    void callingSameMonitorFromInsideIsError() {
        assertTrue(errorOf("""
                monitor A { procedure f() { A.g(); } procedure g() { skip; } }
                process P { A.f(); }
                """).contains("ya está dentro del monitor"));
    }

    /** VS-4: empty solo sobre colas, con o sin parentesis. */
    @Test
    void emptyOnlyOnQueuesWithOptionalParentheses() {
        assertTrue(errorOf("process P { int a[2]; bool b = empty a; }").contains("no es una cola"));
        assertDoesNotThrow(() -> Compiler.compile(
                "process P { Cola c(int); bool b = empty c; bool d = empty(c) and not empty(c); }"));
    }

    /** VS-8: la comparacion encadenada se rechaza con un mensaje que la explica. */
    @Test
    void chainedComparisonExplainsTheError() {
        assertTrue(errorOf("process P { bool b = 1 < 2 < 3; }").contains("no se encadenan"));
    }

    /** VS-9: caracteres que llegan al copiar de un PDF o un procesador de texto. */
    @Test
    void invisibleSpacesAndTypographicQuotes() {
        assertDoesNotThrow(() -> Compiler.compile("\uFEFFprocess P {\u00A0skip; }"));
        assertTrue(errorOf("process P { write(\u201Chola\u201D); }").contains("comillas rectas"));
    }

    /** VS-1: los mensajes llevan tildes. */
    @Test
    void messagesHaveAccents() {
        CompilationException ex = assertThrows(CompilationException.class,
                () -> Compiler.compile("process P {\n int x = ; }"));
        assertTrue(ex.getMessage().startsWith("Línea 2: Se esperaba una expresión"), ex.getMessage());
    }

    /** Notacion de la catedra: el tipo logico es bool; boolean se rechaza con un mensaje que lo dice. */
    @Test
    void booleanTypeIsCalledBool() {
        assertDoesNotThrow(() -> Compiler.compile("process P { bool listo = true; }"));
        assertEquals("Línea 1: El tipo se llama bool, no boolean",
                errorOf("process P { boolean listo = true; }"));
    }

    /** Notacion de la catedra: el resto de la division es mod; % se rechaza. */
    @Test
    void remainderIsWrittenMod() {
        assertDoesNotThrow(() -> Compiler.compile("process P { int x = 7 mod 3; }"));
        assertEquals("Línea 1: El resto de la división se escribe mod, no %",
                errorOf("process P { int x = 7 % 3; }"));
        assertTrue(errorOf("process P { int x = 7 mod true; }").contains("'mod' se aplica a números"));
    }

    /** La catedra escribe Monitor, Procedure y Process con mayuscula: se aceptan en cualquier forma. */
    @Test
    void monitorProcedureAndProcessAreCaseInsensitive() {
        assertDoesNotThrow(() -> Compiler.compile("""
                Monitor M { int x = 0; Procedure p() { x = 1; } }
                PROCESS P { M.p(); }
                process Q { M.p(); }
                """));
    }

    /** Todas las palabras reservadas aceptan cualquier combinacion de mayusculas (OR, OUT, cola). */
    @Test
    void everyKeywordIsCaseInsensitive() {
        assertDoesNotThrow(() -> Compiler.compile("""
                MONITOR M { INT x = 0; Bool b = FALSE; COND c; cola q(Int); colaOrdenada o(TEXT);
                  Procedure dar(r: OUT int; v: In int) {
                    IF (x == 0 OR v == 1 And NOT b) r = 7 MOD 4; ELSE SKIP;
                    WHILE (b) Wait(c); Signal(c); SIGNAL_ALL(c);
                    Push(q, 1); Pop(q, x); b = EMPTY q; Write(x); }
                }
                Process P { Bool d = TRUE == False; Double e; int y; FOR (Int i = 1..2) DELAY(0); M.dar(y, 1); }
                """));
    }

    /** Los nombres del alumno si distinguen mayusculas: declarar P no declara p. */
    @Test
    void identifiersRemainCaseSensitive() {
        assertTrue(errorOf("""
                monitor M { int total = 0; procedure p() { Total = 1; } }
                process P { M.p(); }
                """).contains("Total"));
        assertTrue(errorOf("""
                monitor M { procedure p() { skip; } }
                process P { m.p(); }
                """).contains("m"));
        assertTrue(errorOf("""
                monitor M { procedure p() { skip; } }
                process P { M.P(); }
                """).contains("P"));
    }

    /** Un nombre que coincide con una palabra reservada, con otras mayusculas, ya no es un nombre. */
    @Test
    void keywordInOtherCaseIsNotAnIdentifier() {
        errorOf("monitor M { cond Monitor; procedure p() { skip; } } process P { M.p(); }");
        errorOf("process P { int Out = 0; }");
        errorOf("process P { int colaOrdenada = 0; }");
        assertEquals("Línea 1: El tipo se llama bool, no Boolean",
                errorOf("process P { Boolean listo = true; }"));
    }

    /** Parametros como la catedra: ';' entre grupos y ',' entre nombres del mismo tipo. */
    @Test
    void parametersGroupedAndSeparatedBySemicolon() {
        Program p = Compiler.compile("""
                monitor M { int s = 0; text u = "";
                  procedure f(a, b: in int; r: out text) { s = a + b; r = "ok"; } }
                process P { text t; M.f(1, 2, t); }
                """);
        List<Param> params = p.monitors().get(0).procedure("f").params();
        assertEquals(List.of("a", "b", "r"), params.stream().map(Param::name).toList());
        assertEquals(List.of(ParamMode.IN, ParamMode.IN, ParamMode.OUT),
                params.stream().map(Param::mode).toList());
    }

    /** Parametros al estilo C: tipo adelante, de entrada. */
    @Test
    void cStyleParameters() {
        Program p = Compiler.compile("""
                monitor M { int s = 0; procedure f(int a, b; text t) { s = a + b; } }
                process P { M.f(1, 2, "x"); }
                """);
        List<Param> params = p.monitors().get(0).procedure("f").params();
        assertEquals(List.of(Type.INT, Type.INT, Type.TEXT), params.stream().map(Param::type).toList());
        assertTrue(params.stream().allMatch(Param::isInput));
    }

    /** La coma no separa grupos de parametros: el mensaje dice que va ';'. */
    @Test
    void commaBetweenParameterGroupsIsError() {
        String expected = "Los parámetros de distinto grupo se separan con ';'";
        assertTrue(errorOf("monitor M { procedure f(a: in int, b: in int) { skip; } }\n"
                + "process P { M.f(1, 2); }").contains(expected));
        assertTrue(errorOf("monitor M { procedure f(int a, int b) { skip; } }\n"
                + "process P { M.f(1, 2); }").contains(expected));
    }

    /** La catedra no usa empty sobre una variable condicion: el mensaje lo dice. */
    @Test
    void emptyOnConditionIsNotAllowed() {
        String expected = "Línea 2: En la práctica no se permite preguntar si una variable "
                + "condición está vacía";
        assertEquals(expected, errorOf("monitor M { cond espera; bool b;\n"
                + "procedure f() { b = empty(espera); } }\nprocess P { M.f(); }"));
        assertEquals(expected, errorOf("monitor M { cond turno[3]; bool b;\n"
                + "procedure f() { b = empty(turno[1]); } }\nprocess P { M.f(); }"));
    }

    /** Arreglo de monitores: el indice es obligatorio, int y de solo lectura adentro. */
    @Test
    void monitorArray() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor Escritorio[id: 0..2] { int n = id * 10; procedure f(x: in int) { n = id + x; } }
                process P { int k = 1; int a[2]; Escritorio[k].f(1); a[0] = 2; Escritorio[a[0]].f(2); }
                """));
        assertTrue(errorOf("monitor E[id: 0..2] { procedure f() { skip; } }\nprocess P { E.f(); }")
                .contains("El monitor E es un arreglo: falta el índice"));
        assertTrue(errorOf("monitor E { procedure f() { skip; } }\nprocess P { E[0].f(); }")
                .contains("El monitor E no es un arreglo"));
        assertTrue(errorOf("monitor E[id: 0..2] { procedure f() { skip; } }\nprocess P { E[true].f(); }")
                .contains("El índice del monitor tiene que ser int"));
        assertTrue(errorOf("monitor E[id: 0..2] { procedure f() { id = 3; } }\nprocess P { E[0].f(); }")
                .contains("No se puede asignar a 'id'"));
    }

    /** delay recibe una cantidad entera de instantes y no se usa en la inicializacion de un monitor. */
    @Test
    void delayTakesWholeInstants() {
        assertDoesNotThrow(() -> Compiler.compile(
                "monitor M { procedure f() { delay(1); } }\nprocess P { delay(2); M.f(); }"));
        assertTrue(errorOf("process P { delay(true); }").contains("El tiempo del delay tiene que ser int"));
        assertTrue(errorOf("monitor M { int x = 0; delay(1); }\nprocess P { skip; }")
                .contains("no puede llamar a monitores ni usar wait, signal o delay"));
    }

    /** Notacion de la catedra: {@code x :=: y} intercambia dos variables del mismo tipo. */
    @Test
    void swapAcceptsVariablesAndArrayElements() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M { int v_actual = 0, v_proxima = 1; double d[2]; cond scan[2];
                  procedure f() { v_actual :=: v_proxima; d[0] :=: d[v_actual]; } }
                process P { text a = "x", b = "y"; a:=:b; M.f(); }
                """));
    }

    /** Los dos lados de :=: tienen que ser del mismo tipo y poder escribirse. */
    @Test
    void swapRejectsMismatchedOrReadOnlySides() {
        assertEquals("Línea 1: No se puede intercambiar 'a' (int) con 'd' (double): ':=:' "
                        + "necesita dos valores del mismo tipo",
                errorOf("process P { int a = 1; double d = 2; a :=: d; }"));
        assertTrue(errorOf("monitor M { int x; procedure f(v: in int) { x :=: v; } } "
                + "process P { M.f(1); }").contains("parámetro in"));
        assertTrue(errorOf("process P[i: 0..1] { int x; x :=: i; }").contains("'i'"));
        assertTrue(errorOf("process P { int a[2], b[2]; a :=: b; }").contains("arreglo 'a' completo"));
        assertTrue(errorOf("process P { Cola c(int); Cola d(int); c :=: d; }").contains("cola 'c'"));
        assertTrue(errorOf("process P { int x; x :=: 3; }")
                .contains("Se esperaba una variable después de ':=:'"));
        assertTrue(errorOf("process P { int x, y; x :=: y }").contains("Se esperaba ';'"));
    }

    /**
     * La cátedra usa {@code cola} como tipo ({@code cola elibres;}) y como nombre
     * ({@code cond cola;}, ejercicio 2 de la Explicación 3). No se confunden: el tipo va
     * seguido del nombre que declara.
     */
    @Test
    void colaIsATypeAndAlsoAName() {
        assertDoesNotThrow(() -> Compiler.compile("""
                Monitor Cajero { bool libre = true; cond cola; int esperando = 0;
                  Procedure Pasar() { if (not libre) { esperando ++; wait (cola); } else libre = false; }
                  Procedure Salir() { if (esperando > 0) { esperando --; signal (cola); } else libre = true; }
                }
                Process Persona[id: 0..2] { Cajero.Pasar(); Cajero.Salir(); }
                """));
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M { Cola cola(int); int Cola = 0;
                  procedure f(v: in int) { push(cola, v); if (not empty cola and Cola mod 2 == 0) pop(cola, Cola); } }
                process P { int cola = 3; cola = cola + 1; M.f(cola); }
                """));
        // sigue siendo el tipo cuando declara: el mensaje de la cola sin tipos no cambia
        assertEquals("Línea 1: Declarar la cola con los tipos de sus componentes: Cola elibres(tipo, ...)",
                errorOf("monitor M { cola elibres; procedure f() { skip; } } process P { M.f(); }"));
    }

    /**
     * Como en la cátedra, el cuerpo sin llaves de un if puede ir seguido del else sin ';':
     * {@code if (s == 0) wait(pos) else s = s-1;}.
     */
    @Test
    void elseMayFollowASingleStatementWithoutSemicolon() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor Semaforo { int s = 1, espera = 0; cond pos; Cola c(int);
                  procedure P() { if (s == 0) wait(pos) else s = s-1; }
                  procedure V() { if (espera == 0) s = s+1 else { espera --; signal(pos); } }
                  procedure otros(v: in int) {
                    if (v == 0) s++ else s--;
                    if (v == 1) push(c, v) else skip;
                    if (v == 2) signal_all(pos) else if (v == 3) write(v) else delay(1);
                    if (v > 3) while (s < 0) s++ else s = 0;
                  }
                }
                process A { Semaforo.P(); if (true) Semaforo.V() else skip; Semaforo.otros(4); }
                """));
        // sin else que la siga, la sentencia sigue necesitando su ';'
        assertTrue(errorOf("process P { int x; if (x == 0) x = 1 x = 2; }").contains("Se esperaba ';'"));
        // dentro de las llaves, también
        assertTrue(errorOf("process P { int x; if (x == 0) { x = 1 } else x = 2; }")
                .contains("Se esperaba ';'"));
        // un else sin if que lo preceda no pasa a ser válido
        assertTrue(errorOf("process P { int x; x = 1 else x = 2; }").contains("Se esperaba ';'"));
    }

    /** {@code #define N 5}: una constante del programa; el compilador pone el número en su lugar. */
    @Test
    void constantsStandForNumbers() {
        assertDoesNotThrow(() -> Compiler.compile("""
                // los comentarios pueden ir antes
                #define N 3
                #DEFINE Lugares 2   // y al final de la línea
                monitor Admin { cond espera[N]; text res[N]; int buf[Lugares]; int usados = 0;
                  procedure Pedido(IdC: in int) { if (usados == N) wait(espera[IdC]); usados = usados + N; }
                }
                monitor Escritorio[id: 0..N-1] { procedure f() { skip; } }
                process Cliente[id: 0..N-1] { Admin.Pedido(id); Escritorio[id].f(); delay(N); }
                """));
        assertEquals("Línea 2: Las constantes (#define) se escriben al principio del programa, "
                        + "antes de los monitores y los procesos",
                errorOf("process P { skip; }\n#define N 5"));
        assertEquals("Línea 1: Directiva desconocida '#include': la única es #define, por ejemplo "
                + "#define N 5", errorOf("#include N\nprocess P { skip; }"));
        assertEquals("Línea 1: Después de #define va el nombre de la constante, por ejemplo "
                + "#define N 5", errorOf("#define 5 N\nprocess P { skip; }"));
        assertEquals("Línea 1: La constante 'N' necesita un valor entero sin signo, por ejemplo "
                + "#define N 5", errorOf("#define N\nprocess P { skip; }"));
        assertTrue(errorOf("#define N 2.5\nprocess P { skip; }").contains("valor entero sin signo"));
        assertTrue(errorOf("#define N -1\nprocess P { skip; }").contains("valor entero sin signo"));
        assertEquals("Línea 1: Después del valor de la constante 'N' no va nada más en la línea "
                + "(un #define no lleva ';')", errorOf("#define N 5;\nprocess P { skip; }"));
        assertEquals("Línea 2: La constante 'N' ya está definida",
                errorOf("#define N 5\n#define N 6\nprocess P { skip; }"));
        assertEquals("Línea 1: 'while' es una palabra reservada: no puede ser el nombre de una "
                + "constante", errorOf("#define while 5\nprocess P { skip; }"));
    }

    /** Una constante no es una variable: no se declara de nuevo ni se le asigna. */
    @Test
    void constantsAreNotVariables() {
        String expected = "'N' es una constante del programa (#define N 5): no se puede usar "
                + "como nombre ni cambiarle el valor";
        assertEquals("Línea 2: " + expected, errorOf("#define N 5\nprocess P { int N = 1; }"));
        assertEquals("Línea 2: " + expected, errorOf("#define N 5\nprocess P { N = 1; }"));
        assertEquals("Línea 2: " + expected, errorOf("#define N 5\nprocess P { N++; }"));
        assertEquals("Línea 2: " + expected, errorOf("#define N 5\nprocess N { skip; }"));
        assertEquals("Línea 2: " + expected,
                errorOf("#define N 5\nmonitor M { cond N; procedure f() { skip; } } process P { M.f(); }"));
        // los nombres distinguen mayúsculas: n no es N
        assertDoesNotThrow(() -> Compiler.compile("#define N 5\nprocess P { int n = N; n = n + 1; }"));
        // los mensajes nombran la constante como se escribió, no su valor
        assertTrue(errorOf("#define N 5\nprocess P { int x; x = 1 N; }").contains("se encontró 'N'"));
    }

    /** El wait con prioridad de la teoría no se usa en la práctica: el mensaje lo dice. */
    @Test
    void waitWithPriorityIsNotAllowed() {
        assertEquals("Línea 2: En la práctica no se permite el wait con prioridad "
                        + "(wait(cv, rank)): se escribe wait(turno)",
                errorOf("monitor S { bool libre = true; cond turno;\n"
                        + "procedure request(int tiempo) { if (libre) libre = false; else wait(turno, tiempo); } }\n"
                        + "process A { S.request(3); }"));
        assertTrue(errorOf("monitor S { cond scan[2];\n"
                + "procedure pedir(int cil) { wait(scan[0], cil); } }\nprocess A { S.pedir(3); }")
                .contains("wait con prioridad"));
    }

    /** {@code asc} y {@code desc} eligen el orden de una ColaOrdenada al declararla. */
    @Test
    void sortedQueueOrderIsChosenInItsDeclaration() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor Cajero { ColaOrdenada fila(int, int) desc; ColaOrdenada espera(int) ASC;
                  colaOrdenada a(text) Desc, b(int, (int, text)) asc, c(double);
                  procedure Pasar(idP, edad: in int) { push(fila, edad, idP); push(espera, idP); } }
                process P { ColaOrdenada local(int) desc; Cajero.Pasar(1, 70); }
                """));
        assertEquals("Línea 1: 'desc' indica el orden de una ColaOrdenada; 'c' es una Cola, que no "
                + "ordena: sale primero lo que se encoló primero",
                errorOf("process P { Cola c(int) desc; }"));
        // asc y desc son palabras reservadas
        errorOf("process P { int desc = 0; }");
        errorOf("process P { int Asc = 0; }");
    }
}
