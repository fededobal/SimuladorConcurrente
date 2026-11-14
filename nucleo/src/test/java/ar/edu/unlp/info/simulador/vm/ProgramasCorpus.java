package ar.edu.unlp.info.simulador.vm;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Programas sobre los que {@link InvariantesTest} controla las invariantes de la VM: los
 * ejemplos de ejemplos/, los canonicos del smoke y de VirtualMachineTest, y variantes con
 * mas procesos, varios monitores, arreglos de cond, signal_all, out, llamadas anidadas y
 * errores de ejecucion. Salen de la verificacion del 23/09/2026.
 */
final class ProgramasCorpus {

    private ProgramasCorpus() { }

    static final Path EJEMPLOS = Path.of("..", "ejemplos");

    /** Ejemplos de la interfaz, por nombre de archivo. */
    static Map<String, String> ejemplos() {
        Map<String, String> out = new LinkedHashMap<>();
        try (Stream<Path> s = Files.list(EJEMPLOS)) {
            for (Path p : s.filter(x -> x.toString().endsWith(".mon")).sorted().toList()) {
                out.put("ejemplo/" + p.getFileName(), Files.readString(p));
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out;
    }

    /** Canonicos (smoke + VirtualMachineTest) y variantes. */
    static Map<String, String> sinteticos() {
        Map<String, String> p = new LinkedHashMap<>();

        // ---- canonicos del smoke y de VirtualMachineTest
        p.put("canon/exclusion", """
                monitor Cuenta { int x = 0; int dentro = 0; int maxDentro = 0;
                  procedure sumar() { dentro = dentro + 1; if (dentro > maxDentro) maxDentro = dentro;
                                      x = x + 1; dentro = dentro - 1; } }
                process P[i: 0..3] { Cuenta.sumar(); }
                """);
        p.put("canon/buffer", """
                monitor Buf { int dato = 0; bool hay = false; int recibidos = 0; int suma = 0; cond p; cond c;
                  procedure enviar(d: in int) { while (hay) wait(p); dato = d; hay = true; signal(c); }
                  procedure recibir() { while (not hay) wait(c); suma = suma + dato;
                                        recibidos = recibidos + 1; hay = false; signal(p); } }
                process Prod { for (int i = 1..5) { Buf.enviar(i); } }
                process Cons { int k = 0; for (k = 1; k <= 5; k++) { Buf.recibir(); } }
                """);
        p.put("canon/signal_all", """
                monitor Gate { bool open = false; int through = 0; cond g;
                  procedure esperar() { while (not open) wait(g); through = through + 1; }
                  procedure abrir() { open = true; signal_all(g); } }
                process W[i: 0..4] { Gate.esperar(); }
                process Opener { Gate.abrir(); }
                """);
        p.put("canon/lista-decl", """
                monitor M { int a, b = 5; int recibido = 0;
                  procedure guardar(v: in int) { recibido = v; } }
                process P { text lista, comp; int x, y = 7; M.guardar(x + y); }
                """);
        p.put("canon/deadlock", """
                monitor M { cond c; procedure bloquear() { wait(c); } }
                process P { M.bloquear(); }
                """);
        p.put("canon/cola-ordenada", """
                monitor M { ColaOrdenada c(int); int primero = 0;
                  procedure cargar() { push(c, 3); push(c, 1); push(c, 2); }
                  procedure sacar() { pop(c, primero); } }
                process P { M.cargar(); M.sacar(); }
                """);
        p.put("canon/b1-error-libera", """
                monitor M { int x = 0; procedure f() { x = 10 / x; } procedure g() { x = x + 1; } }
                process A { M.f(); } process B { M.g(); }
                """);
        p.put("canon/b3-overflow", """
                monitor M { int x = 9223372036854775807; procedure f() { x = x + 1; } } process A { M.f(); }
                """);
        p.put("canon/b2-double", """
                monitor M { double d = 1.5; procedure f() { d++; } } process A { M.f(); }
                """);
        p.put("canon/b6-sin-fin", """
                monitor M { int x = 0; procedure f() { x = x + 1; } }
                process P[i: 1..4] { while (true) { M.f(); } }
                """);
        p.put("canon/out", """
                monitor TOTAL { int cant = 0;
                  procedure incrementar() { cant = cant + 1; }
                  procedure verificar(R: out int) { R = cant; } }
                process Suma { for (int i = 1..3) { TOTAL.incrementar(); } }
                process Chequeo { int leido = 0; TOTAL.verificar(leido); TOTAL.verificar(leido); }
                """);
        p.put("canon/cola-fifo", """
                monitor BufferN { Cola items(int); int suma = 0; cond noVacio;
                  procedure poner(v: in int) { push(items, v); signal(noVacio); }
                  procedure sacar() { while (empty items) wait(noVacio); int x = 0; pop(items, x); suma = suma + x; } }
                process Prod { for (int i = 1..4) { BufferN.poner(i * 10); } }
                process Cons { for (int i = 1..4) { BufferN.sacar(); } }
                """);

        // ---- variantes
        p.put("var/contador-10", """
                monitor C { int x = 0; int dentro = 0; int maxDentro = 0;
                  procedure inc() { dentro++; if (dentro > maxDentro) maxDentro = dentro; x = x + 1; dentro--; }
                  procedure ver(r: out int) { r = x; } }
                process P[i: 1..10] { int v; for (1..5) { C.inc(); } C.ver(v); write("P", i, " vio ", v); }
                """);
        p.put("var/buffer-limitado-30", """
                monitor B { int buf[3]; int ocupado = 0, libre = 0, cantidad = 0; int suma = 0; int n = 0;
                  cond notLleno, notVacio;
                  procedure depositar(d: in int) { while (cantidad == 3) wait(notLleno);
                    buf[libre] = d; libre = (libre + 1) mod 3; cantidad++; signal(notVacio); }
                  procedure retirar(r: out int) { while (cantidad == 0) wait(notVacio);
                    r = buf[ocupado]; ocupado = (ocupado + 1) mod 3; cantidad--; suma = suma + r; n++; signal(notLleno); } }
                process Prod[i: 1..15] { B.depositar(i); B.depositar(i); }
                process Cons[j: 1..15] { int x; B.retirar(x); B.retirar(x); }
                """);
        p.put("var/dos-monitores", """
                monitor A { int a = 0; procedure inc() { a = a + 1; } }
                monitor B { int b = 0; cond c; procedure inc() { b = b + 1; signal(c); }
                  procedure esperar(n: in int) { while (b < n) wait(c); } }
                process P[i: 1..6] { A.inc(); B.inc(); A.inc(); }
                process Q { B.esperar(6); A.inc(); }
                """);
        p.put("var/cond-arreglo-turnos", """
                monitor T { int turno = 0; cond c[10]; int orden[10]; int k = 0;
                  procedure pedir(id: in int) { while (turno != id) wait(c[id]); orden[k] = id; k++; }
                  procedure liberar(id: in int) { turno = turno + 1; if (turno < 10) signal(c[turno]); } }
                process P[i: 0..9] { T.pedir(i); T.liberar(i); }
                """);
        p.put("var/filosofos-5", """
                monitor Mesa { bool ocupado[5]; cond libre[5]; int comidas = 0;
                  procedure tomar(i: in int) {
                    while (ocupado[i] or ocupado[(i + 1) mod 5]) wait(libre[i]);
                    ocupado[i] = true; ocupado[(i + 1) mod 5] = true; }
                  procedure dejar(i: in int) {
                    ocupado[i] = false; ocupado[(i + 1) mod 5] = false; comidas++;
                    signal(libre[(i + 4) mod 5]); signal(libre[(i + 1) mod 5]); } }
                process F[i: 0..4] { for (1..3) { Mesa.tomar(i); skip; Mesa.dejar(i); } }
                """);
        p.put("var/lectores-escritores-30", """
                monitor RW { int nr = 0, nw = 0; int lecturas = 0, escrituras = 0; int maxW = 0;
                  cond okLeer, okEscribir;
                  procedure pedidoLeer() { while (nw > 0) wait(okLeer); nr++; }
                  procedure liberaLeer() { nr--; lecturas++; if (nr == 0) signal(okEscribir); }
                  procedure pedidoEscribir() { while (nr > 0 or nw > 0) wait(okEscribir); nw++;
                    if (nw > maxW) maxW = nw; }
                  procedure liberaEscribir() { nw--; escrituras++; signal(okEscribir); signal_all(okLeer); } }
                process L[i: 1..24] { RW.pedidoLeer(); skip; RW.liberaLeer(); }
                process E[i: 1..6] { RW.pedidoEscribir(); skip; RW.liberaEscribir(); }
                """);
        p.put("var/out-elemento-arreglo", """
                monitor M { int n = 0; procedure dar(r: out int; s: out text) { n++; r = n * 10; s = "v"; } }
                process P[i: 0..3] { int a[3]; text t[2]; for (int k = 0..2) { M.dar(a[k], t[k mod 2]); }
                  write(a[0], " ", a[1], " ", a[2], t[0], t[1]); }
                """);
        p.put("var/anidada-simple", """
                monitor B { int b = 0; procedure inc() { b = b + 1; } }
                monitor A { int a = 0; procedure f() { a = a + 1; B.inc(); a = a + 1; } }
                process P[i: 1..5] { A.f(); }
                process Q[i: 1..3] { B.inc(); }
                """);
        p.put("var/anidada-wait-en-B", """
                monitor B { bool listo = false; cond c; int pasaron = 0;
                  procedure esperar() { while (not listo) wait(c); pasaron++; }
                  procedure abrir() { listo = true; signal_all(c); } }
                monitor A { int dentro = 0; procedure f() { dentro++; B.esperar(); dentro--; } }
                process P { A.f(); }
                process Q { skip; skip; B.abrir(); }
                process R { A.f(); }
                """);
        p.put("var/anidada-lockout", """
                monitor B { bool listo = false; cond c;
                  procedure esperar() { while (not listo) wait(c); }
                  procedure abrir() { listo = true; signal(c); } }
                monitor A { procedure f() { B.esperar(); } procedure g() { B.abrir(); } }
                process P { A.f(); }
                process Q { skip; skip; A.g(); }
                """);
        p.put("var/error-con-cola-de-entrada", """
                monitor M { int x = 0; cond c;
                  procedure f() { skip; skip; x = 1 / 0; }
                  procedure g() { x = x + 1; } }
                process A { M.f(); }
                process B[i: 1..8] { M.g(); }
                """);
        p.put("var/error-anidado-libera-ambos", """
                monitor B { int b = 0; procedure f() { b = 1 / b; } procedure g() { b++; } }
                monitor A { int a = 0; procedure f() { a++; B.f(); } procedure g() { a++; } }
                process P { A.f(); }
                process Q[i: 1..4] { A.g(); B.g(); }
                """);
        p.put("var/error-y-espera-eterna", """
                monitor M { bool listo = false; cond c;
                  procedure esperar() { while (not listo) wait(c); }
                  procedure avisar() { int x = 1 / 0; listo = true; signal(c); } }
                process A { M.esperar(); }
                process B { skip; skip; M.avisar(); }
                """);
        p.put("var/init-con-for", """
                monitor M { int a[5]; int suma = 0;
                  for (int i = 0..4) { a[i] = i * i; }
                  for (int i = 0..4) { suma = suma + a[i]; }
                  procedure ver(r: out int) { r = suma; } }
                process P { int s; M.ver(s); write("suma ", s); }
                """);
        p.put("var/wait-reentra-y-signal-vacio", """
                monitor M { int turno = 0; cond c; int senales = 0;
                  procedure avanzar() { signal(c); senales++; turno++; signal_all(c); }
                  procedure esperar(t: in int) { while (turno < t) wait(c); } }
                process W[i: 1..10] { M.esperar(i mod 4); }
                process S { for (1..4) { M.avanzar(); } }
                """);
        p.put("var/write-mucho", """
                monitor M { int x = 0; procedure f() { x++; } }
                process P[i: 1..3] { for (1..300) { write("linea ", i); M.f(); } }
                """);
        p.put("var/arreglo-de-monitores", VirtualMachineTest.BANCO);
        p.put("var/llamada-cerrada-con-wait", """
                monitor B { bool listo = false; cond c;
                  procedure esperar() { while (not listo) wait(c); }
                  procedure abrir() { listo = true; signal(c); } }
                monitor A { procedure f() { B.esperar(); } procedure g() { B.abrir(); } }
                process P { A.f(); } process Q { skip; skip; A.g(); }
                """);
        return p;
    }

    static Map<String, String> todos() {
        Map<String, String> all = new LinkedHashMap<>(ejemplos());
        all.putAll(sinteticos());
        return all;
    }
}
