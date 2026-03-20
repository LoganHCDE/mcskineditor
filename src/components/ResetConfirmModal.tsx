import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ResetConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
}

export default function ResetConfirmModal({
  onConfirm,
  onCancel,
  title = 'Reset Skin?',
  message = 'All unsaved changes will be lost and the skin will return to its default state.',
  confirmLabel = 'Reset',
}: ResetConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(8, 8, 15, 0.72)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="relative flex flex-col items-center rounded-2xl border border-[var(--border-light)] bg-[var(--bg-elevated)]"
        style={{
          width: '520px',
          padding: '52px 56px 48px',
          gap: '28px',
          animation: 'resetModalIn 0.18s cubic-bezier(0.34, 1.4, 0.64, 1) both',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* X close button — sits on the top-right corner of the card */}
        <button
          onClick={onCancel}
          className="absolute flex items-center justify-center rounded-full transition-all duration-150"
          style={{
            top: -18,
            right: -18,
            width: 44,
            height: 44,
            background: 'var(--bg-elevated)',
            color: 'var(--text-muted)',
            border: '2px solid var(--border-light)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-muted)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-light)';
          }}
          title="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 68,
            height: 68,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            flexShrink: 0,
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--danger)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className="font-semibold tracking-tight"
            style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}
          >
            {title}
          </span>
          <span
            className="leading-relaxed"
            style={{ fontSize: '0.975rem', color: 'var(--text-secondary)', maxWidth: 340 }}
          >
            {message}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex w-full gap-3" style={{ paddingTop: 4 }}>
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            className="flex-1 rounded-xl font-medium transition-all duration-150"
            style={{
              padding: '13px 0',
              fontSize: '0.975rem',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-light)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-hover)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl font-semibold transition-all duration-150"
            style={{
              padding: '13px 0',
              fontSize: '0.975rem',
              background: 'var(--danger)',
              color: '#fff',
              border: '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger)';
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes resetModalIn {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(6px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
