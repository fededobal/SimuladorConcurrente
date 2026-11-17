import { createHighlighter, type BundledLanguage } from 'shiki';
import { describe, expect, it } from 'vitest';
import { monitoresLanguage, monitoresLight } from '../../docs/.vitepress/monitoresLanguage';

/** Color de cada token de un fragmento, por su texto (sin espacios). */
async function colorsOf(code: string): Promise<Record<string, string | undefined>> {
  const highlighter = await createHighlighter({ langs: [monitoresLanguage], themes: [monitoresLight] });
  // los tipos de Shiki solo conocen los lenguajes que trae; el nuestro se registra arriba
  const lines = highlighter.codeToTokensBase(code, {
    lang: 'monitores' as BundledLanguage,
    theme: monitoresLight,
  });
  const colors: Record<string, string | undefined> = {};
  for (const token of lines.flat()) {
    const text = token.content.trim();
    if (text !== '') colors[text] = token.color?.toLowerCase();
  }
  highlighter.dispose();
  return colors;
}

const KEYWORD = '#2f55d4';
const SYNC = '#7b3fc4';
const TEXT = '#16191f';
const LITERAL = '#b45309';
const COMMENT = '#677080';

describe('monitoresLanguage', () => {
  it('syncAndDeclarationWordsAreKeywords', async () => {
    const colors = await colorsOf('monitor M { cond c; procedure f() { wait(c); signal_all(c); } }');
    for (const word of ['monitor', 'cond', 'procedure']) {
      expect(colors[word], word).toBe(KEYWORD);
    }
    for (const word of ['wait', 'signal_all']) {
      expect(colors[word], word).toBe(SYNC);
    }
  });

  it('namesBeforeParenthesesAreNotFunctions', async () => {
    // con la gramatica de C, `turno[i]` y `depositar(` salian en el color de las funciones
    const colors = await colorsOf('wait(turno[i]);');
    expect(Object.entries(colors).find(([text]) => text.includes('turno'))?.[1]).toBe(TEXT);
  });

  it('keywordsMatchAnyCase', async () => {
    const colors = await colorsOf('Monitor M { }\nProcess P { }');
    expect(colors.Monitor).toBe(KEYWORD);
    expect(colors.Process).toBe(KEYWORD);
  });

  it('literalsAndComments', async () => {
    const colors = await colorsOf('int x = 15; // un comentario\nwrite("hola", true);');
    expect(colors['15']).toBe(LITERAL);
    expect(colors['"hola"']).toBe(LITERAL);
    expect(colors.true).toBe(LITERAL);
    expect(colors['// un comentario']).toBe(COMMENT);
  });

  it('rangeIsTwoIntegersNotADecimal', async () => {
    const colors = await colorsOf('for (i = 1..5) skip;');
    expect(colors['1']).toBe(LITERAL);
    expect(colors['5']).toBe(LITERAL);
  });
});
