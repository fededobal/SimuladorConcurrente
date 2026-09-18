import React, { useRef, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface FloatingWindowProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultX?: number;
  defaultY?: number;
  minWidth?: number;
  minHeight?: number;
  zIndex?: number;
  onFocus?: () => void;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  title,
  children,
  onClose,
  defaultWidth = 550,
  defaultHeight = 450,
  defaultX = 120,
  defaultY = 80,
  minWidth = 300,
  minHeight = 180,
  zIndex = 100,
  onFocus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  // Use refs for position/size to avoid re-renders during drag
  const posRef = useRef({ x: defaultX, y: defaultY });
  const sizeRef = useRef({ w: defaultWidth, h: defaultHeight });

  // Apply position/size directly to DOM
  const applyTransform = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.style.left = `${posRef.current.x}px`;
    containerRef.current.style.top = `${posRef.current.y}px`;
    containerRef.current.style.width = `${sizeRef.current.w}px`;
    containerRef.current.style.height = `${sizeRef.current.h}px`;
  }, []);

  useEffect(() => {
    applyTransform();
  }, [applyTransform]);

  // ── Drag ──
  const onDragMouseDown = useCallback((e: React.MouseEvent) => {
    // Ignore if clicking button
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    onFocus?.();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: posRef.current.x,
      origY: posRef.current.y,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      posRef.current = {
        x: dragState.current.origX + dx,
        y: Math.max(0, dragState.current.origY + dy),
      };
      applyTransform();
    };

    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onFocus, applyTransform]);

  // ── Resize (bottom-right corner) ──
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: sizeRef.current.w,
      origH: sizeRef.current.h,
    };

    const onMove = (ev: MouseEvent) => {
      if (!resizeState.current) return;
      const dx = ev.clientX - resizeState.current.startX;
      const dy = ev.clientY - resizeState.current.startY;
      sizeRef.current = {
        w: Math.max(minWidth, resizeState.current.origW + dx),
        h: Math.max(minHeight, resizeState.current.origH + dy),
      };
      applyTransform();
    };

    const onUp = () => {
      resizeState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [minWidth, minHeight, applyTransform]);

  return (
    <div
      ref={containerRef}
      onMouseDown={onFocus}
      style={{
        position: 'fixed',
        left: defaultX,
        top: defaultY,
        width: defaultWidth,
        height: defaultHeight,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        zIndex,
      }}
    >
      {/* Drag handle — title bar */}
      <div
        onMouseDown={onDragMouseDown}
        style={{
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {title}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '2px',
          }}
          title="Anclar al panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {children}
      </div>

      {/* Resize grip — bottom-right corner */}
      <div
        onMouseDown={onResizeMouseDown}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 18,
          height: 18,
          cursor: 'nwse-resize',
          zIndex: 10,
          background: 'transparent',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" style={{ opacity: 0.3 }}>
          <line x1="14" y1="4" x2="4" y2="14" stroke="var(--text-secondary)" strokeWidth="1.5" />
          <line x1="14" y1="8" x2="8" y2="14" stroke="var(--text-secondary)" strokeWidth="1.5" />
          <line x1="14" y1="12" x2="12" y2="14" stroke="var(--text-secondary)" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
};
