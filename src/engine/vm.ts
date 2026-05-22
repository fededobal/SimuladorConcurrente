import type { Program, Statement, Declaration, ProcessDef, QuantDef } from './parser';

export const THREAD_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export interface ThreadIdentity {
  id: number;
  name: string;
  color: string;
}

export interface VariableSnapshot {
  value: unknown;
  previousValue: unknown;
  lastModifiedBy?: ThreadIdentity;
}

export interface SemaphoreSnapshot {
  name: string;
  value: number;
  blockedQueue: ThreadIdentity[];
  lastModifiedBy?: ThreadIdentity;
}

export interface Thread extends ThreadIdentity {
  state: 'READY' | 'RUNNING' | 'BLOCKED' | 'TERMINATED';
  instructionStack: Statement[];
  localEnv: Record<string, unknown>;
  onTerminate?: () => void;
}

export interface VMState {
  variables: Record<string, VariableSnapshot>;
  semaphores: Record<string, SemaphoreSnapshot>;
  threads: Thread[];
}

export interface LogEntry {
  id: string;
  type: string;
  thread: number;
  threadColor?: string;
  resource: string;
  message: string;
  time: string;
  snapshot: VMState;
}

function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export type VmPhase = 'CONTEXT_SWITCH' | 'INTENT' | 'EXECUTION';

export class VirtualMachine {
  public threads: Thread[] = [];
  public variables: Record<string, VariableSnapshot> = {};
  public semaphores: Record<string, SemaphoreSnapshot> = {};
  public logs: LogEntry[] = [];
  public onStateChange?: (state: VMState, logs: LogEntry[]) => void;
  public currentPhase: VmPhase = 'CONTEXT_SWITCH';
  public activeThreadId: number | null = null;
  
  private threadCounter = 1;
  private program: Program;

  constructor(program: Program) {
    this.program = program;
    this.initialize();
  }

  private deepCloneState(): VMState {
    return JSON.parse(JSON.stringify({
      variables: this.variables,
      semaphores: this.semaphores,
      threads: this.threads.map(t => ({
        id: t.id, name: t.name, color: t.color, state: t.state,
        activeLine: t.instructionStack.length > 0 ? (t.instructionStack[0] as any).line : undefined,
        localEnv: Object.fromEntries(Object.entries(t.localEnv).filter(([k]) => !k.startsWith('__')))
      }))
    })) as VMState;
  }

