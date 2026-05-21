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
  state: 'READY' | 'BLOCKED' | 'TERMINATED';
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

export class VirtualMachine {
  private variables: Record<string, VariableSnapshot> = {};
  private semaphores: Record<string, SemaphoreSnapshot> = {};
  private threads: Thread[] = [];
  private threadCounter = 1;
  private logs: LogEntry[] = [];

  public onStateChange?: (state: VMState, logs: LogEntry[]) => void;

  constructor(private program: Program) {
    this.initialize();
  }

  private deepCloneState(): VMState {
    return JSON.parse(JSON.stringify({
      variables: this.variables,
      semaphores: this.semaphores,
      threads: this.threads.map(t => ({
        id: t.id, name: t.name, color: t.color, state: t.state,
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
      // Local vars first (more specific, shadows globals)
      if (thread) {
        for (const key of Object.keys(thread.localEnv)) {
          if (key.startsWith('__')) continue;
          const rx = new RegExp('\\b' + key + '\\b', 'g');
          e = e.replace(rx, String(thread.localEnv[key]));
        }
      }
      // Global vars
      for (const key of Object.keys(this.variables)) {
        const rx = new RegExp('\\b' + key + '\\b', 'g');
        const val = this.variables[key].value;
        e = e.replace(rx, Array.isArray(val) ? JSON.stringify(val) : String(val));
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

  // Check if a variable name is local to this thread
  private isLocalVar(name: string, thread: Thread): boolean {
    return name in thread.localEnv && !name.startsWith('__');
  }

  private initialize() {
    let colorIdx = 0;

    // Pass 1: declarations
    for (const node of this.program.body) {
      if (node.type !== 'Declaration') continue;
      const decl = node as Declaration;
      if (decl.varType === 'sem') {
        const iv = decl.initValue ? Number(this.evaluateExpr(decl.initValue, null)) : 1;
        this.semaphores[decl.name] = { name: decl.name, value: iv, blockedQueue: [] };
      } else {
        let initVal: unknown;
        if (decl.isArray) {
          const from = decl.sizeFrom ? Number(this.evaluateExpr(decl.sizeFrom, null)) : 0;
          const to = decl.sizeTo ? Number(this.evaluateExpr(decl.sizeTo, null)) : 0;
          const size = Math.max(0, to - from + 1);
          initVal = new Array(size).fill(decl.varType === 'bool' ? false : 0);
        } else {
          const raw = decl.initValue;
          if (raw === 'true') initVal = true;
          else if (raw === 'false') initVal = false;
          else if (raw !== '' && !isNaN(Number(raw))) initVal = Number(raw);
          else initVal = this.evaluateExpr(raw, null);
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
    // Check co-oc children that finished
    const coChildren = this.threads.filter(t => t.state === 'READY' && t.onTerminate && t.instructionStack.length === 0);
    for (const child of coChildren) {
      child.state = 'TERMINATED';
      this.addLog(child.id, child.color, child.name, child.name + ': rama co-oc terminada');
      if (child.onTerminate) child.onTerminate();
      this.emitState();
      return;
    }

    const ready = this.threads.filter(t => t.state === 'READY');
    if (ready.length === 0) {
      if (!this.isFinished()) {
        this.addLog(0, undefined, 'DEADLOCK', 'Todos los hilos bloqueados (Deadlock).');
        this.emitState();
      }
      return;
    }

    const thread = ready[Math.floor(Math.random() * ready.length)];

    if (thread.instructionStack.length === 0) {
      thread.state = 'TERMINATED';
      this.addLog(thread.id, thread.color, thread.name, thread.name + ': proceso terminado.');
      if (thread.onTerminate) thread.onTerminate();
      this.emitState();
      return;
    }

    const stmt = thread.instructionStack.shift()!;
    this.executeStatement(stmt, thread, false);
    this.emitState();
  }

  private executeStatement(stmt: Statement, thread: Thread, isAtomic: boolean): void {
    switch (stmt.type) {
      case 'Skip': break;

      // ========= LOCAL VARIABLE DECLARATION =========
      case 'LocalDecl': {
        let initVal: unknown;
        const raw = stmt.initValue;
        if (raw === 'true') initVal = true;
        else if (raw === 'false') initVal = false;
        else if (raw !== '' && !isNaN(Number(raw))) initVal = Number(raw);
        else initVal = this.evaluateExpr(raw, thread);
        thread.localEnv[stmt.name] = initVal;
        if (!isAtomic) this.addLog(thread.id, thread.color, stmt.name, thread.name + ': local ' + stmt.varType + ' ' + stmt.name + ' = ' + String(initVal));
        break;
      }

      // ========= ASSIGNMENT (checks local first, then global) =========
      case 'Assign': {
        const val = this.evaluateExpr(stmt.exprString, thread);
        if (this.isLocalVar(stmt.target, thread)) {
          // Update local variable
          thread.localEnv[stmt.target] = val;
          if (!isAtomic) this.addLog(thread.id, thread.color, stmt.target, thread.name + ': ' + stmt.target + ' = ' + String(val) + ' (local)');
        } else {
          // Update global variable (auto-create if not exists)
          if (!(stmt.target in this.variables)) {
            this.variables[stmt.target] = { value: 0, previousValue: 0 };
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

      // ========= INC/DEC (checks local first, then global) =========
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

      case 'Swap': {
        if (!(stmt.left in this.variables) || !(stmt.right in this.variables)) break;
        const lv = this.variables[stmt.left].value;
        const rv = this.variables[stmt.right].value;
        this.variables[stmt.left] = { value: rv, previousValue: lv, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
        this.variables[stmt.right] = { value: lv, previousValue: rv, lastModifiedBy: { id: thread.id, name: thread.name, color: thread.color } };
        if (!isAtomic) this.addLog(thread.id, thread.color, 'SWAP', thread.name + ': ' + stmt.left + ' :=: ' + stmt.right);
        break;
      }

      case 'PVOp': {
        const sem = this.semaphores[stmt.target];
        if (!sem) {
          this.addLog(thread.id, thread.color, 'ERROR', 'Semaforo no declarado: ' + stmt.target);
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
                if (top.type === 'PVOp' && top.operation === 'P' && top.target === sem.name) {
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

      case 'IfDijkstra': {
        const trueGuards = stmt.guards.filter(g => this.evaluateExpr(g.condition, thread));
        if (trueGuards.length > 0) {
          const chosen = trueGuards[Math.floor(Math.random() * trueGuards.length)];
          thread.instructionStack.unshift(...chosen.body.statements);
          this.addLog(thread.id, thread.color, 'IF-FI', thread.name + ': guarda: ' + chosen.condition.trim());
        } else {
          this.addLog(thread.id, thread.color, 'ERROR', thread.name + ': if-fi sin guarda verdadera (abort)');
          thread.state = 'TERMINATED';
        }
        break;
      }

      case 'DoDijkstra': {
        const trueGuards = stmt.guards.filter(g => this.evaluateExpr(g.condition, thread));
        if (trueGuards.length > 0) {
          const chosen = trueGuards[Math.floor(Math.random() * trueGuards.length)];
          thread.instructionStack.unshift(stmt);
          thread.instructionStack.unshift(...chosen.body.statements);
          this.addLog(thread.id, thread.color, 'DO-OD', thread.name + ': guarda: ' + chosen.condition.trim());
        } else {
          this.addLog(thread.id, thread.color, 'DO-OD', thread.name + ': do-od terminado');
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

      case 'ForQuantified': {
        const from = Number(this.evaluateExpr(stmt.quant.from, thread));
        const to = Number(this.evaluateExpr(stmt.quant.to, thread));
        for (let i = to; i >= from; i--) {
          const bodyClone = JSON.parse(JSON.stringify(stmt.body.statements)) as Statement[];
          const substituted = this.substituteLocal(bodyClone, stmt.quant.id, i);
          thread.instructionStack.unshift({ type: 'Block', statements: substituted });
        }
        break;
      }

      case 'ForCStyle': {
        if (stmt.init) this.executeStatement(stmt.init, thread, true);
        const cond = stmt.cond || 'true';
        const bodyPlusStep: Statement[] = [...stmt.body.statements];
        if (stmt.step) bodyPlusStep.push(stmt.step as Statement);
        thread.instructionStack.unshift({ type: 'While', condition: cond, body: { type: 'Block', statements: bodyPlusStep } });
        break;
      }

      case 'ForAll': {
        const fq = stmt.quants[0];
        const from = Number(this.evaluateExpr(fq.from, thread));
        const to = Number(this.evaluateExpr(fq.to, thread));
        for (let i = to; i >= from; i--) {
          if (stmt.stExpr) {
            const condStmts = this.substituteLocal([{ type: 'Assign', target: '__dummy', exprString: stmt.stExpr }] as Statement[], fq.id, i);
            const evalCond = this.evaluateExpr((condStmts[0] as { exprString: string }).exprString, thread);
            if (!evalCond) continue;
          }
          const bodyClone = JSON.parse(JSON.stringify(stmt.body.statements)) as Statement[];
          thread.instructionStack.unshift({ type: 'Block', statements: this.substituteLocal(bodyClone, fq.id, i) });
        }
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

      case 'CoOc': {
        if (stmt.branches.length === 0) break;
        thread.state = 'BLOCKED';
        this.addLog(thread.id, thread.color, 'CO-OC', thread.name + ': lanzando ' + stmt.branches.length + ' ramas');
        let remaining = stmt.branches.length;
        const parentThread = thread;
        for (let b = 0; b < stmt.branches.length; b++) {
          const branch = stmt.branches[b];
          const childId = this.threadCounter++;
          const child: Thread = {
            id: childId,
            name: parentThread.name + '.co[' + b + ']',
            color: THREAD_COLORS[childId % THREAD_COLORS.length],
            state: 'READY',
            instructionStack: JSON.parse(JSON.stringify(branch.statements)) as Statement[],
            localEnv: { ...parentThread.localEnv },
            onTerminate: () => {
              remaining--;
              if (remaining === 0) {
                parentThread.state = 'READY';
                this.addLog(0, undefined, 'CO-OC', 'Ramas terminadas => reanudando ' + parentThread.name);
              }
            }
          };
          this.threads.push(child);
        }
        break;
      }

      case 'CoOcQuantified': {
        const qfrom = Number(this.evaluateExpr(stmt.quant.from, thread));
        const qto = Number(this.evaluateExpr(stmt.quant.to, thread));
        const count = qto - qfrom + 1;
        if (count <= 0) break;
        thread.state = 'BLOCKED';
        this.addLog(thread.id, thread.color, 'CO-OC', thread.name + ': co cuantificado, ' + count + ' hilos');
        let rem = count;
        const par = thread;
        for (let i = qfrom; i <= qto; i++) {
          const ii = i;
          const childId = this.threadCounter++;
          const bodyClone = JSON.parse(JSON.stringify(stmt.body.statements)) as Statement[];
          const child: Thread = {
            id: childId,
            name: par.name + '.' + stmt.quant.id + '[' + ii + ']',
            color: THREAD_COLORS[childId % THREAD_COLORS.length],
            state: 'READY',
            instructionStack: this.substituteLocal(bodyClone, stmt.quant.id, ii),
            localEnv: { ...par.localEnv, [stmt.quant.id]: ii },
            onTerminate: () => {
              rem--;
              if (rem === 0) {
                par.state = 'READY';
                this.addLog(0, undefined, 'CO-OC', 'Hilos co cuantificados listos => reanudando ' + par.name);
              }
            }
          };
          this.threads.push(child);
        }
        break;
      }

      default: {
        const anyStmt = stmt as { type: string };
        this.addLog(thread.id, thread.color, 'WARN', 'Nodo sin implementar: ' + anyStmt.type);
      }
    }
  }

  private substituteLocal(stmts: Statement[], id: string, value: number): Statement[] {
    const rx = new RegExp('\\b' + id + '\\b', 'g');
    const sub = (obj: unknown): unknown => {
      if (typeof obj === 'string') return obj.replace(rx, String(value));
      if (Array.isArray(obj)) return obj.map(sub);
      if (obj && typeof obj === 'object') {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(obj as object)) {
          out[k] = sub((obj as Record<string, unknown>)[k]);
        }
        return out;
      }
      return obj;
    };
    return sub(stmts) as Statement[];
  }
}
