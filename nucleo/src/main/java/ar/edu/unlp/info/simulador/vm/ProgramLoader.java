package ar.edu.unlp.info.simulador.vm;

import ar.edu.unlp.info.simulador.lang.parser.ast.CondDecl;
import ar.edu.unlp.info.simulador.lang.parser.ast.Expr;
import ar.edu.unlp.info.simulador.lang.parser.ast.MonitorDef;
import ar.edu.unlp.info.simulador.lang.parser.ast.ProcessDef;
import ar.edu.unlp.info.simulador.lang.parser.ast.VarDecl;

import java.util.ArrayList;
import java.util.List;

/**
 * Crea las estructuras de ejecucion de un programa: cada monitor con sus variables y
 * condiciones, y cada proceso con su marco inicial. El codigo de inicializacion de los
 * monitores no se corre aca: lo ejecuta la maquina virtual, que sabe avanzar sentencias.
 */
final class ProgramLoader {

    /**
     * Topes de tamano. Sin ellos, {@code int a[2000000000]} o una familia de cien mil procesos
     * congelan o cierran la pestana: el motor corre en el hilo principal del navegador.
     */
    static final int TOPE_ELEMENTOS = 100_000;
    static final int TOPE_PROCESOS = 5_000;
    static final int TOPE_MONITORES = 1_000;

    // Tonos apagados entre el azul y el magenta, lo bastante oscuros para leerse como texto
    // sobre el fondo claro de la interfaz (contraste de 4,5:1 o mas contra blanco). Sin
    // rojos, amarillos ni verdes (tampoco naranja, lima o verde azulado): la interfaz
    // reserva esos colores para los estados (ladrillo esperando, ocre compitiendo, verde en
    // delay), y un proceso de ese color se confundiria con un estado.
    private static final String[] PALETTE = {
            "#4f6d9e", "#a05f92", "#2f6b78", "#7f6aa6",
            "#4a7a98", "#9a5f80", "#6672b0", "#3d7590",
            "#8a5a9e", "#5a6b8c", "#7368b2", "#86548a"
    };

    private ProgramLoader() { }

    /** Las cotas de un cuantificador {@code [i: desde..hasta]}, ya evaluadas. */
    record FamilyBounds(long from, long to) {
        /**
         * Cuantos indices abarca; 0 si {@code hasta < desde}. Con cotas enormes la resta
         * desborda y da negativa: quien la usa lo trata como "demasiados".
         */
        long count() {
            return to < from ? 0 : to - from + 1;
        }
    }

    /** Evalua las cotas (primero desde, despues hasta); son constantes, no ven variables. */
    static FamilyBounds familyBounds(ProcessDef.QuantDef quant) {
        ExprEvaluator bounds = new ExprEvaluator(name -> null);
        long from = bounds.evalLong(quant.from());
        long to = bounds.evalLong(quant.to());
        return new FamilyBounds(from, to);
    }

    /**
     * Los monitores de una definicion: uno, o uno por indice si es un arreglo de monitores
     * ({@code Escritorio[0]}, {@code Escritorio[1]}...), cada uno con su propio estado.
     */
    static List<Monitor> buildMonitors(MonitorDef md) {
        if (!md.isFamily()) {
            return List.of(buildMonitor(md, md.name(), null, 0));
        }
        FamilyBounds bounds = familyBounds(md.quant());
        long count = bounds.count();
        if (count < 0 || count > TOPE_MONITORES) {
            throw new RuntimeError("Demasiados monitores en " + md.name()
                    + ": el simulador admite hasta " + TOPE_MONITORES + " por arreglo", md.line());
        }
        List<Monitor> family = new ArrayList<>();
        for (long k = 0; k < count; k++) {
            long i = bounds.from() + k;
            family.add(buildMonitor(md, md.name() + "[" + i + "]", md.quant().iterator(), i));
        }
        return family;
    }

