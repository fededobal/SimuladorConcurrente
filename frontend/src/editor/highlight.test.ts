import { describe, expect, it } from 'vitest';
import { highlight } from './highlight';

describe('highlight', () => {
  it('keywordsGetTheirClass', () => {
    expect(highlight('monitor M')).toBe('<span class="tok-decl">monitor</span> M');
    expect(highlight('wait(c)')).toBe('<span class="tok-sync">wait</span>(c)');
  });

  it('keywordsAreCaseInsensitive', () => {
    // el lexer del nucleo acepta las palabras reservadas con cualquier mayuscula
    expect(highlight('ColaOrdenada')).toBe('<span class="tok-type">ColaOrdenada</span>');
  });

  it('commentHidesKeywords', () => {
    expect(highlight('// wait')).toBe('<span class="tok-comment">// wait</span>');
    expect(highlight('/* monitor\nwait */ x'))
      .toBe('<span class="tok-comment">/* monitor\nwait */</span> x');
  });

  it('stringHidesCommentStart', () => {
    expect(highlight('"a // b"')).toBe('<span class="tok-lit">"a // b"</span>');
  });

  it('numbersWithDecimals', () => {
    expect(highlight('1.5')).toBe('<span class="tok-lit">1.5</span>');
    // el rango de un for no es un decimal
    expect(highlight('1..5')).toBe('<span class="tok-lit">1</span>..<span class="tok-lit">5</span>');
  });

  it('escapesHtml', () => {
    expect(highlight('a < b && c')).toBe('a &lt; b &amp;&amp; c');
  });

  it('inheritedNamesAreNotKeywords', () => {
    // 'constructor' existe en cualquier objeto: no por eso es una palabra reservada
    expect(highlight('constructor toString')).toBe('constructor toString');
  });
});
