import {
  BookOpen, Gauge, Link2, Moon, Pause, Play, RotateCcw, Shuffle, SkipForward, Square, Sun,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { SelectMenu, type SelectOption } from './SelectMenu';
import { StepMenu } from './StepMenu';
import type { ProcessView, SchedulingPolicy } from '../types';
import s from './TopBar.module.css';

/** Tono del estado: decide el color de la pildora (ademas del texto, que siempre esta). */
export type StatusTone = 'idle' | 'run' | 'pause' | 'ok' | 'bad';

const SPEED_OPTIONS: readonly SelectOption<number>[] = [
  { value: 1200, label: 'Lento', hint: 'Un instante cada 1,2 segundos' },
  { value: 600, label: 'Normal', hint: 'Un instante cada 0,6 segundos' },
  { value: 300, label: 'Rápido', hint: 'Un instante cada 0,3 segundos' },
  { value: 120, label: 'Muy rápido', hint: 'Un instante cada 0,12 segundos' },
];

const POLICY_OPTIONS: readonly SelectOption<SchedulingPolicy>[] = [
  { value: 'RANDOM', label: 'Al azar', hint: 'En cada instante avanza un subconjunto aleatorio de los procesos listos' },
  { value: 'ROUND_ROBIN', label: 'En ronda', hint: 'En cada instante avanzan todos los procesos listos, por turno' },
];

interface Props {
  /** El menu del programa abierto (lo arma App, que conoce los programas). */
  readonly programMenu: ReactNode;
  readonly running: boolean;
  /** true si hay una simulacion que se puede detener. */
  readonly active: boolean;
  readonly canReplay: boolean;
  readonly seed: number | null;
  readonly processes: readonly ProcessView[];
  readonly speed: number;
  readonly policy: SchedulingPolicy;
  readonly statusText: string;
  readonly statusTone: StatusTone;
  readonly instant: number;
  readonly darkTheme: boolean;
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onStep: (processId?: number) => void;
  readonly onPrepare: () => void;
  readonly onStop: () => void;
  readonly onReplay: () => void;
  readonly onSpeed: (speed: number) => void;
  readonly onPolicy: (policy: SchedulingPolicy) => void;
  readonly onShare: () => void;
  readonly onToggleTheme: () => void;
}

/**
 * Barra superior. De izquierda a derecha: la marca, el programa abierto, los controles de
 * ejecucion en un grupo (Ejecutar, Paso, Detener, Repetir), la velocidad y los turnos como
 * menus compactos y, a la derecha, el estado con el instante, que nunca se sale de la vista.
 */
export function TopBar(p: Props) {
  const otherTheme = p.darkTheme ? 'claro' : 'oscuro';
  return (
    <header className={s.bar}>
      <div className={s.brand}>
        <Logo />
        <span className={s.brandName}>Simulador de Monitores</span>
      </div>

      {p.programMenu}

      <div className={s.run} role="group" aria-label="Ejecución">
        {p.running ? (
          <button className="btn btn-main" onClick={p.onPause} title="Pausar la simulación (F5)">
            <Pause size={14} /> Pausar <kbd>F5</kbd>
          </button>
        ) : (
          <button className="btn btn-main" onClick={p.onPlay}
            title="Ejecutar la simulación: avanza sola, un instante por vez (F5)">
            <Play size={14} /> Ejecutar <kbd>F5</kbd>
          </button>
        )}
        <button className="btn" onClick={() => p.onStep()} disabled={p.running}
          title="Avanzar un solo instante (F10)">
          <SkipForward size={14} /> Paso
        </button>
        <StepMenu className={`btn ${s.caret}`} processes={p.processes} disabled={p.running}
          onOpen={p.onPrepare} onStep={p.onStep} />
        <span className={s.sep} aria-hidden="true" />
        <button className="btn btn-icono" onClick={p.onStop} disabled={!p.active}
          aria-label="Detener" title="Detener y volver al principio del programa (Shift+F5)">
          <Square size={13} />
        </button>
        <button className="btn btn-icono" onClick={p.onReplay} disabled={!p.canReplay}
          aria-label="Repetir la ejecución con la misma semilla"
          title={p.seed === null ? 'Repetir: todavía no hay una ejecución para repetir'
            : `Repetir la misma ejecución desde el instante 0 (semilla ${p.seed})`}>
          <RotateCcw size={14} />
        </button>
      </div>

      <SelectMenu name="Velocidad" title="Cuánto dura cada instante en pantalla"
        icon={<Gauge size={14} />} value={p.speed} options={SPEED_OPTIONS} onChange={p.onSpeed} />
      <SelectMenu name="Turnos" title="Qué procesos avanzan en cada instante"
        icon={<Shuffle size={14} />} value={p.policy} options={POLICY_OPTIONS} onChange={p.onPolicy} />

      <div className={s.spacer} />

      {/* aria-live: un lector de pantalla anuncia el cambio de estado (pausa, fin, interbloqueo) */}
      <div className={`${s.status} ${s[`${p.statusTone}-tone`] ?? ''}`}>
        <span className={s.statusDot} aria-hidden="true" />
        <span className={s.statusText} role="status" aria-live="polite">{p.statusText}</span>
        <span className={s.statusLabel}>instante</span>
        <span className={s.instant}>{p.instant}</span>
      </div>

      <button className="btn btn-icono btn-plano" onClick={p.onShare}
        aria-label="Copiar un enlace para compartir este programa"
        title="Copiar un enlace que abre este programa (con la semilla de la última ejecución)">
        <Link2 size={15} />
      </button>
      {/* la guia se publica junto con la aplicacion, bajo /docs/ */}
      <a className="btn btn-plano" href="/docs/" title="Guía: lenguaje, ejecución y uso del simulador">
        <BookOpen size={15} /> Guía
      </a>
      {/* el icono muestra el tema al que se pasa, no el actual */}
      <button className="btn btn-icono btn-plano" onClick={p.onToggleTheme}
        aria-label={`Pasar al tema ${otherTheme}`} title={`Pasar al tema ${otherTheme}`}>
        {p.darkTheme ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  );
}
