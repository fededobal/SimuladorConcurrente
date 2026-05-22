import { TokenType } from './lexer';
import type { Token } from './lexer';

export type ASTNode = Program | Declaration | Statement;

export interface Program {
  type: 'Program';
  body: ASTNode[];
}

export interface Declaration {
  type: 'Declaration';
  varType: 'int' | 'boolean' | 'sem' | 'text' | 'Cola';
  name: string;
  isArray: boolean;
  sizeExpr?: string;
  initValue: string;
}

export type Statement =
  | Block
  | ProcessDef
  | Assign
  | ArrayAssign
  | Skip
  | IncDec
  | PVOp
  | IfStatement
  | WhileStatement
  | ForStatement
  | Atomic
  | Await
  | LocalDecl
  | QueuePush
  | QueuePop;

export interface Block { type: 'Block'; statements: Statement[]; }
export interface ProcessDef { type: 'ProcessDef'; name: string; body: Block; quantDef?: QuantDef; }
export interface QuantDef { id: string; from: string; to: string; }

export interface Assign { type: 'Assign'; target: string; exprString: string; }
export interface ArrayAssign { type: 'ArrayAssign'; target: string; indexExpr: string; exprString: string; }
export interface Skip { type: 'Skip'; }
export interface IncDec { type: 'IncDec'; target: string; isArray: boolean; idxExpr?: string; op: '++' | '--'; }
export interface PVOp { type: 'PVOp'; operation: 'P' | 'V'; target: string; arrayIdx?: string; }

export interface QueuePush { type: 'QueuePush'; target: string; elementExpr: string; }
export interface QueuePop { type: 'QueuePop'; target: string; assignVar: string; }

export interface IfStatement { type: 'If'; condition: string; consequent: Block; alternate?: Block; }
export interface WhileStatement { type: 'While'; condition: string; body: Block; }
export interface ForStatement { type: 'For'; init?: Assign | LocalDecl; cond?: string; step?: Assign | IncDec; body: Block; }

export interface Atomic { type: 'Atomic'; body: Block; }
export interface Await { type: 'Await'; condition: string; body: Block; }

export interface LocalDecl {
  type: 'LocalDecl';
  varType: 'int' | 'boolean' | 'text';
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
      if (v === 'int' || v === 'boolean' || v === 'sem' || v === 'text' || v === 'Cola') {
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
    const varType = this.advance().value as 'int' | 'boolean' | 'sem' | 'text' | 'Cola';
    const name = this.consumeIdentifier('Se esperaba nombre de variable');

    let isArray = false;
    let sizeExpr: string | undefined;

    if (this.match('[')) {
      isArray = true;
      sizeExpr = this.parseExpressionUntil([']']);
      this.consume(']', "Se esperaba ']' en declaracion de arreglo");
    }

    let initValue = '';
    if (varType === 'Cola') {
      this.consume(';', "Se esperaba ';' al final de declaracion de Cola");
      return { type: 'Declaration', varType, name, isArray: false, initValue: '' };
    }

    if (isArray) {
      if (this.match('=')) {
        this.consume('(', "Se esperaba '(' para inicializar arreglo");
        this.consume('[', "Se esperaba '[' en inicializacion de arreglo");
        this.parseExpressionUntil([']']); // discard inner size
        this.consume(']', "Se esperaba ']' en inicializacion de arreglo");
        initValue = this.parseExpressionUntil([')']);
        if (initValue.length === 0) {
          throw new Error('Parse error en linea ' + this.peek().line + ': Se esperaba un valor de inicializacion para el arreglo despues de [tamaño]');
        }
        this.consume(')', "Se esperaba ')' para inicializar arreglo");
      } else if (varType === 'sem') {
        throw new Error('Parse error en linea ' + this.peek().line + ': Los arreglos de semaforos siempre deben estar inicializados');
      }
    } else {
      initValue = varType === 'boolean' ? 'false' : (varType === 'text' ? '""' : '0');
      if (this.match('=')) {
        initValue = this.parseExpressionUntil([';']);
      } else if (varType === 'sem') {
        throw new Error('Parse error en linea ' + this.peek().line + ': Los semaforos siempre deben estar inicializados');
      }
    }
    
    this.consume(';', "Se esperaba ';'");
    return { type: 'Declaration', varType, name, isArray, sizeExpr, initValue };
  }

