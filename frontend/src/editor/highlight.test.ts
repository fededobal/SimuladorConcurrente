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

  it('colaIsATypeOnlyWhenItDeclares', () => {
    // la catedra usa cola como tipo (cola elibres;) y como nombre (cond cola;)
    expect(highlight('Cola c(int);')).toBe(
      '<span class="tok-type">Cola</span> c(<span class="tok-type">int</span>);');
    expect(highlight('cond cola;')).toBe('<span class="tok-decl">cond</span> cola;');
    expect(highlight('wait(cola)')).toBe('<span class="tok-sync">wait</span>(cola)');
    expect(highlight('cola mod 2')).toBe(
      'cola <span class="tok-ctrl">mod</span> <span class="tok-lit">2</span>');
    expect(highlight('Cola cola(int);')).toBe(
      '<span class="tok-type">Cola</span> cola(<span class="tok-type">int</span>);');
  });

  it('sortedQueueOrderIsAKeyword', () => {
    expect(highlight('ColaOrdenada f(int) desc;')).toBe(
      '<span class="tok-type">ColaOrdenada</span> f(<span class="tok-type">int</span>) '
      + '<span class="tok-type">desc</span>;');
  });

  it('constantsAreColoredAsNumbers', () => {
    expect(highlight('#define N 5\ncond espera[N]; int n;')).toBe(
      '<span class="tok-decl">#define</span> <span class="tok-lit">N</span> '
      + '<span class="tok-lit">5</span>\n<span class="tok-decl">cond</span> '
      + 'espera[<span class="tok-lit">N</span>]; <span class="tok-type">int</span> n;');
    // sin #define, N es un nombre cualquiera
    expect(highlight('espera[N]')).toBe('espera[N]');
  });

  it('inheritedNamesAreNotKeywords', () => {
    // 'constructor' existe en cualquier objeto: no por eso es una palabra reservada
    expect(highlight('constructor toString')).toBe('constructor toString');
  });
});
