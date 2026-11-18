import { describe, expect, it } from 'vitest';
import {
  constantNameError, constantValueError, nextConstantName, readConstants, writeConstants,
} from './constants';

const PROGRAM = `// Banco
// tres empleados
#define N 6
#define E 3  // empleados

monitor Banco { cond espera[N]; }
process Cliente[id: 0..N-1] { skip; }`;

describe('readConstants', () => {
  it('readsEachDefineInOrder', () => {
    expect(readConstants(PROGRAM)).toEqual([
      { name: 'N', value: '6' },
      { name: 'E', value: '3', comment: '// empleados' },
    ]);
  });

  it('ignoresMalformedLinesAndOtherCode', () => {
    expect(readConstants('#define N\n#define 5 N\nint N = 5;\n  #DEFINE M 2\r\n')).toEqual([
      { name: 'M', value: '2' },
    ]);
    expect(readConstants('')).toEqual([]);
  });
});

describe('writeConstants', () => {
  it('replacesTheBlockInPlace', () => {
    const out = writeConstants(PROGRAM, [{ name: 'N', value: '10' }, { name: 'E', value: '3', comment: '// empleados' }]);
    expect(out).toBe(PROGRAM.replace('#define N 6', '#define N 10'));
  });

  it('readsBackWhatItWrote', () => {
    const constants = [{ name: 'Clientes', value: '8' }, { name: 'P', value: '2' }];
    expect(readConstants(writeConstants(PROGRAM, constants))).toEqual(constants);
  });

  it('firstConstantGoesAfterTheHeaderComments', () => {
    const code = '// Título\n// explicación\nmonitor M { }\nprocess P { skip; }';
    expect(writeConstants(code, [{ name: 'N', value: '5' }]))
      .toBe('// Título\n// explicación\n#define N 5\n\nmonitor M { }\nprocess P { skip; }');
    expect(writeConstants('process P { skip; }', [{ name: 'N', value: '5' }]))
      .toBe('#define N 5\n\nprocess P { skip; }');
  });

  it('removingEveryConstantLeavesTheRest', () => {
    expect(writeConstants('#define N 5\nprocess P { skip; }', [])).toBe('process P { skip; }');
  });

  it('dropsMalformedDefinesSoTheProgramCompiles', () => {
    // una linea a medio escribir se reemplaza por el bloque que arma el menu
    expect(writeConstants('#define N\nprocess P { skip; }', [{ name: 'N', value: '4' }]))
      .toBe('#define N 4\nprocess P { skip; }');
  });
});

describe('constant validation', () => {
  it('namesFollowTheLanguageRules', () => {
    expect(constantNameError('N', [])).toBeNull();
    expect(constantNameError('cant_clientes', ['N'])).toBeNull();
    expect(constantNameError('', [])).not.toBeNull();
    expect(constantNameError('3N', [])).not.toBeNull();
    expect(constantNameError('a-b', [])).not.toBeNull();
    expect(constantNameError('While', [])).toBe('While es una palabra reservada');
    expect(constantNameError('N', ['M', 'N'])).toBe('Ya hay una constante N');
  });

  it('valuesAreUnsignedIntegers', () => {
    expect(constantValueError('0')).toBeNull();
    expect(constantValueError('25')).toBeNull();
    for (const bad of ['', '-1', '2.5', 'x', '1e3']) expect(constantValueError(bad), bad).not.toBeNull();
  });

  it('suggestsTheFirstFreeName', () => {
    expect(nextConstantName([])).toBe('N');
    expect(nextConstantName(['N', 'M'])).toBe('P');
    expect(nextConstantName(['N', 'M', 'P', 'C', 'K', 'L'])).toBe('N1');
  });
});
