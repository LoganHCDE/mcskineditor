import { useEffect, useCallback, useRef, useState } from 'react';
import { useSkinStore, type Tool } from '../store/useSkinStore';
import ColorPicker from './ColorPicker';
import ResetConfirmModal from './ResetConfirmModal';

const tools: { id: Tool; label: string; shortcut: string }[] = [
  { id: 'pencil', label: 'Pencil', shortcut: 'P' },
  { id: 'eraser', label: 'Eraser', shortcut: 'E' },
  { id: 'fill', label: 'Fill', shortcut: 'F' },
  { id: 'eyedropper', label: 'Pick', shortcut: 'I' },
];

function ToolIcon({ id }: { id: Tool }) {
  const size = 18;
  const stroke = "currentColor";
  switch (id) {
    case 'pencil':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      );
    case 'eraser':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
          <path d="M22 21H7" />
          <path d="m5 11 9 9" />
        </svg>
      );
    case 'fill':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
          <path d="m5 2 5 5" />
          <path d="M2 13h15" />
          <path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" />
        </svg>
      );
    case 'eyedropper':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m2 22 1-1h3l9-9" />
          <path d="M3 21v-3l9-9" />
          <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9" />
          <path d="m15 6 3 3" />
        </svg>
      );
  }
}

export default function Toolbar() {
  const tool = useSkinStore((s) => s.tool);
  const setTool = useSkinStore((s) => s.setTool);
  const toggleGrid = useSkinStore((s) => s.toggleGrid);
  const showBodyPartOutlines = useSkinStore((s) => s.showBodyPartOutlines);
  const toggleBodyPartOutlines = useSkinStore((s) => s.toggleBodyPartOutlines);
  const showExternalBodyPartOutlines = useSkinStore((s) => s.showExternalBodyPartOutlines);
  const toggleExternalBodyPartOutlines = useSkinStore((s) => s.toggleExternalBodyPartOutlines);
  const mirrorMode = useSkinStore((s) => s.mirrorMode);
  const toggleMirrorMode = useSkinStore((s) => s.toggleMirrorMode);
  const undo = useSkinStore((s) => s.undo);
  const redo = useSkinStore((s) => s.redo);
  const resetSkin = useSkinStore((s) => s.resetSkin);
  const isDefaultSkin = useSkinStore((s) => s.isDefaultSkin);
  const color = useSkinStore((s) => s.color);
  const alpha = useSkinStore((s) => s.alpha);
  const editorMode = useSkinStore((s) => s.editorMode);
  const setEditorMode = useSkinStore((s) => s.setEditorMode);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const colorBtnRef = useRef<HTMLButtonElement>(null);

  const handleReset = useCallback(() => {
    if (isDefaultSkin) {
      resetSkin();
    } else {
      setShowResetModal(true);
    }
  }, [isDefaultSkin, resetSkin]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); }
        if (e.key === 'y') { e.preventDefault(); redo(); }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'p') setTool('pencil');
      if (key === 'e') setTool('eraser');
      if (key === 'f') setTool('fill');
      if (key === 'i') setTool('eyedropper');
      if (key === 'g') toggleGrid();
      if (key === 'm') toggleMirrorMode();
      if (key === 'c') setShowColorPicker((v) => !v);
      if (key === 'tab') {
        e.preventDefault();
        setEditorMode(editorMode === '2d' ? '3d' : '2d');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, undo, redo, toggleGrid, toggleMirrorMode, setShowColorPicker, editorMode, setEditorMode]);

  const btnBase = "relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 group";
  const btnActive = "bg-[var(--accent)] text-[var(--bg-deep)] shadow-md shadow-[var(--accent-glow)] glow-active";
  const btnInactive = "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-light)]";

  const toggleBase = "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200";
  const toggleActive = "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30";
  const toggleInactive = "bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] border border-transparent";

  return (
    <div className="noise-bg flex flex-col gap-1 p-2 bg-[var(--bg-secondary)] border-r border-[var(--border)] w-[56px] items-center shrink-0 relative z-40">
      <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-bold mb-1 relative z-10">
        Draw
      </div>

      <div className="flex flex-col gap-1 relative z-10">
        {tools.map((t) => (
          <div key={t.id} className="relative">
            <button
              onClick={() => setTool(t.id)}
              className={`${btnBase} ${tool === t.id ? btnActive : btnInactive}`}
              title={`${t.label} (${t.shortcut})`}
            >
              <ToolIcon id={t.id} />
            </button>
          </div>
        ))}
      </div>

      <div className="w-6 h-px bg-[var(--border)] my-1.5 relative z-10" />

      <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-bold mb-1 relative z-10">
        Edit
      </div>

      <div className="flex flex-col gap-1 relative z-10">
        <button
          onClick={undo}
          className={`${btnBase} ${btnInactive}`}
          title="Undo (Ctrl+Z)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
        <button
          onClick={redo}
          className={`${btnBase} ${btnInactive}`}
          title="Redo (Ctrl+Y)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </button>
      </div>

      <div className="w-6 h-px bg-[var(--border)] my-1.5 relative z-10" />

      <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-bold mb-1 relative z-10">
        View
      </div>

      <div className="flex flex-col gap-1 relative z-10">
        <button
          onClick={toggleBodyPartOutlines}
          className={`${toggleBase} ${showBodyPartOutlines ? toggleActive : toggleInactive}`}
          title="Body Part Outlines"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
            <rect x="8" y="8" width="8" height="8" rx="1" />
          </svg>
        </button>

        <button
          onClick={toggleExternalBodyPartOutlines}
          className={`${toggleBase} ${showExternalBodyPartOutlines ? toggleActive : toggleInactive}`}
          title="External Body Part Outlines"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
            <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" strokeOpacity="0.6" />
          </svg>
        </button>

        <button
          onClick={toggleMirrorMode}
          className={`${toggleBase} ${mirrorMode ? toggleActive : toggleInactive}`}
          title="Mirror Mode (M)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18" strokeDasharray="2 2" />
            <path d="M7 8l-4 4 4 4" /><path d="M17 8l4 4-4 4" />
          </svg>
        </button>
      </div>

      <div className="w-6 h-px bg-[var(--border)] my-1.5 relative z-10" />

      <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-bold mb-1 relative z-10">
        Color
      </div>

      <div className="relative z-10">
        <button
          ref={colorBtnRef}
          onClick={() => setShowColorPicker((v) => !v)}
          className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 border-2 ${
            showColorPicker
              ? 'border-[var(--accent)] shadow-md shadow-[var(--accent-glow)]'
              : 'border-[var(--border-light)] hover:border-[var(--text-muted)]'
          }`}
          style={{ backgroundColor: color, opacity: alpha / 255 > 0.15 ? 1 : 1 }}
          title="Color Picker (C)"
        >
          <div
            className="w-full h-full rounded-md"
            style={{ backgroundColor: color, opacity: alpha / 255 }}
          />
          {showColorPicker && (
            <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-[var(--accent)] border border-[var(--bg-secondary)]" />
          )}
        </button>

        {showColorPicker && (
          <ColorPicker
            anchorRef={colorBtnRef}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </div>

      <div className="flex-1" />

      <button
        onClick={handleReset}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--danger)]/15 hover:text-[var(--danger)] border border-transparent hover:border-[var(--danger)]/30 transition-all duration-200 relative z-10 mb-1"
        title="Reset skin"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>

      {showResetModal && (
        <ResetConfirmModal
          onConfirm={() => { resetSkin(); setShowResetModal(false); }}
          onCancel={() => setShowResetModal(false)}
        />
      )}
    </div>
  );
}
