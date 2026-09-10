import type { Program, Statement, Declaration, ProcessDef, QuantDef } from './parser';

export const THREAD_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export interface ThreadIdentity {
  id: number;
  name: string;
  color: string;
}

export interface VariableSnapshot {
  type?: string;
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

export interface Thread {
  id: number;
  name: string;
  color: string;
  state: 'READY' | 'RUNNING' | 'BLOCKED' | 'TERMINATED';
  instructionStack: Statement[];
  localEnv: Record<string, unknown>;
  onTerminate?: () => void;
  activeLine?: number; // Line currently being executed or just executed
  pendingBlocked?: boolean; // READY thread whose next instruction would block right now (semaphore already exhausted)
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
  stepIndex: number;
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
    return {
      variables: JSON.parse(JSON.stringify(this.variables)),
      semaphores: JSON.parse(JSON.stringify(this.semaphores)),
      threads: this.threads.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        state: t.state,
        instructionStack: [], // UI doesn't need full AST copies in history
        localEnv: Object.fromEntries(Object.entries(t.localEnv).filter(([k]) => !k.startsWith('__'))),
        activeLine: t.state === 'TERMINATED'
          ? undefined
          : (t.activeLine !== undefined
            ? t.activeLine
            : (t.instructionStack.length > 0 ? (t.instructionStack[0] as any).line : undefined)),
        pendingBlocked: t.state === 'READY' ? this.wouldBlockNow(t) : false,
      }))
    };
  }

  // A READY thread whose next instruction is P(sem) on an already-exhausted semaphore
  // is guaranteed to block the instant it gets scheduled, even if it hasn't run yet
  // this tick (e.g. it "missed" its cycle). Used so the UI doesn't show it as if it
  // were freely executing/racing when the outcome is already decided.
  private wouldBlockNow(thread: Thread): boolean {
    if (thread.instructionStack.length === 0) return false;
    const stmt = thread.instructionStack[0] as any;
    if (stmt.type !== 'PVOp' || stmt.operation !== 'P') return false;
    let targetName = stmt.target;
    if (stmt.arrayIdx !== undefined) {
      const idx = Number(this.evaluateExpr(stmt.arrayIdx, thread));
      targetName = `${stmt.target}[${idx}]`;
    }
    const sem = this.semaphores[targetName];
    return !!sem && sem.value <= 0;
  }

  private evaluateExpr(expr: string, thread: Thread | null): unknown {
    if (!expr || expr.trim() === '') return 0;
    try {
      const replaceOutsideStrings = (str: string, searchRegex: RegExp, replaceValue: string) => {
        return str.split('"').map((part, index) => {
          if (index % 2 === 1) return part; // Inside string literal
          return part.replace(searchRegex, replaceValue);
        }).join('"');
      };

      let e = expr;
      e = replaceOutsideStrings(e, /\band\b/gi, '&&');
      e = replaceOutsideStrings(e, /\bor\b/gi, '||');
      e = replaceOutsideStrings(e, /\bnot\b/gi, '!');
      e = replaceOutsideStrings(e, /<>/g, '!=');

      // Parse empty buffer -> buffer.length === 0
      e = replaceOutsideStrings(e, /\bempty\s+([a-zA-Z_]\w*)\b/gi, '($1.length === 0)');

      // Local vars first (more specific, shadows globals)
      if (thread) {
        for (const key of Object.keys(thread.localEnv)) {
          if (key.startsWith('__')) continue;
          const rx = new RegExp('\\b' + key + '\\b', 'g');
          const val = thread.localEnv[key];
          e = replaceOutsideStrings(e, rx, Array.isArray(val) ? JSON.stringify(val) : (typeof val === 'string' ? '"' + val + '"' : String(val)));
        }
      }
      // Global vars
      for (const key of Object.keys(this.variables)) {
        const rx = new RegExp('\\b' + key + '\\b', 'g');
        const val = this.variables[key].value;
        e = replaceOutsideStrings(e, rx, Array.isArray(val) ? JSON.stringify(val) : (typeof val === 'string' ? '"' + val + '"' : String(val)));
      }
      // Semaphore values (for await conditions)
      for (const key of Object.keys(this.semaphores)) {
        const rx = new RegExp('\\b' + key + '\\b', 'g');
        e = replaceOutsideStrings(e, rx, String(this.semaphores[key].value));
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
      const exprWithoutStrings = expr.replace(/"[^"]*"/g, '');
      const words = exprWithoutStrings.match(/[a-zA-Z_]\w*/g) || [];
      for (const w of words) {
        if (/^(true|false|and|or|not|empty|length)$/i.test(w)) continue;
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
          checkTarget(stmt.target, locals, `cola destino de push en proceso ${processName}`);
          stmt.elementExprs.forEach(expr => checkExpr(expr, locals, `elemento push en proceso ${processName}`));
          break;
        case 'QueuePop':
          checkTarget(stmt.target, locals, `cola origen de pop en proceso ${processName}`);
          stmt.assignVars.forEach(v => checkTarget(v, locals, `variable destino de pop en proceso ${processName}`));
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
        this.variables[decl.name] = { type: decl.varType, value: initVal, previousValue: initVal };
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

    this.activeThreadId = null;
    this.emitState();
  }

  public currentStepIndex = 0;

  private addLog(threadId: number, threadColor: string | undefined, resource: string, message: string) {
    this.logs.push({
      id: genId(),
      type: 'EVENT',
      thread: threadId,
      threadColor,
      resource,
      message,
      time: new Date().toLocaleTimeString(),
      snapshot: this.deepCloneState(),
      stepIndex: this.currentStepIndex
    });
  }

  public emitState() {
    if (this.onStateChange) this.onStateChange(this.deepCloneState(), [...this.logs]);
  }

  public isFinished(): boolean {
    return this.threads.length > 0 && this.threads.every(t => t.state === 'TERMINATED');
  }

  public step() {
    this.currentStepIndex++;

    const readyThreads = this.threads.filter(t => t.state === 'READY');

    if (readyThreads.length === 0) {
      if (!this.isFinished() && !this.logs.find(l => l.resource === 'DEADLOCK')) {
        this.addLog(0, undefined, 'DEADLOCK', 'Todos los hilos bloqueados (Deadlock).');
      }
      this.emitState();
      return;
    }

    // Shuffle to simulate random lock acquisition / race conditions
    const shuffled = [...readyThreads].sort(() => Math.random() - 0.5);

    let executedAny = false;

    for (const thread of shuffled) {
      // It might have been blocked during this VERY step by another thread (e.g. semaphore)
      if (thread.state !== 'READY') continue;

      if (thread.instructionStack.length === 0) {
        thread.state = 'TERMINATED';
        // Sin este log, el instante de terminación no queda registrado en ningún
        // snapshot: la Timeline (que reconstruye el estado por instante a partir
        // de los logs) repetiría el último estado conocido (READY -> "ejecutando")
        // un tick de más antes de reflejar que el hilo ya terminó.
        this.addLog(thread.id, thread.color, 'TERMINATED', thread.name + ': proceso terminado');
        if (thread.onTerminate) thread.onTerminate();
        continue;
      }

      executedAny = true;
      this.activeThreadId = thread.id;
      thread.state = 'RUNNING';

      const stmt = thread.instructionStack.shift()!;
      thread.activeLine = (stmt as any).line;

      this.executeStatement(stmt, thread, false);

      // If it didn't block or terminate, it goes back to READY for the next global step
      if (thread.state === 'RUNNING') {
        thread.state = 'READY';
      }
      this.activeThreadId = null;
    }

    // If by random chance ALL threads missed their cycle, force at least one to execute
    // so the simulator doesn't hang without advancing.
    if (!executedAny && shuffled.length > 0) {
      const fallbackThread = shuffled.find(t => t.state === 'READY' && t.instructionStack.length > 0);
      if (fallbackThread) {
        this.activeThreadId = fallbackThread.id;
        fallbackThread.state = 'RUNNING';
        const stmt = fallbackThread.instructionStack.shift()!;
        fallbackThread.activeLine = (stmt as any).line;
        this.executeStatement(stmt, fallbackThread, false);
        if (fallbackThread.state === 'RUNNING') fallbackThread.state = 'READY';
        this.activeThreadId = null;
      }
    }

    this.emitState();
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
          this.variables[stmt.target] = { ...this.variables[stmt.target], value: val, previousValue: prev, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
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
        this.variables[stmt.target] = { ...this.variables[stmt.target], value: arr, previousValue: prevArr, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
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
          this.variables[stmt.target] = { ...this.variables[stmt.target], value: nv, previousValue: cur, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
          if (!isAtomic) this.addLog(thread.id, thread.color, stmt.target, thread.name + ': ' + stmt.target + stmt.op + ' => ' + nv);
        }
        break;
      }

      case 'QueuePush': {
        if (!(stmt.target in this.variables)) {
          this.addLog(thread.id, thread.color, 'ERROR', thread.name + ': operacion push en variable no declarada o no es Cola');
          break;
        }
        const vals = stmt.elementExprs.map((expr: string) => this.evaluateExpr(expr, thread));
        const valToPush = vals.length === 1 ? vals[0] : vals;

        const arr = [...(this.variables[stmt.target].value as unknown[])];
        const prevArr = [...arr];
        arr.push(valToPush);
        this.variables[stmt.target] = { ...this.variables[stmt.target], value: arr, previousValue: prevArr, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };

        const valStr = vals.length === 1 ? String(vals[0]) : `[${vals.map(String).join(',')}]`;
        if (!isAtomic) this.addLog(thread.id, thread.color, stmt.target, thread.name + ': push(' + stmt.target + ', ' + valStr + ')');
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
        this.variables[stmt.target] = { ...this.variables[stmt.target], value: arr, previousValue: prevArr, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };

        const vals = (stmt.assignVars.length > 1 && Array.isArray(val)) ? val : [val];
        let logStr = '';

        stmt.assignVars.forEach((assignVar: string, i: number) => {
          const v = i < vals.length ? vals[i] : undefined;
          if (this.isLocalVar(assignVar, thread)) {
            thread.localEnv[assignVar] = v;
            logStr += `local ${assignVar}=${String(v)} `;
          } else {
            if (!(assignVar in this.variables)) {
              this.addLog(thread.id, thread.color, 'ERROR', `Variable no declarada: ${assignVar}`);
              thread.state = 'TERMINATED';
              return;
            }
            const prevVar = this.variables[assignVar].value;
            this.variables[assignVar] = { ...this.variables[assignVar], value: v, previousValue: prevVar, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
            logStr += `global ${assignVar}=${String(v)} `;
          }
        });

        if (!isAtomic && thread.state !== 'TERMINATED') {
          this.addLog(thread.id, thread.color, stmt.target, thread.name + ': pop(' + stmt.target + ') => ' + logStr.trim());
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
            // El hand-off transfiere la posesión del semáforo directamente al hilo
            // despertado (su P() se resuelve sin pasar por un valor intermedio), asi
            // que pasa a ser el nuevo último modificador, no quien llamó a V().
            sem.lastModifiedBy = { id: woken.id, name: woken.name, color: woken.color };
            this.addLog(thread.id, thread.color, sem.name, thread.name + ': V(' + sem.name + ') => despierta ' + woken.name);
          } else {
            sem.value++;
            sem.lastModifiedBy = { id: thread.id, name: thread.name, color: thread.color };
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
