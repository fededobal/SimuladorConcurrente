import { TokenType } from './lexer';
import type { Token } from './lexer';

export type ASTNode = Program | Declaration | Statement;

export interface Program {
  type: 'Program';
  body: ASTNode[];
}

export interface Declaration {
  type: 'Declaration';
  varType: 'int' | 'bool' | 'sem';
  name: string;
  isArray: boolean;
  sizeFrom?: string;
  sizeTo?: string;
  initValue: string;
}

export type Statement =
  | Block
  | ProcessDef
  | CoOc
  | CoOcQuantified
  | Assign
  | ArrayAssign
  | Swap
  | Skip
  | IncDec
  | PVOp
  | IfStatement
  | IfDijkstra
  | DoDijkstra
  | WhileStatement
  | ForCStyle
  | ForQuantified
  | ForAll
  | Atomic
  | Await
  | LocalDecl;

export interface Block { type: 'Block'; statements: Statement[]; }
export interface ProcessDef { type: 'ProcessDef'; name: string; body: Block; quantDef?: QuantDef; }
export interface QuantDef { id: string; from: string; to: string; }

export interface CoOc { type: 'CoOc'; branches: Block[]; }
export interface CoOcQuantified { type: 'CoOcQuantified'; quant: QuantDef; body: Block; }

export interface Assign { type: 'Assign'; target: string; exprString: string; }
export interface ArrayAssign { type: 'ArrayAssign'; target: string; indexExpr: string; exprString: string; }
export interface Swap { type: 'Swap'; left: string; leftIdx?: string; right: string; rightIdx?: string; }
export interface Skip { type: 'Skip'; }
export interface IncDec { type: 'IncDec'; target: string; isArray: boolean; idxExpr?: string; op: '++' | '--'; }
export interface PVOp { type: 'PVOp'; operation: 'P' | 'V'; target: string; arrayIdx?: string; }

export interface IfStatement { type: 'If'; condition: string; consequent: Block; alternate?: Block; }
export interface GuardedCommand { condition: string; body: Block; }
export interface IfDijkstra { type: 'IfDijkstra'; guards: GuardedCommand[]; }
export interface DoDijkstra { type: 'DoDijkstra'; guards: GuardedCommand[]; }

export interface WhileStatement { type: 'While'; condition: string; body: Block; }
export interface ForCStyle { type: 'ForCStyle'; init?: Assign | LocalDecl; cond?: string; step?: Assign | IncDec; body: Block; }
export interface ForQuantified { type: 'ForQuantified'; quant: QuantDef; body: Block; }
export interface ForAll { type: 'ForAll'; quants: QuantDef[]; stExpr?: string; body: Block; }

export interface Atomic { type: 'Atomic'; body: Block; }
export interface Await { type: 'Await'; condition: string; body: Block; }

