import { Suspense, useCallback, useEffect, useState } from 'react';
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import Editor2D from './components/Editor2D';
import Editor3D from './components/Editor3D';
import MiniPreview3D from './components/MiniPreview3D';
import ChatPanel from './components/ChatPanel';
import { loadImageFromUrl, publicAssetUrl } from './utils/textureUtils';
import { useSkinStore } from './store/useSkinStore';

function ModeToggle() {
  const editorMode = useSkinStore((s) => s.editorMode);
  const setEditorMode = useSkinStore((s) => s.setEditorMode);

  return (
    <div className="mode-toggle-bar">
      <div className="mode-toggle">
        <div
          className="mode-toggle-indicator"
          style={{ transform: editorMode === '3d' ? 'translateX(100%)' : 'translateX(0)' }}
        />
        <button
          type="button"
          className={`mode-toggle-btn ${editorMode === '2d' ? 'mode-toggle-btn--active' : ''}`}
          onClick={() => setEditorMode('2d')}
          title="2D Texture Editor"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
          </svg>
          <span>2D</span>
        </button>
        <button
          type="button"
          className={`mode-toggle-btn ${editorMode === '3d' ? 'mode-toggle-btn--active' : ''}`}
          onClick={() => setEditorMode('3d')}
          title="3D Model Editor"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l9 5v8l-9 5-9-5V8z" />
            <path d="M12 13l9-5" />
            <path d="M12 13l-9-5" />
            <path d="M12 13v9" />
          </svg>
          <span>3D</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [chatOpen, setChatOpen] = useState(true);
  const editorMode = useSkinStore((s) => s.editorMode);

  const toggleChat = useCallback(() => setChatOpen((prev) => !prev), []);

  useEffect(() => {
    loadImageFromUrl(publicAssetUrl('steve.png')).then((data) => {
      useSkinStore.getState().loadDefaultSkin(data);
    });
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-deep)]">
      <Header />

      <div className="flex flex-1 overflow-hidden relative">
        <Toolbar />

        <div className="flex flex-col flex-1 overflow-hidden">
          <ModeToggle />

          {editorMode === '2d' ? (
            <div className="flex-1 overflow-hidden bg-[var(--bg-primary)] relative">
              <Editor2D />
              <MiniPreview3D />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden bg-[var(--bg-primary)]">
              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center w-full h-full text-[var(--text-muted)] gap-2">
                    <div className="w-6 h-6 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
                    <span className="text-xs">Loading 3D Editor...</span>
                  </div>
                }
              >
                <Editor3D />
              </Suspense>
            </div>
          )}
        </div>

        <div className={`chat-drawer ${chatOpen ? 'chat-drawer--open' : 'chat-drawer--closed'}`}>
          <ChatPanel onClose={toggleChat} />
        </div>

        {!chatOpen && (
          <button
            onClick={toggleChat}
            className="chat-toggle-btn"
            aria-label="Open AI Chat"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="14" height="10" rx="2" />
              <polygon points="5,12 8,14 11,12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
