export const TokenType = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  STRING: 'STRING',
  SYMBOL: 'SYMBOL',
  EOF: 'EOF',
} as const;

export type TokenTypeValue = typeof TokenType[keyof typeof TokenType];

export interface Token {
  type: TokenTypeValue;
  value: string;
  line: number;
}

const KEYWORDS = new Set([
  'process', 'sem', 'int', 'boolean', 'text', 'Cola', 'while', 'if', 'else',
  'for', 'push', 'pop', 'empty'
]);

const BOOLEANS = new Set(['true', 'false']);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  let line = 1;

  while (cursor < input.length) {
    const char = input[cursor];
    const nextChar = input[cursor + 1] || '';

    // Whitespace
    if (/\s/.test(char)) {
      if (char === '\n') line++;
      cursor++;
      continue;
    }

    // Line comments //
    if (char === '/' && nextChar === '/') {
      while (cursor < input.length && input[cursor] !== '\n') cursor++;
      continue;
    }

    // Block comments /* */
    if (char === '/' && nextChar === '*') {
      cursor += 2;
      while (cursor < input.length) {
        if (input[cursor] === '\n') line++;
        if (input[cursor] === '*' && input[cursor + 1] === '/') {
          cursor += 2;
          break;
        }
        cursor++;
      }
      continue;
    }

    // Strings "..."
    if (char === '"') {
      let str = '';
      cursor++; // skip "
      while (cursor < input.length && input[cursor] !== '"') {
        if (input[cursor] === '\n') line++;
        str += input[cursor];
        cursor++;
      }
      if (cursor < input.length && input[cursor] === '"') cursor++; // skip "
      tokens.push({ type: TokenType.STRING, value: str, line });
      continue;
    }

    // Numbers
    if (/\d/.test(char)) {
      let numStr = '';
      while (cursor < input.length && /\d/.test(input[cursor])) {
        numStr += input[cursor];
        cursor++;
      }
      tokens.push({ type: TokenType.NUMBER, value: numStr, line });
      continue;
    }

    // Identifiers, keywords, booleans
    if (/[a-zA-Z_]/.test(char)) {
      let id = '';
      while (cursor < input.length && /[a-zA-Z0-9_]/.test(input[cursor])) {
        id += input[cursor];
        cursor++;
      }
      if (BOOLEANS.has(id)) {
        tokens.push({ type: TokenType.BOOLEAN, value: id, line });
      } else if (id === 'P' || id === 'V') {
        // P and V are sem ops only when followed by '('
        const rest = input.slice(cursor).trimStart();
        if (rest.startsWith('(')) {
          tokens.push({ type: TokenType.KEYWORD, value: id, line });
        } else {
          tokens.push({ type: TokenType.IDENTIFIER, value: id, line });
        }
      } else if (id === 'and' || id === 'or' || id === 'not') {
        tokens.push({ type: TokenType.SYMBOL, value: id, line });
      } else if (KEYWORDS.has(id)) {
        tokens.push({ type: TokenType.KEYWORD, value: id, line });
      } else {
        tokens.push({ type: TokenType.IDENTIFIER, value: id, line });
      }
      continue;
    }

    // Two-char operators
    const twoChars = char + nextChar;
    if (['==', '!=', '<=', '>=', '++', '--', '..', '+=', '-='].includes(twoChars)) {
      tokens.push({ type: TokenType.SYMBOL, value: twoChars, line });
      cursor += 2;
      continue;
    }

    // Single symbols
    if ('+-*/=<>(){}[];,.:'.includes(char)) {
      tokens.push({ type: TokenType.SYMBOL, value: char, line });
      cursor++;
      continue;
    }

    cursor++; // unknown char, skip
  }

  tokens.push({ type: TokenType.EOF, value: '', line });
  return tokens;
}
