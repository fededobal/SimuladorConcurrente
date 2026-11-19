import { describe, expect, it } from 'vitest';
import { updatedExample } from './exampleUpdates';
import type { Program } from './programs';

const OLD = `// Banco
// la version vieja
#define N 6

monitor Banco { cond espera[N]; }
process Cliente[id: 0..N-1] { skip; }
`;

const NEW = `// Banco
// la version nueva, que termina con cualquier N
#define N 6

monitor Banco { cond espera[N]; int faltan = N; }
process Cliente[id: 0..N-1] { skip; }
`;

const previous = [{ id: 'banco', codigo: OLD }];
const examples = [{ id: 'banco', codigo: NEW }, { id: 'otro', codigo: '// Otro\nprocess P { skip; }\n' }];

function draft(code: string, id: string | null = null): Program {
  return { id, name: 'Banco', code };
}

describe('updatedExample', () => {
  it('untouchedCopyOfAnOldVersionBecomesTheCurrentExample', () => {
    expect(updatedExample(draft(OLD), previous, examples)).toEqual({ id: null, name: 'Banco', code: NEW });
  });

  it('keepsTheConstantValuesTheStudentHadChosen', () => {
    const updated = updatedExample(draft(OLD.replace('#define N 6', '#define N 3')), previous, examples);
    expect(updated?.code).toBe(NEW.replace('#define N 6', '#define N 3'));
  });

  it('ignoresTrailingSpacesAndBlankLinesAtTheEnd', () => {
    const edited = `${OLD.replace('monitor Banco { cond espera[N]; }', 'monitor Banco { cond espera[N]; }  ')}\n\n`;
    expect(updatedExample(draft(edited), previous, examples)?.code).toBe(NEW);
  });

  it('aProgramTheStudentEditedIsLeftAlone', () => {
    expect(updatedExample(draft(OLD.replace('skip;', 'skip; skip;')), previous, examples)).toBeNull();
  });

  it('theCurrentExampleIsLeftAlone', () => {
    expect(updatedExample(draft(NEW), previous, examples)).toBeNull();
  });

  it('aProgramSavedInTheLibraryIsNeverReplaced', () => {
    expect(updatedExample(draft(OLD, 'p1'), previous, examples)).toBeNull();
  });

  it('anOldVersionOfAnExampleThatNoLongerExistsIsLeftAlone', () => {
    expect(updatedExample(draft(OLD), [{ id: 'borrado', codigo: OLD }], examples)).toBeNull();
  });
});
