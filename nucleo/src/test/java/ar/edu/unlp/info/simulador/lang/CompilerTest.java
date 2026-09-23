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
}
