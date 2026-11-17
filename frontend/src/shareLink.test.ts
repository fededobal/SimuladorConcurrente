import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare, exampleIdFromHash, type SharedProgram } from './shareLink';

const PROGRAM: SharedProgram = {
  name: 'Barrera con señal',
  code: 'monitor M {\n  cond c; // ¿espera?\n}\nprocess P { write("día → ñandú"); }\n',
  seed: 48213,
  policy: 'ROUND_ROBIN',
};

describe('shareLink', () => {
  it('roundTripsCodeWithAccentsAndSymbols', () => {
    expect(decodeShare('#' + encodeShare(PROGRAM))).toEqual(PROGRAM);
  });

  it('fragmentIsUrlSafe', () => {
    // sin espacios ni caracteres que un chat pueda cortar o reescribir
    expect(encodeShare(PROGRAM)).toMatch(/^[A-Za-z0-9_\-.~%&=+*]+$/);
  });

  it('seedAndPolicyAreOptional', () => {
    const shared = decodeShare(encodeShare({ ...PROGRAM, seed: null, policy: null }));
    expect(shared?.seed).toBeNull();
    expect(shared?.policy).toBeNull();
  });

  it('hashWithoutCodeIsNotAShare', () => {
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('#seccion')).toBeNull();
    expect(decodeShare('#nombre=x')).toBeNull();
  });

  it('brokenCodeIsRejected', () => {
    expect(decodeShare('#codigo=%%%')).toBeNull();
    // bytes que no forman UTF-8 valido
    expect(decodeShare('#codigo=_w')).toBeNull();
  });

  it('invalidSeedIsIgnored', () => {
    const fragment = encodeShare({ ...PROGRAM, seed: null }) + '&semilla=abc';
    expect(decodeShare(fragment)?.seed).toBeNull();
    expect(decodeShare(fragment.replace('abc', '-3'))?.seed).toBeNull();
  });

  it('missingNameGetsTheDefault', () => {
    const fragment = encodeShare(PROGRAM).replace(/nombre=[^&]*&/, '');
    expect(decodeShare(fragment)?.name).toBe('Sin título');
  });

  it('windowsLineEndingsAreNormalized', () => {
    const shared = decodeShare(encodeShare({ ...PROGRAM, code: 'a\r\nb' }));
    expect(shared?.code).toBe('a\nb');
  });
});

describe('exampleIdFromHash', () => {
  it('readsTheExampleId', () => {
    expect(exampleIdFromHash('#ejemplo=01-buffer-un-dato')).toBe('01-buffer-un-dato');
  });

  it('otherHashesAreNotAnExample', () => {
    expect(exampleIdFromHash('')).toBeNull();
    expect(exampleIdFromHash('#codigo=abc')).toBeNull();
  });

  it('rejectsIdsThatCouldNotBeAFileName', () => {
    expect(exampleIdFromHash('#ejemplo=../../etc')).toBeNull();
    expect(exampleIdFromHash('#ejemplo=')).toBeNull();
  });
});
