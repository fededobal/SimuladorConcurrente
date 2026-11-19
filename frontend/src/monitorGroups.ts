import type { MonitorView } from './types';

// Como se agrupan los monitores en el panel: un monitor suelto va solo, y los de un vector
// (`monitor Escritorio[id: 0..2]`) van juntos en un panel con un selector. Con cien
// escritorios, una tarjeta debajo de la otra obligaba a bajar mucho para encontrar uno.

/** Un monitor suelto, o todos los monitores de un vector. */
export interface MonitorGroup {
  /** Nombre del monitor; en un vector, el nombre sin el indice ("Escritorio"). */
  readonly name: string;
  /** true si son los monitores de un vector, aunque tenga un solo elemento. */
  readonly isArray: boolean;
  /** Los monitores del grupo, en el orden en que los informa el motor (por indice). */
  readonly monitors: readonly MonitorView[];
}

/** El nombre de un elemento de un vector de monitores: "Escritorio[2]". */
const ELEMENT = /^(.+)\[(-?\d+)\]$/;

/** Nombre del vector al que pertenece ese monitor, o null si es un monitor suelto. */
export function arrayNameOf(monitorName: string): string | null {
  return ELEMENT.exec(monitorName)?.[1] ?? null;
}

/**
 * Los monitores agrupados, en el orden en que aparece cada grupo: los sueltos de a uno y
 * los de un mismo vector juntos.
 */
export function groupMonitors(monitors: readonly MonitorView[]): MonitorGroup[] {
  const groups: { name: string; isArray: boolean; monitors: MonitorView[] }[] = [];
  const arrays = new Map<string, MonitorView[]>();
  for (const m of monitors) {
    const array = arrayNameOf(m.name);
    if (array === null) {
      groups.push({ name: m.name, isArray: false, monitors: [m] });
      continue;
    }
    const members = arrays.get(array);
    if (members) {
      members.push(m);
    } else {
      const first = [m];
      arrays.set(array, first);
      groups.push({ name: array, isArray: true, monitors: first });
    }
  }
  return groups;
}

/** Como se escribe el vector con su rango de indices: "Escritorio[0..2]". */
export function arrayLabel(group: MonitorGroup): string {
  const indexOf = (m: MonitorView | undefined) => (m ? ELEMENT.exec(m.name)?.[2] : undefined);
  const first = indexOf(group.monitors[0]);
  const last = indexOf(group.monitors[group.monitors.length - 1]);
  if (first === undefined || last === undefined) return group.name;
  return first === last ? `${group.name}[${first}]` : `${group.name}[${first}..${last}]`;
}

/**
 * Uso de un monitor: cuantos procesos tiene entre las tres zonas del dibujo (compitiendo
 * por entrar, ejecutando y bloqueados en alguna variable condicion).
 */
export function usageOf(m: MonitorView): number {
  const blocked = m.conds.reduce((n, c) => n + c.queue.length, 0);
  return m.entryQueue.length + (m.lockOwner ? 1 : 0) + blocked;
}

/**
 * Los monitores del mas usado al menos usado. Entre dos con el mismo uso se conserva el
 * orden que traian, asi un vector sin actividad queda ordenado por indice.
 */
export function byUsage(monitors: readonly MonitorView[]): MonitorView[] {
  return monitors
    .map((m, index) => ({ m, index, usage: usageOf(m) }))
    .sort((a, b) => b.usage - a.usage || a.index - b.index)
    .map((x) => x.m);
}

/** El uso en palabras: "sin procesos", "1 proceso", "4 procesos". */
export function usageText(usage: number): string {
  if (usage === 0) return 'sin procesos';
  return usage === 1 ? '1 proceso' : `${usage} procesos`;
}