    /**
     * El monitor con sus permanentes y condiciones ya inicializadas. En un arreglo de
     * monitores, el indice va primero entre las permanentes: las demas pueden usarlo.
     */
    private static Monitor buildMonitor(MonitorDef md, String name, String iterator, long index) {
        Monitor m = new Monitor(name, md.name());
        if (iterator != null) m.vars().put(iterator, new Value.IntVal(index));
        ExprEvaluator ev = new ExprEvaluator(m::getVar);
        for (VarDecl vd : md.permanentVars()) {
            m.vars().put(vd.name(), initialValue(vd, ev));
        }
        for (CondDecl cd : md.conds()) {
            if (cd.isArray()) {
                int size = arraySize(ev, cd.sizeExpr(), cd.line());
                m.condArraySizes().put(cd.name(), size);
                for (int i = 0; i < size; i++) {
                    String key = cd.name() + "[" + i + "]";
                    m.conds().put(key, new ConditionVariable(key));
                }
            } else {
                m.conds().put(cd.name(), new ConditionVariable(cd.name()));
            }
        }
        return m;
    }

    /** Los procesos del programa, numerados desde 1 en orden de declaracion. */
    static List<Process> buildProcesses(List<ProcessDef> defs) {
        List<Process> processes = new ArrayList<>();
        for (ProcessDef pd : defs) {
            if (!pd.isFamily()) {
                if (processes.size() >= TOPE_PROCESOS) throw tooManyProcesses(pd.line());
                processes.add(newProcess(processes, pd.name(), pd, null, 0));
                continue;
            }
            FamilyBounds bounds = familyBounds(pd.quant());
            long count = bounds.count();
            if (count < 0 || count > TOPE_PROCESOS - processes.size()) {
                throw tooManyProcesses(pd.line());
            }
            for (long k = 0; k < count; k++) {
                long i = bounds.from() + k;
                processes.add(newProcess(processes, pd.name() + "[" + i + "]", pd,
                        pd.quant().iterator(), i));
            }
        }
        return processes;
    }

    private static Process newProcess(List<Process> existing, String name, ProcessDef pd,
                                      String iterator, long index) {
        int id = existing.size() + 1;
        Process p = new Process(id, name, PALETTE[(id - 1) % PALETTE.length]);
        Activation frame = Activation.processFrame();
        if (iterator != null) frame.locals().put(iterator, new Value.IntVal(index));
        frame.pushFront(pd.body().statements());
        p.push(frame);
        return p;
    }

    private static RuntimeError tooManyProcesses(int line) {
        return new RuntimeError("Demasiados procesos: el simulador admite hasta "
                + TOPE_PROCESOS + " en total", line);
    }

    /** Valor inicial de una variable declarada: por defecto, el inicializador o un arreglo lleno. */
    static Value initialValue(VarDecl vd, ExprEvaluator ev) {
        if (vd.type().isQueue()) {
            return Value.queueFor(vd);
        }
        int size = vd.isArray() ? arraySize(ev, vd.sizeExpr(), vd.line()) : 0;
        Value single = vd.initExpr() == null
                ? Value.defaultFor(vd.type())
                : ev.eval(vd.initExpr()).assignTo(vd.type(), vd.name(), vd.line());
        if (!vd.isArray()) {
            return single;
        }
        Value[] elems = new Value[size];
        for (int i = 0; i < size; i++) elems[i] = single;
        return new Value.ArrayVal(vd.type(), elems);
    }

    /** Tamano de un arreglo de variables o de cond: entre 0 y {@link #TOPE_ELEMENTOS}. */
    static int arraySize(ExprEvaluator ev, Expr sizeExpr, int line) {
        long size = ev.evalLong(sizeExpr);
        if (size < 0 || size > TOPE_ELEMENTOS) {
            throw new RuntimeError("Tamaño de arreglo inválido: " + size
                    + " (tiene que estar entre 0 y " + TOPE_ELEMENTOS + ")", line);
        }
        return (int) size;
    }
}
