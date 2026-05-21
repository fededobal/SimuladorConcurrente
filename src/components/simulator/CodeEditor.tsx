import { useCallback, useRef, useState } from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  activeLines?: { line: number, color: string }[];
}

const INDENT = '  '; // 2 spaces

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, activeLines }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
  }, [onChange]);

  const handleScroll = () => {
    if (textareaRef.current) {
      const st = textareaRef.current.scrollTop;
      const sl = textareaRef.current.scrollLeft;
      if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = st;
      setScrollTop(st);
      setScrollLeft(sl);
    }
  };

  const linesCount = code.split('\n').length || 1;
  const lineNumbers = Array.from({ length: linesCount }, (_, i) => i + 1);

  return (
    <div className="glass-panel panel code-editor-panel" style={{ position: 'relative' }}>
      <div className="panel-header">Código Fuente (Pseudocódigo)</div>
      <div className="panel-content editor-container" style={{ padding: 0, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        
        <div 
          ref={lineNumbersRef}
          className="line-numbers"
          style={{
            padding: '1rem 0.5rem',
            textAlign: 'right',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
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

        {/* Highlights layer */}
        <div 
          style={{
            position: 'absolute',
            top: 0, left: 40, right: 0, bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 1
          }}
        >
          <div 
            ref={highlightRef}
            style={{ 
              transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
              padding: '1rem', 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.9rem', 
              lineHeight: '1.5',
              width: 'max-content',
              minWidth: '100%'
            }}
          >
            {lineNumbers.map(n => {
              const active = activeLines?.filter(a => a.line === n) || [];
              const isHighlighted = active.length > 0;
              // If multiple threads on same line, mix colors or just pick the first.
              // For simplicity, pick the first or use a gradient. We'll pick the first for the border, and a mix for background.
              const color = isHighlighted ? active[0].color : 'transparent';
              
              return (
                <div key={n} style={{ 
                  height: '1.5em', 
                  backgroundColor: isHighlighted ? color : 'transparent',
                  opacity: isHighlighted ? 0.3 : 1,
                  borderLeft: isHighlighted ? `4px solid ${color}` : '4px solid transparent',
                  marginLeft: isHighlighted ? '-4px' : '0', // offset border
                  width: '100%'
                }} />
              );
            })}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          style={{ 
            padding: '1rem', 
            tabSize: 2, 
            flex: 1, 
            whiteSpace: 'pre', 
            overflow: 'auto',
            lineHeight: '1.5',
            position: 'relative',
            zIndex: 2,
            background: 'transparent',
            color: 'white'
          }}
        />
      </div>
    </div>
  );
};