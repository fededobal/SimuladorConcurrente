import { describe, expect, it } from 'vitest';
import { caretPlaceOf } from './caret';

describe('caretPlaceOf', () => {
  const CODE = 'monitor M {\n  int x;\n\tx++;\n}';

  it('lineAndColumnFromOne', () => {
    expect(caretPlaceOf(CODE, 0, 0)).toEqual({ line: 1, column: 0 });
    expect(caretPlaceOf(CODE, 14, 14)).toEqual({ line: 2, column: 2 });
  });

  it('tabAdvancesToTheNextStop', () => {
    // despues del tab del renglon 3 el cursor esta en la columna 2, no en la 1
    const afterTab = CODE.indexOf('\t') + 1;
    expect(caretPlaceOf(CODE, afterTab, afterTab)).toEqual({ line: 3, column: 2 });
  });

  it('endOfTheText', () => {
    expect(caretPlaceOf(CODE, CODE.length, CODE.length)).toEqual({ line: 4, column: 1 });
  });

  it('noCaretWithASelection', () => {
    expect(caretPlaceOf(CODE, 0, 5)).toBeNull();
  });
});
