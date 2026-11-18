import { useState } from 'react';
import { Hash, Plus, Trash2 } from 'lucide-react';
import { Popover } from './Popover';
import {
  constantNameError, constantValueError, nextConstantName, readConstants, writeConstants,
  type ProgramConstant,
} from '../constants';
import s from './ConstantsMenu.module.css';

interface Props {
  readonly code: string;
  readonly onChange: (code: string) => void;
  /** Mientras la simulacion corre el programa no se edita. */
  readonly disabled: boolean;
}

/**
 * Menu de las constantes del programa (la N de la catedra). Edita las lineas "#define" del
 * principio del codigo sin que haga falta escribirlas a mano; lo que se guarda y se comparte
 * sigue siendo el texto del programa.
 */
export function ConstantsMenu({ code, onChange, disabled }: Props) {
  const count = readConstants(code).length;
  return (
    <Popover
      className="btn btn-plano btn-chico"
      align="right"
      label={<><Hash size={13} /> Constantes{count > 0 && <span className={s.count}>{count}</span>}</>}
      title="Constantes del programa (#define): cantidades como N, que el compilador reemplaza por su número"
      disabled={disabled}
    >
      {() => <ConstantsPanel code={code} onChange={onChange} />}
    </Popover>
  );
}

/** Motivo por el que una fila no se puede guardar, o null si esta bien. */
function rowError(rows: readonly ProgramConstant[], i: number): string | null {
  const others = rows.filter((_, k) => k !== i).map((r) => r.name);
  return constantNameError(rows[i].name, others) ?? constantValueError(rows[i].value);
}

/**
 * El contenido del menu. Arranca con las constantes que tiene el programa al abrirse y
 * escribe en el codigo cada cambio valido; una fila a medio escribir se queda en el menu,
 * con su aviso, hasta que se completa.
 */
function ConstantsPanel({ code, onChange }: Pick<Props, 'code' | 'onChange'>) {
  const [rows, setRows] = useState<readonly ProgramConstant[]>(() => readConstants(code));

  const apply = (next: readonly ProgramConstant[]) => {
    setRows(next);
    if (next.every((_, i) => rowError(next, i) === null)) onChange(writeConstants(code, next));
  };
  const edit = (i: number, change: Partial<ProgramConstant>) =>
    apply(rows.map((r, k) => (k === i ? { ...r, ...change } : r)));

  return (
    <div className={`menu ${s.menu}`}>
      <p className="menu-titulo">Constantes del programa</p>
      <p className={s.help}>
        Cantidades fijas, como la <code>N</code> de los enunciados. No son variables: el compilador
        pone el número donde aparece el nombre. Se guardan en el código como <code>#define N 5</code>.
      </p>
      {rows.length === 0 && <p className="menu-vacio">Este programa no tiene constantes.</p>}
      <ul className={s.rows}>
        {rows.map((r, i) => {
          const error = rowError(rows, i);
          return (
            <li key={i}>
              <div className={s.row}>
                <input className={s.name} type="text" value={r.name} maxLength={24} spellCheck={false}
                  aria-label={`Nombre de la constante ${i + 1}`} aria-invalid={error !== null}
                  onChange={(e) => edit(i, { name: e.target.value.trim() })} />
                <span aria-hidden="true">=</span>
                <input className={s.value} type="text" inputMode="numeric" value={r.value} maxLength={9}
                  aria-label={`Valor de ${r.name || `la constante ${i + 1}`}`} aria-invalid={error !== null}
                  onChange={(e) => edit(i, { value: e.target.value.trim() })} />
                <button type="button" className="btn btn-icono btn-plano btn-chico"
                  onClick={() => apply(rows.filter((_, k) => k !== i))}
                  aria-label={`Quitar la constante ${r.name}`} title="Quitar la constante">
                  <Trash2 size={13} />
                </button>
              </div>
              {error && <p className={s.error} role="alert">{error}</p>}
            </li>
          );
        })}
      </ul>
      <button type="button" className="menu-item"
        onClick={() => apply([...rows, { name: nextConstantName(rows.map((r) => r.name)), value: '5' }])}>
        <Plus size={14} /> Agregar una constante
      </button>
    </div>
  );
}
