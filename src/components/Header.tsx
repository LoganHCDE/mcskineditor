import { useCallback, useRef, useState } from 'react';
import { useSkinStore } from '../store/useSkinStore';
import { downloadSkin, loadImageFile } from '../utils/textureUtils';
import ResetConfirmModal from './ResetConfirmModal';

export default function Header() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const modelType = useSkinStore((s) => s.modelType);
  const setModelType = useSkinStore((s) => s.setModelType);
  const loadSkin = useSkinStore((s) => s.loadSkin);
  const newSkin = useSkinStore((s) => s.newSkin);
  const getSkinData = useSkinStore((s) => s.getSkinData);
  const isDefaultSkin = useSkinStore((s) => s.isDefaultSkin);
  const proposalStatus = useSkinStore((s) => s.proposalStatus);

  const hasUnsavedWork = !isDefaultSkin || proposalStatus === 'preview';

  const handleNewClick = useCallback(() => {
    if (hasUnsavedWork) setShowNewConfirm(true);
    else newSkin();
  }, [hasUnsavedWork, newSkin]);

  const confirmNewSkin = useCallback(() => {
    newSkin();
    setShowNewConfirm(false);
  }, [newSkin]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await loadImageFile(file);
      loadSkin(data);
    } catch {
      alert('Failed to load skin file. Please use a valid PNG image.');
    }
    e.target.value = '';
  };

  const handleExport = () => {
    const data = getSkinData();
    downloadSkin(data);
  };

  return (
    <header className="noise-bg flex items-center justify-between px-5 h-14 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0 relative z-10">
      <div className="flex items-center gap-3 relative z-10">
        <div className="flex items-center gap-0.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[var(--accent)] to-teal-600 flex items-center justify-center shadow-md shadow-[var(--accent-glow)]">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="white" opacity="0.95">
              <rect x="1" y="1" width="6" height="6" rx="1" />
              <rect x="9" y="1" width="6" height="6" rx="1" />
              <rect x="1" y="9" width="6" height="6" rx="1" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </div>
          <h1 className="font-pixel text-sm tracking-wide select-none ml-1.5">
            <span className="text-[var(--accent)]">MC</span>
            <span className="text-[var(--text-primary)] ml-1">Skin Editor</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <button
          onClick={handleNewClick}
          className="group flex shrink-0 items-center justify-center gap-2.5 px-6 py-1.5 h-10 min-w-[112px] whitespace-nowrap text-sm leading-5 font-medium rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] border border-[var(--border-light)] shadow-sm shadow-black/30 transition-all duration-200"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:opacity-100 transition-opacity">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          New
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="group flex shrink-0 items-center justify-center gap-2.5 px-6 py-1.5 h-10 min-w-[118px] whitespace-nowrap text-sm leading-5 font-medium rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] border border-[var(--border-light)] shadow-sm shadow-black/30 transition-all duration-200"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:opacity-100 transition-opacity">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,image/png"
          onChange={handleImport}
          className="hidden"
        />

        <button
          onClick={handleExport}
          className="group flex shrink-0 items-center justify-center gap-2.5 px-6 py-1.5 h-10 min-w-[132px] whitespace-nowrap text-sm leading-5 font-semibold rounded-xl bg-[var(--accent)] text-[var(--bg-deep)] hover:bg-[var(--accent-hover)] border border-teal-300/30 shadow-md shadow-[var(--accent-glow)] hover:shadow-lg hover:shadow-[var(--accent-glow)] transition-all duration-200"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>

        <div className="w-px h-7 bg-[var(--border)] mx-0.5" />

        <div className="flex shrink-0 items-center rounded-xl border border-[var(--border-light)] overflow-hidden bg-[var(--bg-deep)] shadow-sm shadow-black/30">
          <button
            onClick={() => setModelType('steve')}
            className={`shrink-0 px-5 py-1.5 h-10 min-w-[90px] whitespace-nowrap text-sm leading-5 font-semibold tracking-wide transition-all duration-200 ${
              modelType === 'steve'
                ? 'bg-[var(--accent)] text-[var(--bg-deep)] shadow-inner'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            Steve
          </button>
          <div className="w-px h-6 bg-[var(--border)]" />
          <button
            onClick={() => setModelType('alex')}
            className={`shrink-0 px-5 py-1.5 h-10 min-w-[90px] whitespace-nowrap text-sm leading-5 font-semibold tracking-wide transition-all duration-200 ${
              modelType === 'alex'
                ? 'bg-[var(--accent)] text-[var(--bg-deep)] shadow-inner'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            Alex
          </button>
        </div>
      </div>

      {showNewConfirm && (
        <ResetConfirmModal
          title="Start a new skin?"
          message="Any unsaved changes will be discarded and replaced with a fresh Steve or Alex template."
          confirmLabel="Start new"
          onConfirm={confirmNewSkin}
          onCancel={() => setShowNewConfirm(false)}
        />
      )}
    </header>
  );
}
