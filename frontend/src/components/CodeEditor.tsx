import { useMemo } from 'react';

const KEYWORDS = /\b(monitor|procedure|cond|process|wait|signal_all|signal|push|pop|empty|in|out|inout)\b/g;
const CONTROL = /\b(if|else|while|for|skip)\b/g;
const TYPES = /\b(int|double|boolean|text|Cola)\b/g;
const LITERALS = /\b(true|false|and|or|not)\b/g;

export interface ActiveLine {
  line: number;
  color: string;
  state: string;
  name: string;
}

interface Props {
  code: string;
  onChange: (code: string) => void;
  readOnly: boolean;
  activeLines: ActiveLine[];
  errorLine: number | null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(code: string): string {
  return escapeHtml(code)
    .replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>')
    .replace(/(&quot;[^&\n]*&quot;)/g, '<span class="tok-str">$1</span>')
    .replace(KEYWORDS, '<span class="tok-keyword">$1</span>')
    .replace(CONTROL, '<span class="tok-control">$1</span>')
    .replace(TYPES, '<span class="tok-type">$1</span>')
    .replace(LITERALS, '<span class="tok-fn">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
}

export function CodeEditor({ code, onChange, readOnly, activeLines, errorLine }: Props) {
  const lines = code.split('\n');

  const byLine = useMemo(() => {
    const m = new Map<number, ActiveLine[]>();
    for (const a of activeLines) {
      if (a.line < 1) continue;
      const list = m.get(a.line) ?? [];
      list.push(a);
      m.set(a.line, list);
    }
    return m;
  }, [activeLines]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab' || readOnly) return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart: s, selectionEnd: end, value } = ta;
    onChange(value.slice(0, s) + '  ' + value.slice(end));
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = s + 2;
    });
  };

  const syncGutter = (e: React.UIEvent<HTMLElement>) => {
    const g = e.currentTarget.closest('.editor')?.querySelector('.gutter') as HTMLElement | null;
    if (g) g.scrollTop = e.currentTarget.scrollTop;
  };

  return (
    <div className="editor">
      <div className="gutter">{lines.map((_, i) => `${i + 1}\n`).join('')}</div>
      <div className="scroll" onScroll={syncGutter}>
        {readOnly ? (
          <>
            <pre
              className="code-layer"
              style={{ position: 'relative' }}
              dangerouslySetInnerHTML={{ __html: highlight(code) + '\n' }}
            />
            {[...byLine.entries()].map(([line, procs]) => {
              const blocked = procs.every((p) => p.state === 'BLOCKED');
              return (
                <div
                  key={line}
                  className="active-line"
                  title={procs.map((p) => `${p.name} (${p.state})`).join(', ')}
                  style={{
                    top: `calc(0.75rem + ${line - 1} * 1.55em)`,
                    background: procs[0].color,
                    opacity: blocked ? 0.14 : 0.26,
                    borderLeft: `3px solid ${procs[0].color}`,
                  }}
                />
              );
            })}
          </>
        ) : (
          <textarea
            value={code}
            spellCheck={false}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onScroll={syncGutter}
            style={{ color: 'var(--text-primary)', caretColor: 'var(--text-primary)' }}
          />
        )}
        {!readOnly && errorLine != null && (
          <div
            className="active-line"
            style={{
              top: `calc(0.75rem + ${errorLine - 1} * 1.55em)`,
              background: 'var(--terminated)',
              opacity: 0.18,
            }}
          />
        )}
      </div>
    </div>
  );
}
