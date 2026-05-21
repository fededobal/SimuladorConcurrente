export const TokenType = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
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
  'process', 'co', 'oc', 'sem', 'int', 'bool', 'while', 'if', 'else', 'fi',
  'do', 'od', 'for', 'fa', 'af', 'st', 'to', 'skip', 'await'
]);

const BOOLEANS = new Set(['true', 'false']);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  let line = 1;

  while (cursor < input.length) {
    const char = input[cursor];

    // Line comments starting with #
    if (char === '#') {
      while (cursor < input.length && input[cursor] !== '\n') cursor++;
      continue;
    }

    // Whitespace
    if (/\s/.test(char)) {
      if (char === '\n') line++;
      cursor++;
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
      } else if (id === 'and' || id === 'or' || id === 'not' || id === 'XOR') {
        tokens.push({ type: TokenType.SYMBOL, value: id, line });
      } else if (KEYWORDS.has(id)) {
        tokens.push({ type: TokenType.KEYWORD, value: id, line });
      } else {
        tokens.push({ type: TokenType.IDENTIFIER, value: id, line });
      }
      continue;
    }

    const nextChar = input[cursor + 1] || '';
    const nextNextChar = input[cursor + 2] || '';

    // :=: (swap)
    if (char === ':' && nextChar === '=' && nextNextChar === ':') {
      tokens.push({ type: TokenType.SYMBOL, value: ':=:', line });
      cursor += 3;
      continue;
    }

    // [] Dijkstra separator
    if (char === '[' && nextChar === ']') {
      tokens.push({ type: TokenType.SYMBOL, value: '[]', line });
      cursor += 2;
      continue;
    }

    // // co-oc branch separator
    if (char === '/' && nextChar === '/') {
      tokens.push({ type: TokenType.SYMBOL, value: '//', line });
      cursor += 2;
      continue;
    }

    // Two-char operators
    const twoChars = char + nextChar;
    if (['==', '!=', '<=', '>=', '<>', '<<', '>>', '++', '--', '->', ':='].includes(twoChars)) {
      tokens.push({ type: TokenType.SYMBOL, value: twoChars, line });
      cursor += 2;
      continue;
    }

    // Single symbols
    if ('+-*/=<>(){}[];,!:'.includes(char)) {
      tokens.push({ type: TokenType.SYMBOL, value: char, line });
      cursor++;
      continue;
    }

    cursor++; // unknown char, skip
  }

  tokens.push({ type: TokenType.EOF, value: '', line });
  return tokens;
}
