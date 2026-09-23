package ar.edu.unlp.info.simulador.lang;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CompilerTest {

    @Test
    void compilaElContadorDeLaTeoria() {
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
    void compilaBufferConVariablesCondicion() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor Buffer {
                    int dato = 0;
                    boolean hayDato = false;
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
    void rechazaVariablesGlobales() {
        CompilationException ex = assertThrows(CompilationException.class, () -> Compiler.compile("""
                int N = 5;
                monitor M { procedure op() { skip; } }
                process P { M.op(); }
                """));
        assertTrue(ex.getMessage().toLowerCase().contains("global"), ex.getMessage());
    }

    @Test
    void rechazaParametroInout() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { procedure op(a: inout int) { a = 1; } }
                process P { int x = 0; M.op(x); }
                """));
    }

    @Test
    void aceptaColaOrdenada() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M {
                  ColaOrdenada c;
                  procedure guardar(prio: in int, dato: in int) { push(c, prio, dato); }
                  procedure sacar(p: out int, d: out int) { pop(c, p, d); }
                }
                process P { int a = 0; int b = 0; M.guardar(2, 20); M.sacar(a, b); }
                """));
    }

    /** La aridad de una cola queda fijada por su primer uso, y se verifica al compilar. */
    @Test
    void rechazaAridadInconsistenteEnUnaCola() {
        CompilationException ex = assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M {
                  ColaOrdenada c;
                  procedure guardar(x: in int) { push(c, x, 1); }
                  procedure sacar(r: out int) { pop(c, r); }
                }
                process P { int a = 0; M.guardar(1); M.sacar(a); }
                """));
        assertTrue(ex.getMessage().contains("componente"), ex.getMessage());
    }

    @Test
    void rechazaMonitorInexistente() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                process P { NoExiste.op(); }
                """));
    }

    @Test
    void rechazaWaitFueraDeProcedure() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { cond c; procedure op() { signal(c); } }
                process P { wait(c); }
                """));
    }

    @Test
    void rechazaAridadIncorrecta() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { procedure op(a: in int) { a = a; } }
                process P { M.op(1, 2); }
                """));
    }

    @Test
    void rechazaOutConArgumentoNoAsignable() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { procedure op(r: out int) { r = 1; } }
                process P { M.op(1 + 2); }
                """));
    }

    /** Los semaforos no existen: 'sem', 'await', 'p' y 'v' son identificadores comunes. */
    @Test
    void semaforosNoSonPalabrasReservadas() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M {
                  int sem = 0;
                  procedure op(await: in int) { sem = await; }
                }
                process P { int p = 1; int v = 2; M.op(p); M.op(v); }
                """));
    }

    @Test
    void aceptaLasTresFormasDelFor() {
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
    void rechazaProgramaSinProcesos() {
        assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { int x = 0; }
                """));
    }

    @Test
    void aceptaVariasVariablesEnUnaDeclaracion() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M {
                  int a, b = 1, v[3] = ([3] 0), w[2];
                  Cola c1, c2;
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
    void rechazaComaSinNombreEnLaDeclaracion() {
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
    void rechazaVariablePermanenteRepetidaEnLaLista() {
        CompilationException ex = assertThrows(CompilationException.class, () -> Compiler.compile("""
                monitor M { int a, a; procedure op() { skip; } }
                process P { M.op(); }
                """));
        assertTrue(ex.getMessage().contains("duplicada"), ex.getMessage());
    }

    @Test
    void aceptaColaOrdenadaLocal() {
        assertDoesNotThrow(() -> Compiler.compile("""
                monitor M { procedure op() { skip; } }
                process P { ColaOrdenada pendientes; push(pendientes, 1); M.op(); }
                """));
    }

    /** La gramatica define digitos ASCII; un digito arabe da el mismo error en JVM y navegador. */
    @Test
    void digitosNoAsciiNoSonNumeros() {
        CompilationException ex = assertThrows(CompilationException.class,
                () -> Compiler.compile("process P { int x = \u0663; }"));
        assertTrue(ex.getMessage().contains("inesperado"), ex.getMessage());
    }

    @Test
    void anidamientoExcesivoEsErrorDeCompilacion() {
        String hondo = "(".repeat(150) + "1" + ")".repeat(150);
        CompilationException ex = assertThrows(CompilationException.class,
                () -> Compiler.compile("process P { int x = " + hondo + "; }"));
        assertTrue(ex.getMessage().contains("anidamiento"), ex.getMessage());

        String bloques = "{".repeat(150) + "skip;" + "}".repeat(150);
        assertThrows(CompilationException.class,
                () -> Compiler.compile("process P { " + bloques + " }"));

        String razonable = "(".repeat(40) + "1" + ")".repeat(40);
        assertDoesNotThrow(() -> Compiler.compile("process P { int x = " + razonable + "; }"));
    }

    /** 1 + 1 + ... no anida parentesis pero arma un arbol igual de hondo. */
    @Test
    void expresionDemasiadoLargaEsErrorDeCompilacion() {
        String suma = "1" + " + 1".repeat(300);
        CompilationException ex = assertThrows(CompilationException.class,
                () -> Compiler.compile("process P { int x = " + suma + "; }"));
        assertTrue(ex.getMessage().contains("demasiado larga"), ex.getMessage());
        assertEquals(1, ex.getLine());
    }

    @Test
    void literalDecimalInfinitoEsErrorDeCompilacion() {
        CompilationException ex = assertThrows(CompilationException.class,
                () -> Compiler.compile("process P { double d = 1" + "0".repeat(400) + ".0; }"));
        assertTrue(ex.getMessage().contains("fuera de rango"), ex.getMessage());
    }

    private static String errorDe(String programa) {
        return assertThrows(CompilationException.class, () -> Compiler.compile(programa)).getMessage();
    }

    /** D-1: los errores de tipos se informan al compilar. */
    @Test
    void chequeaTiposAlCompilar() {
        assertTrue(errorDe("process P { int x = 1; if (x) skip; }").contains("tiene que ser boolean"));
        assertTrue(errorDe("process P { int x = \"a\" * 2; }").contains("se aplica a números"));
        assertTrue(errorDe("process P { int x = \"hola\"; }").contains("No se puede guardar un text"));
        assertTrue(errorDe("process P { int x = 2.9; }").contains("No se puede guardar un double"));
        assertTrue(errorDe("process P { boolean b = \"10\" == 10; }").contains("No se puede comparar"));
        assertTrue(errorDe("process P { int x = true; }").contains("No se puede guardar un boolean"));
        assertTrue(errorDe("process P { text t = true; }").contains("No se puede guardar un boolean"));
        assertTrue(errorDe("process P { int a[2]; a[1.5] = 1; }").contains("tiene que ser int"));
        assertTrue(errorDe("""
                monitor M { procedure f(x: in int) { skip; } }
                process P { M.f(2.5); }
                """).contains("No se puede guardar un double"));
        assertTrue(errorDe("""
                monitor M { procedure f(r: out text) { r = "a"; } }
                process P { int n; M.f(n); }
                """).contains("no se puede guardar en 'n'"));
        // conversiones permitidas: int a double, numero a text, + con text concatena
        assertDoesNotThrow(() -> Compiler.compile("""
                process P { double d = 3; text t = 5; text u = 2.5; text v = "x" + 1 + true;
                            boolean b = 1 < 2.5 and "a" < "b"; }
                """));
    }

    /** VI-6: un nombre no puede tapar a otro que ya se ve (la VM guarda las locales juntas). */
    @Test
    void noSePermiteTaparNombres() {
        assertTrue(errorDe("process P[i: 0..1] { for (int i = 0..5) { skip; } }")
                .contains("el iterador de la familia"));
        assertTrue(errorDe("""
                monitor M { int cant = 0; procedure f() { if (true) { int cant = 5; } } }
                process P { M.f(); }
                """).contains("una variable permanente llamada 'cant'"));
        assertTrue(errorDe("""
                monitor M { int x = 0; procedure f(x: in int) { skip; } }
                process P { M.f(1); }
                """).contains("una variable permanente"));
        assertTrue(errorDe("""
                monitor M { procedure f(x: in int) { int x = 1; } }
                process P { M.f(1); }
                """).contains("un parámetro"));
        assertTrue(errorDe("process P { int x = 1; int x = 2; }").contains("Ya existe"));
        assertTrue(errorDe("""
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
    void iteradorDelForNoSeModificaEnElCuerpo() {
        assertTrue(errorDe("process P { for (int i = 1..3) { i = 5; } }").contains("iterador 'i'"));
        assertTrue(errorDe("process P { int i; for (i = 0; i < 3; i++) { i++; } }").contains("iterador 'i'"));
        assertTrue(errorDe("process P { for (double d = 1..3) { skip; } }").contains("tiene que ser int"));
        assertDoesNotThrow(() -> Compiler.compile("process P { int i; for (i = 0; i < 3; i++) { skip; } i = 7; }"));
    }

    /** VI-5: un arreglo o una cola no se asignan, pasan ni encolan enteros. */
    @Test
    void arregloOColaCompletosNoSeUsanComoValor() {
        assertTrue(errorDe("process P { int a[2]; a = 5; }").contains("completo"));
        assertTrue(errorDe("process P { int a[2]; int b[2]; a = b; }").contains("completo"));
        assertTrue(errorDe("process P { int a[2]; int x = a; }").contains("falta el índice"));
        assertTrue(errorDe("process P { Cola c; Cola d; push(c, d); }").contains("es una cola"));
        assertTrue(errorDe("process P { int x; x[0] = 1; }").contains("no es un arreglo"));
        assertTrue(errorDe("""
                monitor M { procedure dar(r: out int) { r = 3; } }
                process P { Cola c; M.dar(c); }
                """).contains("es una cola"));
        assertTrue(errorDe("""
                monitor M { procedure dar(r: out int) { r = 3; } }
                process P { int a[2]; M.dar(a); }
                """).contains("falta el índice"));
        assertTrue(errorDe("""
                monitor M { procedure ver(x: in int) { skip; } }
                process P { int a[2]; M.ver(a); }
                """).contains("falta el índice"));
        assertDoesNotThrow(() -> Compiler.compile("process P { int a[2]; Cola c; write(a, c); }"));
    }

    /** D-4: un procedure no puede llamar a su propio monitor. */
    @Test
    void llamarAlMismoMonitorDesdeAdentroEsError() {
        assertTrue(errorDe("""
                monitor A { procedure f() { A.g(); } procedure g() { skip; } }
                process P { A.f(); }
                """).contains("ya está dentro del monitor"));
    }

    /** VS-4: empty solo sobre colas, con o sin parentesis. */
    @Test
    void emptySoloSobreColasYConParentesisOpcionales() {
        assertTrue(errorDe("process P { int a[2]; boolean b = empty a; }").contains("no es una cola"));
        assertDoesNotThrow(() -> Compiler.compile(
                "process P { Cola c; boolean b = empty c; boolean d = empty(c) and not empty(c); }"));
    }

    /** VS-8: la comparacion encadenada se rechaza con un mensaje que la explica. */
    @Test
    void comparacionEncadenadaExplicaElError() {
        assertTrue(errorDe("process P { boolean b = 1 < 2 < 3; }").contains("no se encadenan"));
    }
}
