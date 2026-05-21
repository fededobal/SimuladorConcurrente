import { useCallback, useRef, useState, useEffect } from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
}

const INDENT = '  '; // 2 spaces

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();

    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;

    if (start === end && !e.shiftKey) {
      // No selection, plain Tab: insert 2 spaces at cursor
      const before = val.slice(0, start);
      const after = val.slice(end);
      const next = before + INDENT + after;
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + INDENT.length;
      });
      return;
    }

    // Selection or Shift+Tab: indent/dedent selected lines
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = val.indexOf('\n', end);
    const blockEnd = lineEnd === -1 ? val.length : lineEnd;
    const block = val.slice(lineStart, blockEnd);
    const lines = block.split('\n');

    let newLines: string[];
    if (e.shiftKey) {
      // Dedent: remove up to 2 leading spaces per line
      newLines = lines.map(line => {
        if (line.startsWith(INDENT)) return line.slice(INDENT.length);
        if (line.startsWith(' ')) return line.slice(1);
        return line;
      });
    } else {
      // Indent: add 2 spaces per line
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

  // Synchronize scrolling between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Calculate number of lines
  const linesCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: linesCount }, (_, i) => i + 1);

  return (
    <div className="glass-panel panel code-editor-panel">
      <div className="panel-header">Código</div>
      <div className="panel-content editor-container" style={{ padding: 0, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        
        {/* Line Numbers Container */}
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
            overflow: 'hidden', // Hide scrollbar for line numbers
            minWidth: '40px'
          }}
        >
          {lineNumbers.map(n => (
            <div key={n}>{n}</div>
          ))}
        </div>

        {/* Textarea */}
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
            whiteSpace: 'pre', // Important to match line heights exactly
            overflow: 'auto',
            lineHeight: '1.5'
          }}
        />
      </div>
    </div>
  );
};