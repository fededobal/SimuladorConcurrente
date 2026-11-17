import type { LanguageRegistration, ThemeRegistration } from 'shiki';
import { KEYWORDS, type TokenClass } from '../../src/editor/highlight';

// Coloreado de los ejemplos de la documentacion con el lenguaje del simulador. Antes los
// bloques se marcaban como C: `while` salia como en C, pero `wait`, `cond` o `process` no
// eran palabras reservadas y un nombre seguido de parentesis se pintaba como funcion.
//
// La gramatica se arma con la misma tabla de palabras que usa el editor (highlight.ts), y
// los dos temas usan los colores del editor (--tok-* de index.css): un ejemplo se ve igual
// en la guia y en el simulador.

/** Scope de TextMate de cada clase de token del editor. */
const SCOPE: Record<TokenClass, string> = {
  'tok-decl': 'keyword.declaration.monitores',
  'tok-sync': 'keyword.sync.monitores',
  'tok-ctrl': 'keyword.control.monitores',
  'tok-type': 'storage.type.monitores',
  'tok-lit': 'constant.language.monitores',
  'tok-comment': 'comment.monitores',
};

/** Una regla por clase: todas sus palabras, con cualquier combinacion de mayusculas. */
function keywordPatterns(): { name: string; match: string }[] {
  const byClass = new Map<TokenClass, string[]>();
  for (const [word, cls] of Object.entries(KEYWORDS)) {
    byClass.set(cls, [...(byClass.get(cls) ?? []), word]);
  }
  return [...byClass].map(([cls, words]) => ({
    name: SCOPE[cls],
    // las mas largas primero: signal_all antes que signal
    match: `(?i)\\b(${words.sort((a, b) => b.length - a.length).join('|')})\\b`,
  }));
}

/** Gramatica del lenguaje de monitores para Shiki (bloques ```monitores). */
export const monitoresLanguage: LanguageRegistration = {
  name: 'monitores',
  scopeName: 'source.monitores',
  aliases: ['mon'],
  repository: {},
  patterns: [
    { name: 'comment.line.double-slash.monitores', match: '//.*$' },
    { name: 'comment.block.monitores', begin: '/\\*', end: '\\*/' },
    // una cadena termina en la comilla o al final del renglon, como en el lexer
    { name: 'string.quoted.double.monitores', begin: '"', end: '"|$' },
    // "1..5" son dos enteros y un rango, no un decimal
    { name: 'constant.numeric.monitores', match: '\\b\\d+(\\.\\d+)?\\b' },
    ...keywordPatterns(),
  ],
};

/** Colores de un tema: los de las variables --tok-* del simulador. */
interface Palette {
  readonly type: 'light' | 'dark';
  readonly background: string;
  readonly text: string;
  readonly comment: string;
  readonly keyword: string;
  readonly typeName: string;
  readonly literal: string;
}

function themeOf(name: string, c: Palette): ThemeRegistration {
  return {
    name,
    type: c.type,
    colors: { 'editor.background': c.background, 'editor.foreground': c.text },
    tokenColors: [
      { scope: ['comment'], settings: { foreground: c.comment, fontStyle: 'italic' } },
      // declaraciones y sincronizacion en el acento y en negrita, como en el editor
      {
        scope: ['keyword.declaration', 'keyword.sync', 'entity.name.tag', 'support.function'],
        settings: { foreground: c.keyword, fontStyle: 'bold' },
      },
      { scope: ['keyword.control', 'keyword.operator'], settings: { foreground: c.text } },
      { scope: ['storage.type', 'storage.modifier'], settings: { foreground: c.typeName } },
      {
        scope: ['string', 'constant.numeric', 'constant.language', 'constant.character'],
        settings: { foreground: c.literal },
      },
      // los otros lenguajes de la guia (bash, ebnf): palabras clave genericas en el acento
      { scope: ['keyword', 'entity.name.function', 'variable.other.rule'], settings: { foreground: c.keyword } },
    ],
  };
}

/** Tema claro de los bloques de codigo; mismos valores que :root en index.css. */
export const monitoresLight = themeOf('monitores-claro', {
  type: 'light',
  background: '#f5f7fa',
  text: '#1f2933',
  comment: '#677080',
  keyword: '#2456a4',
  typeName: '#5f6b7a',
  literal: '#8a5a1f',
});

/** Tema oscuro; mismos valores que :root[data-theme="dark"] en index.css. */
export const monitoresDark = themeOf('monitores-oscuro', {
  type: 'dark',
  background: '#1e232a',
  text: '#dde3ea',
  comment: '#7f8996',
  keyword: '#8fb0e6',
  typeName: '#95a0ad',
  literal: '#d0a066',
});
