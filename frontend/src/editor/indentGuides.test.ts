import { describe, expect, it } from 'vitest';
import { activeGuideOf, indentGuidesOf, indentOf } from './indentGuides';

/** Programa de prueba: un renglon por elemento. */
const PROGRAM = [
  'monitor M {',         // 1
  '  int x;',            // 2
  '',                    // 3
  '  procedure p() {',   // 4
  '    x++;',            // 5
  '',                    // 6
  '    x--;',            // 7
  '  }',                 // 8
  '}',                   // 9
  '',                    // 10
  'process P { }',       // 11
];

describe('indentOf', () => {
  it('countsSpacesAndTabs', () => {
    expect(indentOf('    x')).toBe(4);
    expect(indentOf('\tx')).toBe(2);
    expect(indentOf(' \tx')).toBe(2);
    expect(indentOf('x')).toBe(0);
  });

  it('blankLineHasNoIndent', () => {
    expect(indentOf('')).toBeNull();
    expect(indentOf('   ')).toBeNull();
  });
});

describe('indentGuidesOf', () => {
  it('oneGuidePerLevelLeftOfTheText', () => {
    expect(indentGuidesOf(PROGRAM)).toEqual([
      { column: 0, fromLine: 2, toLine: 8 },
      { column: 2, fromLine: 5, toLine: 7 },
    ]);
  });

  it('blankLinesInsideABlockKeepTheGuide', () => {
    // el renglon 6 esta en blanco entre dos de sangria 4: la guia de la columna 2 no se corta
    const inner = indentGuidesOf(PROGRAM).find((g) => g.column === 2);
    expect(inner).toEqual({ column: 2, fromLine: 5, toLine: 7 });
  });

  it('guideDoesNotGoPastTheEndOfTheBlock', () => {
    // el renglon 10, en blanco entre '}' y 'process', no tiene sangria: no hay guia
    const guides = indentGuidesOf(PROGRAM);
    expect(guides.every((g) => g.toLine < 10)).toBe(true);
  });

  it('unitComesFromTheProgram', () => {
    const fourSpaces = ['monitor M {', '    procedure p() {', '        x++;', '    }', '}'];
    expect(indentGuidesOf(fourSpaces).map((g) => g.column)).toEqual([0, 4]);
  });

  it('flatProgramHasNoGuides', () => {
    expect(indentGuidesOf(['process P { }', '', 'process Q { }'])).toEqual([]);
  });
});

describe('activeGuideOf', () => {
  const guides = indentGuidesOf(PROGRAM);

  it('innermostGuideAcrossTheCursorLine', () => {
    expect(activeGuideOf(guides, PROGRAM, 5)).toEqual({ column: 2, fromLine: 5, toLine: 7 });
    expect(activeGuideOf(guides, PROGRAM, 2)).toEqual({ column: 0, fromLine: 2, toLine: 8 });
  });

  it('lineThatOpensABlockTakesItsGuide', () => {
    // 'procedure p() {' abre el bloque de los renglones 5 a 7
    expect(activeGuideOf(guides, PROGRAM, 4)).toEqual({ column: 2, fromLine: 5, toLine: 7 });
    expect(activeGuideOf(guides, PROGRAM, 1)).toEqual({ column: 0, fromLine: 2, toLine: 8 });
  });

  it('noGuideOutsideEveryBlock', () => {
    expect(activeGuideOf(guides, PROGRAM, 11)).toBeNull();
  });
});