  private parseLocalDecl(): LocalDecl {
    const varType = this.advance().value as 'int' | 'boolean' | 'text';
    const name = this.consumeIdentifier('Se esperaba nombre de variable local');
    let initValue = varType === 'boolean' ? 'false' : (varType === 'text' ? '""' : '0');
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
      this.consume(':', "Se esperaba ':'");
      const from = this.parseExpressionUntil(['..']);
      this.consume('..', "Se esperaba '..'");
      const to = this.parseExpressionUntil([']']);
      quantDef = { id, from, to };
      this.consume(']', "Se esperaba ']'");
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

    if (v === 'int' || v === 'boolean' || v === 'text') {
      return this.parseLocalDecl();
    }

    if (this.match('skip')) {
      this.consume(';', "Se esperaba ';'");
      return { type: 'Skip' };
    }

    if (v === 'push' || v === 'pop') {
      const op = this.advance().value as 'push' | 'pop';
      this.consume('(', "Se esperaba '(' despues de push/pop");
      const target = this.consumeIdentifier('Se esperaba nombre de Cola');
      this.consume(',', "Se esperaba ','");
      if (op === 'push') {
        const elementExpr = this.parseExpressionUntil([')']);
        this.consume(')', "Se esperaba ')'");
        this.consume(';', "Se esperaba ';'");
        return { type: 'QueuePush', target, elementExpr };
      } else {
        const assignVar = this.consumeIdentifier('Se esperaba variable destino para pop');
        this.consume(')', "Se esperaba ')'");
        this.consume(';', "Se esperaba ';'");
        return { type: 'QueuePop', target, assignVar };
      }
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
      this.consume('(', "Se esperaba '('");
      const condition = this.parseExpressionUntil([')']);
      this.consume(')', "Se esperaba ')'");
      const consequent = this.parseBlockOrStatement();
      let alternate: Block | undefined;
      if (this.match('else')) alternate = this.parseBlockOrStatement();
      return { type: 'If', condition, consequent, alternate };
    }

    if (this.match('while')) {
      this.consume('(', "Se esperaba '('");
      const condition = this.parseExpressionUntil([')']);
      this.consume(')', "Se esperaba ')'");
      const body = this.parseBlockOrStatement();
      return { type: 'While', condition, body };
    }

    if (this.match('for')) {
      const forTokenLine = this.previous().line;
      this.consume('(', "Se esperaba '('");
      let init: Assign | LocalDecl | undefined;
      let id = '';
      
      if (this.check('int') || this.check('boolean') || this.check('text')) {
        const localType = this.advance().value as 'int' | 'boolean' | 'text';
        id = this.consumeIdentifier('Se esperaba iterador');
        this.consume('=', "Se esperaba '='");
        const from = this.parseExpressionUntil([';', '..']);
        init = { type: 'LocalDecl', varType: localType, name: id, initValue: from };
        (init as any).line = forTokenLine;
      } else if (this.peek().type === TokenType.IDENTIFIER) {
        id = this.advance().value;
        this.consume('=', "Se esperaba '='");
        const from = this.parseExpressionUntil([';', '..']);
        init = { type: 'Assign', target: id, exprString: from };
        (init as any).line = forTokenLine;
      }

      if (this.match('..')) {
        // Range-based for loop: for(int i = 1..10)
        const to = this.parseExpressionUntil([')']);
        this.consume(')', "Se esperaba ')'");
        const body = this.parseBlockOrStatement();
        
        const forStmt = {
          type: 'For',
          init: undefined,
          cond: `${id} <= ${to}`,
          step: { type: 'IncDec', target: id, isArray: false, op: '++' },
          body
        } as ForStatement;
        (forStmt as any).line = forTokenLine;
        (forStmt.step as any).line = forTokenLine;

        if (init && init.type === 'LocalDecl') {
          return {
            type: 'Block',
            statements: [init, forStmt]
          };
        } else {
          forStmt.init = init as Assign;
          return forStmt;
        }
      }

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
        (step as any).line = forTokenLine;
      }
      this.consume(')', "Se esperaba ')'");
      const body = this.parseBlockOrStatement();
      
      if (init && init.type === 'LocalDecl') {
        const forStmt = { type: 'For', init: undefined, cond, step, body } as ForStatement;
        (forStmt as any).line = forTokenLine;
        return {
          type: 'Block',
          statements: [init, forStmt]
        };
      } else {
        const forStmt = { type: 'For', init: init as Assign | undefined, cond, step, body } as ForStatement;
        (forStmt as any).line = forTokenLine;
        return forStmt;
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
      if (this.match('++') || this.match('--')) {
        const op = this.previous().value as '++' | '--';
        this.consume(';', "Se esperaba ';'");
        return { type: 'IncDec', target, isArray, idxExpr: isArray ? idxExpr : undefined, op };
      }
      this.consume('=', "Se esperaba '=' o '++' o '--'");
      const exprString = this.parseExpressionUntil([';']);
      this.consume(';', "Se esperaba ';'");
      if (isArray) return { type: 'ArrayAssign', target, indexExpr: idxExpr, exprString };
      return { type: 'Assign', target, exprString };
    }

    const msg = 'Instruccion no valida en linea ' + token.line + ': "' + token.value + '"';
    throw new Error(msg);
  }

  private parseExpressionUntil(stopTokens: string[]): string {
    let expr = '';
    let depth = 0;
    while (!this.isAtEnd()) {
      const val = this.peek().value;
      if (val === '(' || val === '[') depth++;
      if ((val === ')' || val === ']') && depth > 0) depth--;
      else if (depth === 0 && stopTokens.includes(val)) break;
      
      // Handle strings properly in expression
      if (this.peek().type === TokenType.STRING) {
        expr += '"' + this.advance().value + '" ';
      } else {
        expr += this.advance().value + ' ';
      }
    }
    return expr.trim();
  }
}
