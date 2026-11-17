import { useRef } from 'react';
import { Check, ChevronDown, Download, FilePlus, FileText, FolderOpen, Save, Trash2 } from 'lucide-react';
import { Popover } from './Popover';
import type { Ejemplo } from '../ejemplos';
import type { Program, SavedProgram } from '../programs';

interface Props {
  readonly program: Program;
  readonly library: readonly SavedProgram[];
  readonly examples: readonly Ejemplo[];
  /** Mientras la simulacion corre no se cambia de programa. */
  readonly disabled: boolean;
  readonly onRename: (name: string) => void;
  readonly onNew: () => void;
  /** Abre un ejemplo o un programa guardado. */
  readonly onOpen: (program: Program) => void;
  readonly onOpenFile: (file: File) => void;
  readonly onDownload: () => void;
  readonly onSave: () => void;
  readonly onRemove: (program: SavedProgram) => void;
}

/**
 * Menu del programa abierto: su nombre y todo lo que se puede hacer con el como archivo
 * (nuevo, abrir y descargar un .mon, guardarlo en "Mis programas"), mas las dos listas de
 * donde abrir otro: los programas propios y los ejemplos.
 */
export function ProgramMenu({
  program, library, examples, disabled,
  onRename, onNew, onOpen, onOpenFile, onDownload, onSave, onRemove,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <>
      <Popover
        className="btn btn-programa"
        label={<><FileText size={14} /><span className="btn-programa-nombre">{program.name}</span><ChevronDown size={13} /></>}
        title="Programa abierto: nombre, archivos, Mis programas y ejemplos"
        ariaLabel={`Programa: ${program.name}`}
        disabled={disabled}
      >
        {(close) => (
          <div className="menu menu-programa">
            <label className="menu-campo">
              <span>Nombre</span>
              <input
                type="text"
                defaultValue={program.name}
                maxLength={60}
                onBlur={(e) => onRename(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              />
            </label>

            <div role="menu" aria-label="Archivo">
              <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); onNew(); }}>
                <FilePlus size={14} /> Nuevo programa
              </button>
              <button type="button" role="menuitem" className="menu-item"
                onClick={() => { close(); fileInput.current?.click(); }}>
                <FolderOpen size={14} /> Abrir un archivo .mon…
              </button>
              <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); onDownload(); }}>
                <Download size={14} /> Descargar como .mon
              </button>
              {program.id === null ? (
                <button type="button" role="menuitem" className="menu-item" onClick={onSave}>
                  <Save size={14} /> Guardar en Mis programas
                </button>
              ) : (
                <p className="menu-nota"><Check size={14} /> Está en Mis programas: los cambios se guardan solos</p>
              )}
            </div>

            <p className="menu-titulo">Mis programas</p>
            {library.length === 0 && (
              <p className="menu-vacio">
                Todavía no guardaste ninguno. Quedan en este navegador, no en una cuenta.
              </p>
            )}
            <div role="menu" aria-label="Mis programas">
              {library.map((p) => (
                <div key={p.id} className="menu-fila">
                  <button type="button" role="menuitem"
                    className={`menu-item${p.id === program.id ? ' actual' : ''}`}
                    onClick={() => { close(); onOpen({ id: p.id, name: p.name, code: p.code }); }}>
                    {p.name}
                  </button>
                  <button type="button" className="amp" onClick={() => onRemove(p)}
                    aria-label={`Borrar ${p.name} de Mis programas`} title="Borrar de Mis programas">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <p className="menu-titulo">Ejemplos</p>
            <div role="menu" aria-label="Ejemplos">
              {examples.map((e) => (
                <button key={e.id} type="button" role="menuitem" className="menu-item"
                  onClick={() => { close(); onOpen({ id: null, name: e.titulo, code: e.codigo }); }}>
                  {e.titulo}
                </button>
              ))}
            </div>
          </div>
        )}
      </Popover>
      <input
        ref={fileInput}
        type="file"
        accept=".mon,.txt,text/plain"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          // se vacia para que elegir dos veces el mismo archivo vuelva a disparar el cambio
          e.target.value = '';
          if (file) onOpenFile(file);
        }}
      />
    </>
  );
}