  private evaluateExpr(expr: string, thread: Thread | null): unknown {
    if (!expr || expr.trim() === '') return 0;
    try {
      let e = expr;
      e = e.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\b/g, '!');
      e = e.replace(/<>/g, '!=');
      
      // Parse empty buffer -> buffer.length === 0
      e = e.replace(/\bempty\s+([a-zA-Z_]\w*)\b/g, '($1.length === 0)');

      // Local vars first (more specific, shadows globals)
      if (thread) {
        for (const key of Object.keys(thread.localEnv)) {
          if (key.startsWith('__')) continue;
          const rx = new RegExp('\\b' + key + '\\b', 'g');
          const val = thread.localEnv[key];
          e = e.replace(rx, Array.isArray(val) ? JSON.stringify(val) : (typeof val === 'string' ? '"' + val + '"' : String(val)));
        }
      }
      // Global vars
      for (const key of Object.keys(this.variables)) {
        const rx = new RegExp('\\b' + key + '\\b', 'g');
        const val = this.variables[key].value;
        e = e.replace(rx, Array.isArray(val) ? JSON.stringify(val) : (typeof val === 'string' ? '"' + val + '"' : String(val)));
      }
      // Semaphore values (for await conditions)
      for (const key of Object.keys(this.semaphores)) {
        const rx = new RegExp('\\b' + key + '\\b', 'g');
        e = e.replace(rx, String(this.semaphores[key].value));
      }
      // eslint-disable-next-line no-new-func
      return new Function('return (' + e + ')')();
    } catch {
      return 0;
    }
  }

  private isLocalVar(name: string, thread: Thread): boolean {
    return name in thread.localEnv && !name.startsWith('__');
  }

  private validateAST() {
    const declaredGlobals = new Set<string>([
      ...Object.keys(this.variables),
      ...Object.keys(this.semaphores).map(s => s.split('[')[0])
    ]);

    const checkExpr = (expr: string, locals: Set<string>, location: string) => {
      if (!expr) return;
      const words = expr.match(/[a-zA-Z_]\w*/g) || [];
      for (const w of words) {
        if (/^(true|false|and|or|not|empty|length)$/.test(w)) continue;
        if (!isNaN(Number(w))) continue;
        if (!declaredGlobals.has(w) && !locals.has(w)) {
          throw new Error(`Variable no declarada '${w}' en ${location}`);
        }
      }
    };

    const checkTarget = (target: string, locals: Set<string>, location: string) => {
      if (!declaredGlobals.has(target) && !locals.has(target)) {
        throw new Error(`Variable no declarada '${target}' en ${location}`);
      }
    };

    const checkSem = (target: string, location: string) => {
      if (!declaredGlobals.has(target)) {
        throw new Error(`Semáforo no declarado '${target}' en ${location}`);
      }
    };

    const traverse = (stmt: Statement, locals: Set<string>, processName: string) => {
      switch (stmt.type) {
        case 'Assign':
          checkTarget(stmt.target, locals, `asignación en proceso ${processName}`);
          checkExpr(stmt.exprString, locals, `expresión en proceso ${processName}`);
          break;
        case 'ArrayAssign':
          checkTarget(stmt.target, locals, `asignación de arreglo en proceso ${processName}`);
          checkExpr(stmt.indexExpr, locals, `índice en proceso ${processName}`);
          checkExpr(stmt.exprString, locals, `expresión en proceso ${processName}`);
          break;
        case 'IncDec':
          checkTarget(stmt.target, locals, `operación ${stmt.op} en proceso ${processName}`);
          if (stmt.idxExpr) checkExpr(stmt.idxExpr, locals, `índice en proceso ${processName}`);
          break;
        case 'PVOp':
          checkSem(stmt.target, `operación ${stmt.operation} en proceso ${processName}`);
          if (stmt.arrayIdx) checkExpr(stmt.arrayIdx, locals, `índice de semáforo en proceso ${processName}`);
          break;
        case 'QueuePush':
          checkTarget(stmt.target, locals, `push en proceso ${processName}`);
          checkExpr(stmt.elementExpr, locals, `elemento push en proceso ${processName}`);
          break;
        case 'QueuePop':
          checkTarget(stmt.target, locals, `pop en proceso ${processName}`);
          checkTarget(stmt.assignVar, locals, `variable destino de pop en proceso ${processName}`);
          break;
        case 'If':
          checkExpr(stmt.condition, locals, `condición if en proceso ${processName}`);
          traverse(stmt.consequent, locals, processName);
          if (stmt.alternate) traverse(stmt.alternate, locals, processName);
          break;
        case 'While':
          checkExpr(stmt.condition, locals, `condición while en proceso ${processName}`);
          traverse(stmt.body, locals, processName);
          break;
        case 'For': {
          const newLocals = new Set(locals);
          if (stmt.init) {
            if (stmt.init.type === 'LocalDecl') {
              newLocals.add(stmt.init.name);
              checkExpr(stmt.init.initValue, newLocals, `inicialización for en proceso ${processName}`);
            } else {
              traverse(stmt.init, newLocals, processName);
            }
          }
          if (stmt.cond) checkExpr(stmt.cond, newLocals, `condición for en proceso ${processName}`);
          if (stmt.step) traverse(stmt.step, newLocals, processName);
          traverse(stmt.body, newLocals, processName);
          break;
        }
        case 'Block':
        case 'Atomic':
        case 'Await': {
          if (stmt.type === 'Await') checkExpr((stmt as any).condition, locals, `condición await en proceso ${processName}`);
          const blockLocals = new Set(locals);
          const stmts = (stmt as any).statements || (stmt as any).body.statements;
          for (const s of stmts) {
            if (s.type === 'LocalDecl') {
              blockLocals.add(s.name);
              checkExpr(s.initValue, blockLocals, `declaración local en proceso ${processName}`);
            } else {
              traverse(s, blockLocals, processName);
            }
          }
          break;
        }
      }
    };

    for (const node of this.program.body) {
      if (node.type === 'ProcessDef') {
        const proc = node as ProcessDef;
        const locals = new Set<string>();
        if (proc.quantDef) {
          locals.add(proc.quantDef.id);
          checkExpr(proc.quantDef.from, locals, `rango de proceso ${proc.name}`);
          checkExpr(proc.quantDef.to, locals, `rango de proceso ${proc.name}`);
        }
        traverse(proc.body, locals, proc.name);
      }
    }
  }

  private initialize() {
    let colorIdx = 0;

    // Pass 1: declarations
    for (const node of this.program.body) {
      if (node.type !== 'Declaration') continue;
      const decl = node as Declaration;
      
      if (decl.varType === 'sem') {
        if (decl.isArray) {
          const size = Number(this.evaluateExpr(decl.sizeExpr || '0', null));
          const iv = decl.initValue !== '' ? Number(this.evaluateExpr(decl.initValue, null)) : 1;
          for (let i = 0; i < size; i++) {
             this.semaphores[`${decl.name}[${i}]`] = { name: `${decl.name}[${i}]`, value: iv, blockedQueue: [] };
          }
        } else {
          const iv = decl.initValue !== '' ? Number(this.evaluateExpr(decl.initValue, null)) : 1;
          this.semaphores[decl.name] = { name: decl.name, value: iv, blockedQueue: [] };
        }
      } else {
        let initVal: unknown;
        if (decl.varType === 'Cola') {
          initVal = [];
        } else if (decl.isArray) {
          const size = Number(this.evaluateExpr(decl.sizeExpr || '0', null));
          const fillValRaw = decl.initValue;
          let fillVal: unknown = 0;
          if (decl.varType === 'boolean') fillVal = false;
          if (decl.varType === 'text') fillVal = "";
          
          if (fillValRaw !== '') {
            if (fillValRaw === 'true') fillVal = true;
            else if (fillValRaw === 'false') fillVal = false;
            else if (!isNaN(Number(fillValRaw))) fillVal = Number(fillValRaw);
            else fillVal = this.evaluateExpr(fillValRaw, null);
          }
          initVal = new Array(Math.max(0, size)).fill(fillVal);
        } else {
          const raw = decl.initValue;
          if (raw === 'true') initVal = true;
          else if (raw === 'false') initVal = false;
          else if (raw !== '' && !isNaN(Number(raw))) initVal = Number(raw);
          else if (raw !== '') initVal = this.evaluateExpr(raw, null);
          else initVal = decl.varType === 'boolean' ? false : (decl.varType === 'text' ? "" : 0);
        }
        this.variables[decl.name] = { value: initVal, previousValue: initVal };
      }
    }

    // Pass 2: processes
    for (const node of this.program.body) {
      if (node.type !== 'ProcessDef') continue;
      const proc = node as ProcessDef;
      if (proc.quantDef) {
        const qd = proc.quantDef as QuantDef;
        const from = Number(this.evaluateExpr(qd.from, null));
        const to = Number(this.evaluateExpr(qd.to, null));
        for (let i = from; i <= to; i++) {
          this.threads.push({
            id: this.threadCounter++,
            name: proc.name + '[' + i + ']',
            color: THREAD_COLORS[colorIdx++ % THREAD_COLORS.length],
            state: 'READY',
            instructionStack: JSON.parse(JSON.stringify(proc.body.statements)) as Statement[],
            localEnv: { [qd.id]: i }
          });
        }
      } else {
        this.threads.push({
          id: this.threadCounter++,
          name: proc.name,
          color: THREAD_COLORS[colorIdx++ % THREAD_COLORS.length],
          state: 'READY',
          instructionStack: JSON.parse(JSON.stringify(proc.body.statements)) as Statement[],
          localEnv: {}
        });
      }
    }

    this.validateAST();

    this.addLog(0, undefined, 'SISTEMA', 'Simulacion inicializada. ' + this.threads.length + ' proceso(s).');
    this.emitState();
  }

  private addLog(threadId: number, threadColor: string | undefined, resource: string, message: string) {
    this.logs.push({
      id: genId(),
      type: 'EVENT',
      thread: threadId,
      threadColor,
      resource,
      message,
      time: new Date().toLocaleTimeString(),
      snapshot: this.deepCloneState()
    });
  }

  private emitState() {
    if (this.onStateChange) this.onStateChange(this.deepCloneState(), [...this.logs]);
  }

  public isFinished(): boolean {
    return this.threads.length > 0 && this.threads.every(t => t.state === 'TERMINATED');
  }

  public step() {
    if (this.isFinished()) return;

    if (this.currentPhase === 'CONTEXT_SWITCH') {
      this.performContextSwitch();
    } else if (this.currentPhase === 'INTENT') {
      this.performIntent();
    } else if (this.currentPhase === 'EXECUTION') {
      this.performExecution();
    }
    
    this.emitState();
  }

  private performContextSwitch() {
    // Si hay un hilo RUNNING, lo volvemos READY para ceder la CPU (time-slicing / preemption)
    if (this.activeThreadId !== null) {
      const active = this.threads.find(t => t.id === this.activeThreadId);
      if (active && active.state === 'RUNNING') {
        active.state = 'READY';
      }
    }

    const ready = this.threads.filter(t => t.state === 'READY');
    if (ready.length === 0) {
      if (!this.isFinished()) {
        this.addLog(0, undefined, 'DEADLOCK', 'Todos los hilos bloqueados (Deadlock).');
      }
      return;
    }

    const thread = ready[Math.floor(Math.random() * ready.length)];
    this.activeThreadId = thread.id;
    thread.state = 'RUNNING';
    this.currentPhase = 'INTENT';
    
    this.addLog(thread.id, thread.color, 'SCHEDULER', `[Scheduler] Cambio de contexto. CPU asignada al ${thread.name}.`);
  }

  private performIntent() {
    const thread = this.threads.find(t => t.id === this.activeThreadId);
    if (!thread || thread.state !== 'RUNNING') {
      this.currentPhase = 'CONTEXT_SWITCH';
      return this.step(); 
    }

    if (thread.instructionStack.length === 0) {
      thread.state = 'TERMINATED';
      this.addLog(thread.id, thread.color, thread.name, thread.name + ': proceso terminado.');
      if (thread.onTerminate) thread.onTerminate();
      this.currentPhase = 'CONTEXT_SWITCH';
      return this.step(); 
    }

    const stmt = thread.instructionStack[0]; 

    if (this.isCriticalStatement(stmt, thread)) {
      this.logIntent(stmt, thread);
      this.currentPhase = 'EXECUTION';
    } else {
      this.currentPhase = 'EXECUTION';
      this.performExecution();
    }
  }

  private performExecution() {
    const thread = this.threads.find(t => t.id === this.activeThreadId);
    if (!thread || thread.state !== 'RUNNING') {
      this.currentPhase = 'CONTEXT_SWITCH';
      return;
    }

    const stmt = thread.instructionStack.shift()!;
    this.executeStatement(stmt, thread, false);

    if (thread.state === 'RUNNING') {
      thread.state = 'READY';
      this.currentPhase = 'CONTEXT_SWITCH';
      this.activeThreadId = null;
    } else {
      this.currentPhase = 'CONTEXT_SWITCH';
      this.activeThreadId = null;
    }
  }

  private isCriticalStatement(stmt: Statement, thread: Thread): boolean {
    switch (stmt.type) {
      case 'PVOp':
      case 'QueuePush':
      case 'QueuePop':
        return true;
      case 'Assign':
      case 'ArrayAssign':
      case 'IncDec':
        return !this.isLocalVar(stmt.target, thread);
      default:
        return false;
    }
  }

  private logIntent(stmt: Statement, thread: Thread) {
    const prefix = '➤ [Intento] ';
    switch (stmt.type) {
      case 'PVOp': {
        let targetName = stmt.target;
        if ((stmt as any).arrayIdx !== undefined) targetName = `${stmt.target}[${this.evaluateExpr((stmt as any).arrayIdx, thread)}]`;
        this.addLog(thread.id, thread.color, stmt.target, prefix + `${thread.name} se prepara para ejecutar ${stmt.type === 'PVOp' ? (stmt as any).operation : ''}(${targetName}).`);
        break;
      }
      case 'QueuePush':
        this.addLog(thread.id, thread.color, (stmt as any).target, prefix + `${thread.name} se prepara para intentar push en la cola '${(stmt as any).target}'.`);
        break;
      case 'QueuePop':
        this.addLog(thread.id, thread.color, (stmt as any).target, prefix + `${thread.name} se prepara para extraer elemento de la cola '${(stmt as any).target}'.`);
        break;
      case 'Assign':
      case 'ArrayAssign':
      case 'IncDec':
        this.addLog(thread.id, thread.color, (stmt as any).target, prefix + `${thread.name} intentará modificar la variable compartida '${(stmt as any).target}'.`);
        break;
    }
  }

  private executeStatement(stmt: Statement, thread: Thread, isAtomic: boolean): void {
    switch (stmt.type) {
      case 'Skip': break;

      case 'LocalDecl': {
        let initVal: unknown;
        const raw = stmt.initValue;
        if (raw === 'true') initVal = true;
        else if (raw === 'false') initVal = false;
        else if (raw !== '' && !isNaN(Number(raw))) initVal = Number(raw);
        else if (raw !== '') initVal = this.evaluateExpr(raw, thread);
        else initVal = stmt.varType === 'boolean' ? false : (stmt.varType === 'text' ? "" : 0);
        thread.localEnv[stmt.name] = initVal;
        if (!isAtomic) this.addLog(thread.id, thread.color, stmt.name, thread.name + ': local ' + stmt.varType + ' ' + stmt.name + ' = ' + String(initVal));
        break;
      }

      case 'Assign': {
        const val = this.evaluateExpr(stmt.exprString, thread);
        if (this.isLocalVar(stmt.target, thread)) {
          thread.localEnv[stmt.target] = val;
          if (!isAtomic) this.addLog(thread.id, thread.color, stmt.target, thread.name + ': ' + stmt.target + ' = ' + String(val) + ' (local)');
        } else {
          if (!(stmt.target in this.variables)) {
            this.addLog(thread.id, thread.color, 'ERROR', `Variable no declarada: ${stmt.target}`);
            thread.state = 'TERMINATED';
            break;
          }
          const prev = this.variables[stmt.target].value;
          this.variables[stmt.target] = { value: val, previousValue: prev, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
          if (!isAtomic) this.addLog(thread.id, thread.color, stmt.target, thread.name + ': ' + stmt.target + ' = ' + String(val));
        }
        break;
      }

      case 'ArrayAssign': {
        const idx = Number(this.evaluateExpr(stmt.indexExpr, thread));
        const val = this.evaluateExpr(stmt.exprString, thread);
        if (!(stmt.target in this.variables)) break;
        const arr = Array.isArray(this.variables[stmt.target].value)
          ? [...(this.variables[stmt.target].value as unknown[])]
          : [];
        const prevArr = [...arr];
        arr[idx] = val;
        this.variables[stmt.target] = { value: arr, previousValue: prevArr, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
        if (!isAtomic) this.addLog(thread.id, thread.color, stmt.target, thread.name + ': ' + stmt.target + '[' + idx + '] = ' + String(val));
        break;
      }

      case 'IncDec': {
        if (this.isLocalVar(stmt.target, thread)) {
          const cur = Number(thread.localEnv[stmt.target]);
          const nv = stmt.op === '++' ? cur + 1 : cur - 1;
          thread.localEnv[stmt.target] = nv;
          if (!isAtomic) this.addLog(thread.id, thread.color, stmt.target, thread.name + ': ' + stmt.target + stmt.op + ' => ' + nv + ' (local)');
        } else {
          if (!(stmt.target in this.variables)) break;
          const cur = Number(this.variables[stmt.target].value);
          const nv = stmt.op === '++' ? cur + 1 : cur - 1;
          this.variables[stmt.target] = { value: nv, previousValue: cur, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
          if (!isAtomic) this.addLog(thread.id, thread.color, stmt.target, thread.name + ': ' + stmt.target + stmt.op + ' => ' + nv);
        }
        break;
      }

      case 'QueuePush': {
        if (!(stmt.target in this.variables)) {
          this.addLog(thread.id, thread.color, 'ERROR', thread.name + ': operacion push en variable no declarada o no es Cola');
          break;
        }
        const val = this.evaluateExpr(stmt.elementExpr, thread);
        const arr = [...(this.variables[stmt.target].value as unknown[])];
        const prevArr = [...arr];
        arr.push(val);
        this.variables[stmt.target] = { value: arr, previousValue: prevArr, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
        if (!isAtomic) this.addLog(thread.id, thread.color, stmt.target, thread.name + ': push(' + stmt.target + ', ' + String(val) + ')');
        break;
      }

      case 'QueuePop': {
        if (!(stmt.target in this.variables)) {
          this.addLog(thread.id, thread.color, 'ERROR', thread.name + ': operacion pop en variable no declarada o no es Cola');
          break;
        }
        const arr = [...(this.variables[stmt.target].value as unknown[])];
        if (arr.length === 0) {
           this.addLog(thread.id, thread.color, 'ERROR', thread.name + ': pop en cola vacia (' + stmt.target + ') abortando hilo.');
           thread.state = 'TERMINATED';
           break;
        }
        const prevArr = [...arr];
        const val = arr.shift();
        this.variables[stmt.target] = { value: arr, previousValue: prevArr, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
        
        if (this.isLocalVar(stmt.assignVar, thread)) {
           thread.localEnv[stmt.assignVar] = val;
           if (!isAtomic) this.addLog(thread.id, thread.color, stmt.target, thread.name + ': pop(' + stmt.target + ') => local ' + stmt.assignVar + '=' + String(val));
        } else {
           if (!(stmt.assignVar in this.variables)) {
             this.addLog(thread.id, thread.color, 'ERROR', `Variable no declarada: ${stmt.assignVar}`);
             thread.state = 'TERMINATED';
             break;
           }
           const prevVar = this.variables[stmt.assignVar].value;
           this.variables[stmt.assignVar] = { value: val, previousValue: prevVar, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
           if (!isAtomic) this.addLog(thread.id, thread.color, stmt.target, thread.name + ': pop(' + stmt.target + ') => global ' + stmt.assignVar + '=' + String(val));
        }
        break;
      }

      case 'PVOp': {
        let targetName = stmt.target;
        if (stmt.arrayIdx !== undefined) {
          const idx = Number(this.evaluateExpr(stmt.arrayIdx, thread));
          targetName = `${stmt.target}[${idx}]`;
        }
        const sem = this.semaphores[targetName];
        if (!sem) {
          this.addLog(thread.id, thread.color, 'ERROR', 'Semaforo no declarado: ' + targetName);
          break;
        }
        if (stmt.operation === 'P') {
          if (sem.value > 0) {
            sem.value--;
            sem.lastModifiedBy = { id: thread.id, name: thread.name, color: thread.color };
            this.addLog(thread.id, thread.color, sem.name, thread.name + ': P(' + sem.name + ') OK. Valor: ' + sem.value);
          } else {
            thread.state = 'BLOCKED';
            sem.blockedQueue.push({ id: thread.id, name: thread.name, color: thread.color });
            thread.instructionStack.unshift(stmt);
            this.addLog(thread.id, thread.color, sem.name, thread.name + ': P(' + sem.name + ') BLOQUEADO (valor=0)');
          }
        } else {
          sem.lastModifiedBy = { id: thread.id, name: thread.name, color: thread.color };
          if (sem.blockedQueue.length > 0) {
            const woken = sem.blockedQueue.shift()!;
            const wokenThread = this.threads.find(t => t.id === woken.id);
            if (wokenThread) {
              wokenThread.state = 'READY';
              if (wokenThread.instructionStack.length > 0) {
                const top = wokenThread.instructionStack[0];
                if (top.type === 'PVOp' && top.operation === 'P') {
                  wokenThread.instructionStack.shift();
                }
              }
            }
            this.addLog(thread.id, thread.color, sem.name, thread.name + ': V(' + sem.name + ') => despierta ' + woken.name);
          } else {
            sem.value++;
            this.addLog(thread.id, thread.color, sem.name, thread.name + ': V(' + sem.name + '). Valor: ' + sem.value);
          }
        }
        break;
      }

      case 'If': {
        if (this.evaluateExpr(stmt.condition, thread)) {
          thread.instructionStack.unshift(...stmt.consequent.statements);
        } else if (stmt.alternate) {
          thread.instructionStack.unshift(...stmt.alternate.statements);
        }
        break;
      }

      case 'While': {
        if (this.evaluateExpr(stmt.condition, thread)) {
          thread.instructionStack.unshift(stmt);
          thread.instructionStack.unshift(...stmt.body.statements);
        }
        break;
      }

      case 'For': {
        if (stmt.init) this.executeStatement(stmt.init, thread, true);
        const cond = stmt.cond || 'true';
        const bodyPlusStep: Statement[] = [...stmt.body.statements];
        if (stmt.step) bodyPlusStep.push(stmt.step as Statement);
        const syntheticWhile = { type: 'While', condition: cond, body: { type: 'Block', statements: bodyPlusStep } };
        (syntheticWhile as any).line = (stmt as any).line;
        thread.instructionStack.unshift(syntheticWhile as any);
        break;
      }

      case 'Block': {
        thread.instructionStack.unshift(...stmt.statements);
        break;
      }

      case 'Atomic': {
        this.addLog(thread.id, thread.color, 'ATOMIC', thread.name + ': bloque atomico <S>');
        for (const s of stmt.body.statements) this.executeStatement(s, thread, true);
        break;
      }

      case 'Await': {
        const condOk = this.evaluateExpr(stmt.condition, thread);
        if (condOk) {
          this.addLog(thread.id, thread.color, 'AWAIT', thread.name + ': await TRUE => ejecutando');
          for (const s of stmt.body.statements) this.executeStatement(s, thread, true);
        } else {
          thread.instructionStack.unshift(stmt);
          this.addLog(thread.id, thread.color, 'AWAIT', thread.name + ': await FALSE => reintenta');
        }
        break;
      }

      default: {
        const anyStmt = stmt as { type: string };
        this.addLog(thread.id, thread.color, 'WARN', 'Nodo sin implementar o invalido: ' + anyStmt.type);
      }
    }
  }

  // private substituteLocal(stmts: Statement[], id: string, value: number): Statement[] {
  //   const rx = new RegExp('\\b' + id + '\\b', 'g');
  //   const sub = (obj: unknown): unknown => {
  //     if (typeof obj === 'string') return obj.replace(rx, String(value));
  //     if (Array.isArray(obj)) return obj.map(sub);
  //     if (obj && typeof obj === 'object') {
  //       const out: Record<string, unknown> = {};
  //       for (const k of Object.keys(obj as object)) {
  //         out[k] = sub((obj as Record<string, unknown>)[k]);
  //       }
  //       return out;
  //     }
  //     return obj;
  //   };
  //   return sub(stmts) as Statement[];
  // }
}
