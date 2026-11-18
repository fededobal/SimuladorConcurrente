import { familyOf } from '../timeline';
import { stateDetail, type VisibleState } from '../processStates';

/** Renglon donde esta parado un proceso, con lo necesario para marcarlo en el editor. */
export interface ActiveLine {
  readonly line: number;
  readonly color: string;
  readonly state: VisibleState;
  readonly name: string;
  /** Monitor o variable condicion donde esta (ver `whereOf`), o null. */
  readonly where: string | null;
  /** Instantes que le quedan demorado por un delay, o null si no esta demorado. */
  readonly delayRemaining: number | null;
}

/**
 * Etiqueta de un renglon: uno o varios procesos que estan ahi en el mismo estado y lugar.
 * Con una familia entera dormida en la misma linea, una etiqueta "Cliente ×10" dice lo mismo
 * que diez etiquetas iguales y no tapa el codigo.
 */
export interface LineTag {
  readonly key: string;
  readonly state: VisibleState;
  /** Color del proceso, o del primero si son varios. */
  readonly color: string;
  /** "Productor", "Cliente ×10" o "12 procesos". */
  readonly title: string;
  /** "en Buffer", "dormidos en wait(c)"...; vacio si no hace falta aclarar. */
  readonly detail: string;
  readonly names: readonly string[];
  /** Instantes de delay que le quedan al unico proceso de la etiqueta, o null. */
  readonly delayRemaining: number | null;
}

/** Todo lo que se dibuja sobre un renglon con procesos. */
export interface LineMark {
  readonly line: number;
  /**
   * Nombre del proceso mas activo del renglon. Identifica a la marca de un instante al otro:
   * cuando ese proceso cambia de renglon, su franja y sus etiquetas se deslizan con el.
   */
  readonly leader: string;
  /** Estado que da el color de la franja: el del proceso mas activo del renglon. */
  readonly state: VisibleState;
  readonly color: string;
  /** Las primeras {@link MAX_TAGS} etiquetas, de la mas activa a la menos. */
  readonly tags: readonly LineTag[];
  /** Procesos del renglon que no entraron en las etiquetas visibles. */
  readonly hiddenNames: readonly string[];
}

/** Etiquetas que se muestran por renglon; el resto se resume en un "+n". */
export const MAX_TAGS = 2;

/**
 * Quita los indices de un lugar: "esperaCli[3]" y "esperaCli[7]" son la misma espera para
 * agrupar, aunque cada proceso duerma en su propia variable condicion.
 */
function withoutIndexes(where: string | null): string {
  return (where ?? '').replace(/\[[^\]]*\]/g, '[…]');
}

/** Orden de los procesos de un renglon: primero el que ejecuta, al final el que no hace nada. */
const RANK: Record<VisibleState, number> = {
  RUNNING_MONITOR: 0, RUNNING_PROCESS: 0, COMPETING: 1, WAITING: 2, DELAYED: 2, READY: 3,
  TERMINATED: 4,
};

/** true si el estado es "ejecutando" (en su codigo o dentro de un monitor). */
export function isRunning(state: VisibleState): boolean {
  return RANK[state] === 0;
}

function byActivity(a: ActiveLine, b: ActiveLine): number {
  return RANK[a.state] - RANK[b.state]
    || a.name.localeCompare(b.name, undefined, { numeric: true });
}

function titleOf(procs: readonly ActiveLine[]): string {
  if (procs.length === 1) return procs[0].name;
  const family = familyOf(procs[0].name);
  const sameFamily = procs.every((p) => familyOf(p.name) === family);
  return sameFamily ? `${family} ×${procs.length}` : `${procs.length} procesos`;
}

/** Agrupa los procesos por renglon y, dentro de cada uno, por estado y lugar. */
export function lineMarksOf(active: readonly ActiveLine[]): LineMark[] {
  const byLine = new Map<number, ActiveLine[]>();
  for (const a of active) {
    if (a.line < 1) continue;
    const list = byLine.get(a.line);
    if (list) list.push(a);
    else byLine.set(a.line, [a]);
  }

  const marks: LineMark[] = [];
  for (const [line, procs] of byLine) {
    procs.sort(byActivity);
    const groups = new Map<string, ActiveLine[]>();
    for (const p of procs) {
      const key = `${p.state}|${withoutIndexes(p.where)}`;
      const group = groups.get(key);
      if (group) group.push(p);
      else groups.set(key, [p]);
    }
    const tags = [...groups].map(([key, group]): LineTag => {
      const sameWhere = group.every((p) => p.where === group[0].where);
      const where = sameWhere ? group[0].where : withoutIndexes(group[0].where);
      return {
        key,
        state: group[0].state,
        color: group[0].color,
        title: titleOf(group),
        detail: stateDetail(group[0].state, where, group.length > 1),
        names: group.map((p) => p.name),
        delayRemaining: group.length === 1 ? group[0].delayRemaining : null,
      };
    });
    marks.push({
      line,
      leader: procs[0].name,
      state: procs[0].state,
      color: procs[0].color,
      tags: tags.slice(0, MAX_TAGS),
      hiddenNames: tags.slice(MAX_TAGS).flatMap((t) => t.names),
    });
  }
  return marks.sort((a, b) => a.line - b.line);
}

/** Chip del margen: un proceso y el lugar que le toca entre los de su renglon. */
export interface GutterChip {
  readonly name: string;
  readonly color: string;
  readonly line: number;
  readonly state: VisibleState;
  /** Posicion entre los procesos del mismo renglon (0 el mas activo). */
  readonly slot: number;
}

/** Un chip por proceso; el `slot` permite encimar los que comparten renglon. */
export function gutterChipsOf(active: readonly ActiveLine[]): GutterChip[] {
  const sorted = active.filter((a) => a.line >= 1).sort(byActivity);
  const used = new Map<number, number>();
  return sorted.map((a) => {
    const slot = used.get(a.line) ?? 0;
    used.set(a.line, slot + 1);
    return { name: a.name, color: a.color, line: a.line, state: a.state, slot };
  });
}
