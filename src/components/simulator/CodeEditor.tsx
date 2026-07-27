import { useCallback, useRef, useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  cursorRef?: React.MutableRefObject<{ start: number; end: number }>;
  pendingCursorRef?: React.MutableRefObject<{ start: number; end: number } | null>;
  activeLines?: { line: number, color: string, state?: string, name?: string, blockedResource?: string }[];
  onPopOut?: () => void;
}

const INDENT = '  '; // 2 spaces

const highlightSyntax = (code: string) => {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const tokenRegex = /(#.*|\/\/.*)|("[^"]*")|\b(int|bool|sem|double)\b|\b(process|if|else|fi|while|do|od|for|fa|af|co|oc|st|to|skip|await|push|pop|empty)\b|\b(P|V)\b|\b(true|false)\b|\b(\d+)\b/gi;

  html = html.replace(tokenRegex, (match, comment, str, type, keyword, func, bool, num) => {
    if (comment) return `<span style="color: var(--syntax-comment)">${comment}</span>`;
    if (str) return `<span style="color: var(--syntax-string)">${str}</span>`;
    if (type) return `<span style="color: var(--syntax-type)">${type}</span>`;
    if (keyword) return `<span style="color: var(--syntax-control)">${keyword}</span>`;
    if (func) return `<span style="color: var(--syntax-function)">${func}</span>`;
    if (bool) return `<span style="color: var(--syntax-keyword)">${bool}</span>`;
    if (num) return `<span style="color: var(--syntax-number)">${num}</span>`;
    return match;
  });

  if (html.endsWith('\n')) {
    html += '<br/>';
  }

  return html;
};

const formatPseudocode = (raw: string) => {
  let indentLevel = 0;
  const lines = raw.split('\n');
  const formatted = [];

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const line = originalLine.trim();
    if (!line) {
      formatted.push('');
      continue;
    }

    let startsWithClose = 0;
    if (line.startsWith('}') || line.startsWith(']') || line.startsWith('else')) {
      startsWithClose = 1;
    }

    const currentIndent = Math.max(0, indentLevel - startsWithClose);
    formatted.push('  '.repeat(currentIndent) + line);

    const lineWithoutComments = line.replace(/\/\/.*/, '').replace(/"[^"]*"/g, '');
    const openCount = (lineWithoutComments.match(/\{/g) || []).length + (lineWithoutComments.match(/\[/g) || []).length;
    const closeCount = (lineWithoutComments.match(/\}/g) || []).length + (lineWithoutComments.match(/\]/g) || []).length;

    indentLevel += (openCount - closeCount);
    if (indentLevel < 0) indentLevel = 0;
  }

  return formatted.join('\n');
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, onUndo, onRedo, cursorRef, pendingCursorRef, activeLines, onPopOut }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Track cursor position continuously
  const updateCursorRef = useCallback(() => {
    if (cursorRef && textareaRef.current) {
      cursorRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd
      };
    }
  }, [cursorRef]);

  // Restore cursor after undo/redo
  useEffect(() => {
    if (pendingCursorRef?.current != null && textareaRef.current) {
      const { start, end } = pendingCursorRef.current;
      const posStart = Math.min(start, code.length);
      const posEnd = Math.min(end, code.length);

      textareaRef.current.setSelectionRange(posStart, posEnd);
      pendingCursorRef.current = null;
    }
  }, [code, pendingCursorRef]);

  const isReadOnly = !!activeLines && activeLines.length > 0;

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    updateCursorRef(); // capture BEFORE native action

    // Undo: Ctrl+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      onUndo?.();
      return;
    }
    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      onRedo?.();
      return;
    }
    if (e.key !== 'Tab') return;
    e.preventDefault();

    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;

    if (start === end && !e.shiftKey) {
      const before = val.slice(0, start);
      const after = val.slice(end);
      const next = before + INDENT + after;
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + INDENT.length;
      });
      return;
    }

    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = val.indexOf('\n', end);
    const blockEnd = lineEnd === -1 ? val.length : lineEnd;
    const block = val.slice(lineStart, blockEnd);
    const lines = block.split('\n');

    let newLines: string[];
    if (e.shiftKey) {
      newLines = lines.map(line => {
        if (line.startsWith(INDENT)) return line.slice(INDENT.length);
        if (line.startsWith(' ')) return line.slice(1);
        return line;
      });
    } else {
      newLines = lines.map(line => INDENT + line);
    }

    const newBlock = newLines.join('\n');
    const next = val.slice(0, lineStart) + newBlock + val.slice(blockEnd);
    onChange(next);

    const diff = newBlock.length - block.length;
    requestAnimationFrame(() => {
      ta.selectionStart = lineStart;
      ta.selectionEnd = blockEnd + diff;
    });
  }, [onChange, onUndo, onRedo, isReadOnly, updateCursorRef]);

  const handleScroll = () => {
    if (textareaRef.current) {
      const st = textareaRef.current.scrollTop;
      const sl = textareaRef.current.scrollLeft;
      if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = st;
      setScrollTop(st);
      setScrollLeft(sl);
    }
  };

  const [toastMessage, setToastMessage] = useState<{title: string, lines: string[]} | null>(null);

  const showProcsOnLine = (line: number) => {
    if (!activeLines) return;
    const procsOnLine = activeLines.filter(act => act.line === line);
    if (procsOnLine.length > 0) {
      setToastMessage({
        title: `Procesos en línea ${line}:`,
        lines: procsOnLine.map(p => `• ${p.name} (${p.state})`)
      });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const linesCount = code.split('\n').length || 1;
  const lineNumbers = Array.from({ length: linesCount }, (_, i) => i + 1);

  return (
    <div className="glass-panel panel code-editor-panel" style={{ position: 'relative' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Código</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onChange(formatPseudocode(code))}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'var(--text-primary)',
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            Formatear código
          </button>
          {onPopOut && (
            <button
              onClick={onPopOut}
              title="Desanclar panel"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'var(--text-primary)',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <ExternalLink size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="panel-content editor-container" style={{ padding: 0, display: 'flex', position: 'relative', overflow: 'hidden' }}>

        <div
          ref={lineNumbersRef}
          className="line-numbers"
          style={{
            padding: '1rem 0.5rem',
            textAlign: 'right',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            lineHeight: '1.5',
            userSelect: 'none',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRight: '1px solid var(--glass-border)',
            overflow: 'hidden',
            minWidth: '40px'
          }}
        >
          {lineNumbers.map(n => <div key={n}>{n}</div>)}
        </div>

        {/* Highlights layer (zIndex 2, below text but above textarea to catch clicks) */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 40, right: 0, bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 2
          }}
        >
          <div
            ref={highlightRef}
            style={{
              transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
              padding: '1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              lineHeight: '1.5',
              width: 'max-content',
              minWidth: '100%'
            }}
          >
            <div style={{ position: 'relative', width: '100%', minHeight: `${lineNumbers.length * 1.5}em` }}>
              {(() => {
                const grouped = new Map<number, any[]>();
                activeLines?.forEach(act => {
                  if (!grouped.has(act.line)) grouped.set(act.line, []);
                  grouped.get(act.line)!.push(act);
                });
                return Array.from(grouped.entries()).map(([line, procs]) => {
                  // Sort by id so the key stays stable even if processes join/leave the line
                  procs.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
                  const first = procs[0];
                  const isBlocked = procs.every(p => p.state === 'BLOCKED');
                  const count = procs.length;
                  const label = count > 1 ? `${count} procesos acá` : first.name;
                  // Use first process name/id as stable key to preserve CSS transitions
                  return (
                    <div
                      key={`highlight-${first.name}`}
                      onClick={() => showProcsOnLine(line)}
                      style={{
                        position: 'absolute',
                        top: `${(line - 1) * 1.5}em`,
                        left: 0,
                        right: 0,
                        height: '1.5em',
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '1rem',
                        transition: 'top 0.35s cubic-bezier(0.25, 1, 0.5, 1)'
                      }}
                    >
                      <div style={{
                        position: 'absolute', inset: 0,
                        backgroundColor: first.color,
                        opacity: isBlocked ? 0.2 : 0.35,
                        borderLeft: `4px solid ${first.color}`,
                        marginLeft: '-4px',
                        borderRadius: '2px',
                        transition: 'background-color 0.35s ease, opacity 0.35s ease, border-color 0.35s ease',
                        zIndex: -1
                      }} />
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--bg-elevated)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        border: '1px solid var(--glass-border)',
                        zIndex: 1,
                        opacity: 0.8
                      }}>
                        {label}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Syntax Highlight layer (zIndex 3, text is visible OVER highlights) */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 40, right: 0, bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 3
          }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: highlightSyntax(code) }}
            style={{
              transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
              padding: '1rem',
              margin: 0,
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              lineHeight: '1.5',
              letterSpacing: 'normal',
              tabSize: 2,
              width: '100%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={code}
          onChange={(e) => {
            onChange(e.target.value.replace(/\r\n/g, '\n'));
            updateCursorRef();
          }}
          onClick={updateCursorRef}
          onKeyUp={updateCursorRef}
          onScroll={handleScroll}
          onSelect={updateCursorRef}
          onPaste={updateCursorRef}
          onCut={updateCursorRef}
          spellCheck={false}
          onKeyDown={(e) => {
             if (isReadOnly) return;
             handleKeyDown(e);
          }}
          readOnly={isReadOnly}
          style={{
            flex: 1,
            height: '100%',
            padding: '1rem',
            margin: 0,
            border: 'none',
            background: 'transparent',
            color: 'transparent',
            caretColor: isReadOnly ? 'transparent' : 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            lineHeight: '1.5',
            resize: 'none',
            outline: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'keep-all',
            tabSize: 2,
            zIndex: 1,
            cursor: isReadOnly ? 'default' : 'text'
          }}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#1e1e1e', // Solid background instead of transparent
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 100,
            minWidth: '220px',
            maxWidth: '300px',
            maxHeight: 'calc(100% - 40px)', // Do not exceed code editor height
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeInUp 0.3s ease'
          }}>
            <style>{`
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .toast-scroll::-webkit-scrollbar {
                width: 6px;
              }
              .toast-scroll::-webkit-scrollbar-track {
                background: transparent;
              }
              .toast-scroll::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 10px;
              }
              .toast-scroll::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
              }
            `}</style>
            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{toastMessage.title}</span>
              <button 
                onClick={() => setToastMessage(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0 4px'
                }}
              >
                ×
              </button>
            </div>
            <div className="toast-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', overflowY: 'auto', paddingRight: '4px' }}>
              {toastMessage.lines.map((line, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', lineHeight: '1.4' }}>
                  <span style={{ marginRight: '6px', color: 'var(--accent)' }}>•</span>
                  <span>{line.replace('• ', '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};