// Local variable declaration inside a process body (not a semaphore)
export interface LocalDecl {
  type: 'LocalDecl';
  varType: 'int' | 'bool';
  name: string;
  initValue: string;
}

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token { return this.tokens[this.current]; }
  private previous(): Token { return this.tokens[this.current - 1]; }
  private isAtEnd(): boolean { return this.peek().type === TokenType.EOF; }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(value: string): boolean {
    return !this.isAtEnd() && this.peek().value === value;
  }

  private match(...values: string[]): boolean {
    if (this.isAtEnd()) return false;
    if (values.includes(this.peek().value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private consume(expectedValue: string, errorMsg: string): Token {
    if (this.peek().value === expectedValue) return this.advance();
    const err = 'Parse error en linea ' + this.peek().line + ': ' + errorMsg + '. Encontrado "' + this.peek().value + '"';
    throw new Error(err);
  }

  private consumeIdentifier(errorMsg: string): string {
    if (this.peek().type === TokenType.IDENTIFIER) return this.advance().value;
    const err = 'Parse error en linea ' + this.peek().line + ': ' + errorMsg;
    throw new Error(err);
  }

  public parse(): Program {
    const body: ASTNode[] = [];
    while (!this.isAtEnd()) {
      const v = this.peek().value;
      if (v === 'int' || v === 'bool' || v === 'sem') {
        body.push(this.parseDeclaration());
      } else if (v === 'process') {
        body.push(this.parseProcess());
      } else {
        body.push(this.parseStatement());
      }
    }
    return { type: 'Program', body };
  }

  private parseDeclaration(): Declaration {
    const varType = this.advance().value as 'int' | 'bool' | 'sem';
    const name = this.consumeIdentifier('Se esperaba nombre de variable');

    let isArray = false;
    let sizeFrom: string | undefined;
    let sizeTo: string | undefined;

    if (this.match('[')) {
      isArray = true;
      const first = this.parseExpressionUntil([']', ':']);
      if (this.match(':')) {
        sizeFrom = first;
        sizeTo = this.parseExpressionUntil([']']);
      } else {
        sizeFrom = '0';
        sizeTo = first;
      }
      this.consume(']', "Se esperaba ']' en declaracion de arreglo");
    }

    let initValue = isArray ? '' : (varType === 'bool' ? 'false' : '0');
    if (this.match('=')) {
      initValue = this.parseExpressionUntil([';']);
    }
    this.consume(';', "Se esperaba ';'");
    return { type: 'Declaration', varType, name, isArray, sizeFrom, sizeTo, initValue };
  }

  // Parse a local variable declaration (int/bool only, no arrays, no sem)
  private parseLocalDecl(): LocalDecl {
    const varType = this.advance().value as 'int' | 'bool';
    const name = this.consumeIdentifier('Se esperaba nombre de variable local');
    let initValue = varType === 'bool' ? 'false' : '0';
    if (this.match('=')) {
      initValue = this.parseExpressionUntil([';']);
    }
    this.consume(';', "Se esperaba ';'");
    return { type: 'LocalDecl', varType, name, initValue };
  }

  private parseProcess(): ProcessDef {
    this.consume('process', 'Expected process');
    const name = this.consumeIdentifier('Se esperaba nombre de proceso');

    let quantDef: QuantDef | undefined;
    if (this.match('[')) {
      const id = this.consumeIdentifier('Se esperaba iterador');
      this.consume('=', "Se esperaba '='");
      const from = this.parseExpressionUntil(['to']);
      this.consume('to', "Se esperaba 'to'");
      const to = this.parseExpressionUntil([']']);
      this.consume(']', "Se esperaba ']'");
      quantDef = { id, from, to };
    }

    this.consume('{', "Se esperaba '{'");
    const body = this.parseBlock();
    return { type: 'ProcessDef', name, body, quantDef };
  }

  private parseBlock(): Block {
    const statements: Statement[] = [];
    while (!this.check('}') && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    this.consume('}', "Se esperaba '}'");
    return { type: 'Block', statements };
  }

  private parseBlockOrStatement(): Block {
    if (this.check('{')) {
      this.advance();
      return this.parseBlock();
    }
    return { type: 'Block', statements: [this.parseStatement()] };
  }

  private parseStatement(): Statement {
    if (this.isAtEnd()) throw new Error('Unexpected EOF');
    const line = this.peek().line;
    const stmt = this.parseStatementInternal();
    (stmt as any).line = line;
    return stmt;
  }

  private parseStatementInternal(): Statement {
    const token = this.peek();
    const v = token.value;

    // Local variable declarations inside process bodies (int/bool, NOT sem)
    if (v === 'int' || v === 'bool') {
      return this.parseLocalDecl();
    }

    if (this.match('skip')) {
      this.consume(';', "Se esperaba ';'");
      return { type: 'Skip' };
    }

    if (v === 'P' || v === 'V') {
      const op = this.advance().value as 'P' | 'V';
      this.consume('(', "Se esperaba '(' despues de P/V");
      const target = this.consumeIdentifier('Se esperaba nombre de semaforo');
      let arrayIdx: string | undefined;
      if (this.match('[')) {
        arrayIdx = this.parseExpressionUntil([']']);
        this.consume(']', "Se esperaba ']'");
      }
      this.consume(')', "Se esperaba ')'");
      this.consume(';', "Se esperaba ';'");
      return { type: 'PVOp', operation: op, target, arrayIdx };
    }

    if (this.match('if')) {
      if (this.match('(')) {
        const condition = this.parseExpressionUntil([')']);
        this.consume(')', "Se esperaba ')'");
        const consequent = this.parseBlockOrStatement();
        let alternate: Block | undefined;
        if (this.match('else')) alternate = this.parseBlockOrStatement();
        return { type: 'If', condition, consequent, alternate };
      } else {
        const guards = this.parseGuardedCommands('fi');
        this.consume('fi', "Se esperaba 'fi'");
        return { type: 'IfDijkstra', guards };
      }
    }

    if (this.match('do')) {
      const guards = this.parseGuardedCommands('od');
      this.consume('od', "Se esperaba 'od'");
      return { type: 'DoDijkstra', guards };
    }

    if (this.match('while')) {
      this.consume('(', "Se esperaba '('");
      const condition = this.parseExpressionUntil([')']);
      this.consume(')', "Se esperaba ')'");
      const body = this.parseBlockOrStatement();
      return { type: 'While', condition, body };
    }

    if (this.match('for')) {
      this.consume('(', "Se esperaba '('");
      // Check if next token is 'int' or 'bool' => quantified for with local decl
      // or just an identifier => could be quantified or C-style
      if (this.check('int') || this.check('bool')) {
        // for (int i = expr to expr) stmt  -- quantified with local type
        const localType = this.advance().value as 'int' | 'bool';
        const id = this.consumeIdentifier('Se esperaba iterador');
        this.consume('=', "Se esperaba '='");
        // Peek ahead: is this a 'to' style or C-style?
        const from = this.parseExpressionUntil(['to', ';']);
        if (this.match('to')) {
          const to = this.parseExpressionUntil([')']);
          this.consume(')', "Se esperaba ')'");
          const body = this.parseBlockOrStatement();
          // Emit a LocalDecl + ForQuantified
          const declStmt: LocalDecl = { type: 'LocalDecl', varType: localType, name: id, initValue: from };
          return {
            type: 'Block',
            statements: [
              declStmt,
              { type: 'ForQuantified', quant: { id, from, to }, body }
            ]
          };
        } else {
          // C-style for with typed init: for (int i = 0; cond; step) body
          const declStmt: LocalDecl = { type: 'LocalDecl', varType: localType, name: id, initValue: from };
          this.consume(';', "Se esperaba ';'");
          const cond = this.check(';') ? '' : this.parseExpressionUntil([';']);
          this.consume(';', "Se esperaba ';'");
          let step: Assign | IncDec | undefined;
          if (!this.check(')') && this.peek().type === TokenType.IDENTIFIER) {
            const tgt = this.advance().value;
            if (this.match('++') || this.match('--')) {
              step = { type: 'IncDec', target: tgt, isArray: false, op: this.previous().value as '++' | '--' };
            } else {
              this.consume('=', "Se esperaba '='");
              const ex = this.parseExpressionUntil([')']);
              step = { type: 'Assign', target: tgt, exprString: ex };
            }
          }
          this.consume(')', "Se esperaba ')'");
          const body = this.parseBlockOrStatement();
          return {
            type: 'Block',
            statements: [
              declStmt,
              { type: 'ForCStyle', init: undefined, cond, step, body } as ForCStyle
            ]
          };
        }
      }

      // Plain identifier => quantified or C-style
      if (this.peek().type === TokenType.IDENTIFIER) {
        const id = this.advance().value;
        this.consume('=', "Se esperaba '='");
        const from = this.parseExpressionUntil(['to', ';']);
        if (this.match('to')) {
          // Quantified for: for (i = 1 to N) stmt
          const to = this.parseExpressionUntil([')']);
          this.consume(')', "Se esperaba ')'");
          const body = this.parseBlockOrStatement();
          return { type: 'ForQuantified', quant: { id, from, to }, body };
        } else {
          // C-style for: for (i = 0; cond; step) body
          const init: Assign = { type: 'Assign', target: id, exprString: from };
          this.consume(';', "Se esperaba ';'");
          const cond = this.check(';') ? '' : this.parseExpressionUntil([';']);
          this.consume(';', "Se esperaba ';'");
          let step: Assign | IncDec | undefined;
          if (!this.check(')') && this.peek().type === TokenType.IDENTIFIER) {
            const tgt = this.advance().value;
            if (this.match('++') || this.match('--')) {
              step = { type: 'IncDec', target: tgt, isArray: false, op: this.previous().value as '++' | '--' };
            } else {
              this.consume('=', "Se esperaba '='");
              const ex = this.parseExpressionUntil([')']);
              step = { type: 'Assign', target: tgt, exprString: ex };
            }
          }
          this.consume(')', "Se esperaba ')'");
          const body = this.parseBlockOrStatement();
          return { type: 'ForCStyle', init, cond, step, body };
        }
      }

      // Fallback: empty init C-style
      this.consume(';', "Se esperaba ';'");
      const cond2 = this.check(';') ? '' : this.parseExpressionUntil([';']);
      this.consume(';', "Se esperaba ';'");
      let step2: Assign | IncDec | undefined;
      if (!this.check(')') && this.peek().type === TokenType.IDENTIFIER) {
        const tgt = this.advance().value;
        if (this.match('++') || this.match('--')) {
          step2 = { type: 'IncDec', target: tgt, isArray: false, op: this.previous().value as '++' | '--' };
        } else {
          this.consume('=', "Se esperaba '='");
          const ex = this.parseExpressionUntil([')']);
          step2 = { type: 'Assign', target: tgt, exprString: ex };
        }
      }
      this.consume(')', "Se esperaba ')'");
      const body2 = this.parseBlockOrStatement();
      return { type: 'ForCStyle', init: undefined, cond: cond2, step: step2, body: body2 };
    }

    if (this.match('fa')) {
      const quants: QuantDef[] = [];
      do {
        const id = this.consumeIdentifier('Se esperaba iterador en fa');
        this.consume(':=', "Se esperaba ':='");
        const from = this.parseExpressionUntil(['to']);
        this.consume('to', "Se esperaba 'to'");
        const to = this.parseExpressionUntil([',', 'st', '->']);
        quants.push({ id, from, to });
      } while (this.match(','));
      let stExpr: string | undefined;
      if (this.match('st')) {
        stExpr = this.parseExpressionUntil(['->']);
      }
      this.consume('->', "Se esperaba '->'");
      const body = this.parseBlockOrStatement();
      this.consume('af', "Se esperaba 'af'");
      return { type: 'ForAll', quants, stExpr, body };
    }

    if (this.match('co')) {
      if (this.match('[')) {
        const id = this.consumeIdentifier('Se esperaba iterador en co');
        this.consume('=', "Se esperaba '='");
        const from = this.parseExpressionUntil(['to']);
        this.consume('to', "Se esperaba 'to'");
        const to = this.parseExpressionUntil([']']);
        this.consume(']', "Se esperaba ']'");
        const stmts: Statement[] = [];
        while (!this.check('oc') && !this.isAtEnd()) stmts.push(this.parseStatement());
        this.consume('oc', "Se esperaba 'oc'");
        return { type: 'CoOcQuantified', quant: { id, from, to }, body: { type: 'Block', statements: stmts } };
      } else {
        const branches: Block[] = [];
        let current: Statement[] = [];
        while (!this.check('oc') && !this.isAtEnd()) {
          if (this.match('//')) {
            branches.push({ type: 'Block', statements: current });
            current = [];
          } else {
            current.push(this.parseStatement());
          }
        }
        if (current.length > 0) branches.push({ type: 'Block', statements: current });
        this.consume('oc', "Se esperaba 'oc'");
        return { type: 'CoOc', branches };
      }
    }

    if (this.match('<')) {
      if (this.match('await')) {
        this.consume('(', "Se esperaba '(' en await");
        const condition = this.parseExpressionUntil([')']);
        this.consume(')', "Se esperaba ')'");
        const stmts: Statement[] = [];
        while (!this.check('>') && !this.isAtEnd()) stmts.push(this.parseStatement());
        this.consume('>', "Se esperaba '>'");
        return { type: 'Await', condition, body: { type: 'Block', statements: stmts } };
      } else {
        const stmts: Statement[] = [];
        while (!this.check('>') && !this.isAtEnd()) stmts.push(this.parseStatement());
        this.consume('>', "Se esperaba '>'");
        return { type: 'Atomic', body: { type: 'Block', statements: stmts } };
      }
    }

    if (this.match('{')) return this.parseBlock();

    if (token.type === TokenType.IDENTIFIER) {
      const target = this.advance().value;
      let isArray = false;
      let idxExpr = '';
      if (this.match('[')) {
        isArray = true;
        idxExpr = this.parseExpressionUntil([']']);
        this.consume(']', "Se esperaba ']'");
      }
      if (this.match(':=:')) {
        const right = this.consumeIdentifier('Se esperaba variable para swap');
        let rightIdx: string | undefined;
        if (this.match('[')) {
          rightIdx = this.parseExpressionUntil([']']);
          this.consume(']', "Se esperaba ']'");
        }
        this.consume(';', "Se esperaba ';'");
        return { type: 'Swap', left: target, leftIdx: isArray ? idxExpr : undefined, right, rightIdx };
      }
      if (this.match('++') || this.match('--')) {
        const op = this.previous().value as '++' | '--';
        this.consume(';', "Se esperaba ';'");
        return { type: 'IncDec', target, isArray, idxExpr: isArray ? idxExpr : undefined, op };
      }
      this.consume('=', "Se esperaba '=', ':=:', '++' o '--'");
      const exprString = this.parseExpressionUntil([';']);
      this.consume(';', "Se esperaba ';'");
      if (isArray) return { type: 'ArrayAssign', target, indexExpr: idxExpr, exprString };
      return { type: 'Assign', target, exprString };
    }

    const msg = 'Instruccion no valida en linea ' + token.line + ': "' + token.value + '"';
    throw new Error(msg);
  }

  private parseGuardedCommands(endToken: string): GuardedCommand[] {
    const guards: GuardedCommand[] = [];
    while (!this.check(endToken) && !this.isAtEnd()) {
      if (this.match('[]')) continue;
      const condition = this.parseExpressionUntil(['->']);
      this.consume('->', "Se esperaba '->'");
      const stmts: Statement[] = [];
      while (!this.check('[]') && !this.check(endToken) && !this.isAtEnd()) {
        stmts.push(this.parseStatement());
      }
      guards.push({ condition, body: { type: 'Block', statements: stmts } });
    }
    return guards;
  }

  private parseExpressionUntil(stopTokens: string[]): string {
    let expr = '';
    let depth = 0;
    while (!this.isAtEnd()) {
      const val = this.peek().value;
      if (val === '(' || val === '[') depth++;
      if ((val === ')' || val === ']') && depth > 0) depth--;
      else if (depth === 0 && stopTokens.includes(val)) break;
      expr += this.advance().value + ' ';
    }
    return expr.trim();
  }
}
