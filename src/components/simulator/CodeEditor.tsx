import { useCallback, useRef, useState, useEffect } from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  cursorRef?: React.MutableRefObject<{ start: number; end: number }>;
  pendingCursorRef?: React.MutableRefObject<{ start: number; end: number } | null>;
  activeLines?: { line: number, color: string }[];
}

const INDENT = '  '; // 2 spaces

const highlightSyntax = (code: string) => {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  const tokenRegex = /(#[^\n]*)|("[^"]*")|\b(int|bool|sem)\b|\b(process|if|else|fi|while|do|od|for|fa|af|co|oc|st|to|skip|await)\b|\b(P|V)\b|\b(true|false)\b|\b(\d+)\b/g;
  
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

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, onUndo, onRedo, cursorRef, pendingCursorRef, activeLines }) => {
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Código Fuente (Pseudocódigo)</span>
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
              fontSize: '14px', 
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

        {/* Syntax Highlight layer */}
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
          onChange={(e) => onChange(e.target.value.replace(/\r\n/g, '\n'))}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursorRef}
          onScroll={handleScroll}
          onSelect={updateCursorRef}
          onClick={updateCursorRef}
          onPaste={updateCursorRef}
          onCut={updateCursorRef}
          spellCheck={false}
          style={{ 
            padding: '1rem', 
            margin: 0,
            border: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            lineHeight: '1.5',
            letterSpacing: 'normal',
            tabSize: 2, 
            flex: 1, 
            width: '100%',
            whiteSpace: 'pre-wrap', 
            wordBreak: 'keep-all',
            overflow: 'auto',
            position: 'relative',
            zIndex: 2,
            background: 'transparent',
            color: 'transparent',
            caretColor: 'var(--text-primary)'
          }}
        />
      </div>
    </div>
  );
};