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

    // Sin rojos, amarillos ni verdes (tampoco naranja, lima o verde azulado): la interfaz
    // reserva esos colores para los estados (rojo esperando, amarillo compitiendo), y un
    // proceso de ese color se confundiria con un estado.
    private static final String[] PALETTE = {
            "#3b82f6", "#ec4899", "#06b6d4", "#a855f7",
            "#6366f1", "#d946ef", "#0ea5e9", "#8b5cf6",
            "#93c5fd", "#f0abfc", "#67e8f9", "#c4b5fd"
    };

    private ProgramLoader() { }

    /** El monitor con sus permanentes y condiciones ya inicializadas. */
    static Monitor buildMonitor(MonitorDef md) {
        Monitor m = new Monitor(md.name());
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
            ExprEvaluator ev = new ExprEvaluator(name -> null);
            long from = ev.evalLong(pd.quant().from());
            long to = ev.evalLong(pd.quant().to());
            // con cotas enormes to - from desborda: un conteo negativo tambien es "demasiados"
            long count = to < from ? 0 : to - from + 1;
            if (count < 0 || count > TOPE_PROCESOS - processes.size()) {
                throw tooManyProcesses(pd.line());
            }
            for (long k = 0; k < count; k++) {
                long i = from + k;
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
            return Value.defaultFor(vd.type());
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
