import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSkinStore } from '../store/useSkinStore';
import { executeAiEdits } from '../utils/aiEditExecutor';
import { validateAiEditResponse } from '../types/aiEdits';
import type { ChatTurn } from '../llm/types';
import {
  CUSTOM_MODEL_VALUE,
  isDynamicModelProvider,
  loadApiKey,
  loadCustomModelId,
  loadModelChoice,
  loadProvider,
  providerLabel,
  resolveLlmModelId,
  type LlmProvider,
  saveApiKey,
  saveCustomModelId,
  saveModelChoice,
  saveProvider,
} from '../utils/aiProviderSettings';
import SkinDiffPreview from './SkinDiffPreview';
import { chatSkinEdit } from '../llm/chatSkinEdit';
import { fetchModelList } from '../llm/listModelsClient';

type ChatRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function PixelAvatar({ role }: { role: ChatRole }) {
  if (role === 'user') {
    return (
      <div className="chat-avatar chat-avatar--user">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect x="5" y="2" width="6" height="6" rx="1" />
          <rect x="3" y="10" width="10" height="5" rx="1" />
        </svg>
      </div>
    );
  }
  if (role === 'assistant') {
    return (
      <div className="chat-avatar chat-avatar--ai">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="3" width="12" height="10" rx="2" />
          <rect x="5" y="6" width="2" height="2" rx="0.5" opacity="0.9" fill="var(--bg-deep)" />
          <rect x="9" y="6" width="2" height="2" rx="0.5" opacity="0.9" fill="var(--bg-deep)" />
          <rect x="6" y="9" width="4" height="1.5" rx="0.5" opacity="0.7" fill="var(--bg-deep)" />
        </svg>
      </div>
    );
  }
  return (
    <div className="chat-avatar chat-avatar--system">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="8" r="6" strokeWidth="2" stroke="currentColor" fill="none" />
        <rect x="7" y="4" width="2" height="5" rx="1" />
        <rect x="7" y="10.5" width="2" height="2" rx="1" />
      </svg>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-message-row chat-message-row--assistant chat-msg-enter">
      <PixelAvatar role="assistant" />
      <div className="chat-bubble chat-bubble--assistant">
        <div className="typing-indicator">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

function WelcomeState() {
  return (
    <div className="chat-welcome">
      <div className="chat-welcome__icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="4" y="6" width="24" height="20" rx="3" fill="var(--accent)" opacity="0.15" />
          <rect x="4" y="6" width="24" height="20" rx="3" stroke="var(--accent)" strokeWidth="1.5" opacity="0.4" />
          <rect x="10" y="12" width="3" height="3" rx="0.5" fill="var(--accent)" opacity="0.7" />
          <rect x="19" y="12" width="3" height="3" rx="0.5" fill="var(--accent)" opacity="0.7" />
          <rect x="12" y="18" width="8" height="2" rx="1" fill="var(--accent)" opacity="0.5" />
          <circle cx="27" cy="7" r="3" fill="var(--accent-warm)" opacity="0.6" />
        </svg>
      </div>
      <p className="chat-welcome__title">AI Skin Assistant</p>
      <p className="chat-welcome__subtitle">
        Describe changes to your skin and I'll generate edits you can preview and apply.
      </p>
      <div className="chat-welcome__hints">
        <span className="chat-hint">"Make a creeper face"</span>
        <span className="chat-hint">"Add a red cape"</span>
        <span className="chat-hint">"Give me diamond armor"</span>
      </div>
    </div>
  );
}

interface ChatPanelProps {
  onClose?: () => void;
}

export default function ChatPanel({ onClose }: ChatPanelProps) {
  const modelType = useSkinStore((s) => s.modelType);
  const proposalStatus = useSkinStore((s) => s.proposalStatus);
  const proposalBaseSnapshot = useSkinStore((s) => s.proposalBaseSnapshot);
  const proposalDraftSnapshot = useSkinStore((s) => s.proposalDraftSnapshot);
  const proposalDraftModelType = useSkinStore((s) => s.proposalDraftModelType);
  const proposalMessage = useSkinStore((s) => s.proposalMessage);
  const proposalChangedPixelCount = useSkinStore((s) => s.proposalChangedPixelCount);
  const beginProposal = useSkinStore((s) => s.beginProposal);
  const setProposalDraft = useSkinStore((s) => s.setProposalDraft);
  const applyProposal = useSkinStore((s) => s.applyProposal);
  const rejectProposal = useSkinStore((s) => s.rejectProposal);
  const aiChatResetNonce = useSkinStore((s) => s.aiChatResetNonce);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [llmProvider, setLlmProvider] = useState<LlmProvider>(() => loadProvider());
  const [modelChoice, setModelChoice] = useState(() => loadModelChoice(loadProvider()));
  const [customModelId, setCustomModelId] = useState(() => loadCustomModelId(loadProvider()));
  const [apiKeys, setApiKeys] = useState<Record<LlmProvider, string>>(() => ({
    openai: loadApiKey('openai'),
    openrouter: loadApiKey('openrouter'),
    anthropic: loadApiKey('anthropic'),
    google: loadApiKey('google'),
  }));

  const [dynamicModels, setDynamicModels] = useState<{ value: string; label: string }[]>([]);
  const [modelsListStatus, setModelsListStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [modelsListError, setModelsListError] = useState('');
  const [modelsListInfo, setModelsListInfo] = useState<{ text: string; tone: 'hint' | 'warning' } | null>(
    null
  );
  const [modelsRefreshNonce, setModelsRefreshNonce] = useState(0);
  const [attachSkinAsImage, setAttachSkinAsImage] = useState(true);

  const listKeyTrimmed = apiKeys[llmProvider].trim();
  const [debouncedListKey, setDebouncedListKey] = useState(listKeyTrimmed);
  useEffect(() => {
    const delay = listKeyTrimmed.length === 0 ? 0 : 450;
    const t = window.setTimeout(() => setDebouncedListKey(listKeyTrimmed), delay);
    return () => window.clearTimeout(t);
  }, [listKeyTrimmed, llmProvider]);

  useEffect(() => {
    setModelChoice(loadModelChoice(llmProvider));
    setCustomModelId(loadCustomModelId(llmProvider));
  }, [llmProvider]);

  useEffect(() => {
    if (!isDynamicModelProvider(llmProvider)) {
      setDynamicModels([]);
      setModelsListStatus('idle');
      setModelsListError('');
      setModelsListInfo(null);
      return;
    }

    let cancelled = false;
    setModelsListStatus('loading');
    setModelsListError('');
    setModelsListInfo(null);

    (async () => {
      try {
        const data = await fetchModelList(llmProvider, debouncedListKey);
        if (cancelled) return;
        const raw = Array.isArray(data.models) ? data.models : [];
        const opts = raw.map((m) => ({
          value: m.id,
          label: m.label || m.id,
        }));
        setDynamicModels(opts);
        setModelsListStatus('idle');
        const w = typeof data.warning === 'string' && data.warning.trim() ? data.warning.trim() : '';
        const h = typeof data.hint === 'string' && data.hint.trim() ? data.hint.trim() : '';
        setModelsListInfo(
          w ? { text: w, tone: 'warning' } : h ? { text: h, tone: 'hint' } : null
        );
        setModelsListError('');

        setModelChoice((prev) => {
          if (prev === CUSTOM_MODEL_VALUE) return prev;
          if (opts.some((o) => o.value === prev)) return prev;
          const first = opts[0]?.value;
          if (first) {
            saveModelChoice(llmProvider, first);
            return first;
          }
          saveModelChoice(llmProvider, CUSTOM_MODEL_VALUE);
          return CUSTOM_MODEL_VALUE;
        });
      } catch (e) {
        if (cancelled) return;
        setModelsListStatus('error');
        setModelsListInfo(null);
        const msg = e instanceof Error ? e.message : String(e);
        setModelsListError(`Could not load models: ${msg}`);
        setDynamicModels([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [llmProvider, debouncedListKey, modelsRefreshNonce]);

  const modelSelectOptions = useMemo(() => {
    if (llmProvider === 'openrouter') {
      return [];
    }
    if (modelsListStatus === 'loading' && dynamicModels.length === 0) {
      return [{ value: '__loading__', label: 'Loading models from API…' }];
    }
    if (modelsListStatus === 'error' && dynamicModels.length === 0) {
      return [
        { value: '__error__', label: 'Could not load model list' },
        { value: CUSTOM_MODEL_VALUE, label: 'Custom model ID…' },
      ];
    }
    return [
      ...dynamicModels,
      { value: CUSTOM_MODEL_VALUE, label: 'Custom model ID…' },
    ];
  }, [llmProvider, dynamicModels, modelsListStatus]);

  const effectiveModelChoice = useMemo(() => {
    if (llmProvider === 'openrouter') return CUSTOM_MODEL_VALUE;
    const realOptions = modelSelectOptions.filter(
      (o) => o.value !== '__loading__' && o.value !== '__error__'
    );
    if (realOptions.length === 0) {
      const only = modelSelectOptions[0]?.value;
      if (only === '__loading__') return '__loading__';
      if (only === '__error__') return '__error__';
      return CUSTOM_MODEL_VALUE;
    }
    if (realOptions.some((o) => o.value === modelChoice)) return modelChoice;
    return realOptions[0].value;
  }, [llmProvider, modelChoice, modelSelectOptions]);

  const resolvedLlmModel = useMemo(() => {
    if (effectiveModelChoice === '__loading__' || effectiveModelChoice === '__error__') return '';
    return resolveLlmModelId(effectiveModelChoice, customModelId);
  }, [effectiveModelChoice, customModelId]);

  const llmSummary = useMemo(() => {
    const label = providerLabel(llmProvider);
    const mid = resolvedLlmModel.trim();
    return mid ? `${label} · ${mid}` : `${label} · …`;
  }, [llmProvider, resolvedLlmModel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setIsLoading(false);
  }, [aiChatResetNonce]);

  const sendHistory = useMemo((): ChatTurn[] => {
    return messages
      .filter((m): m is ChatMessage & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-8);
  }, [messages]);

  const submitPrompt = async (e: FormEvent) => {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    if (
      effectiveModelChoice === CUSTOM_MODEL_VALUE &&
      !customModelId.trim() &&
      !(
        isDynamicModelProvider(llmProvider) &&
        modelsListStatus === 'error' &&
        dynamicModels.length === 0
      )
    ) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'system',
          content:
            llmProvider === 'openrouter'
              ? 'Enter an OpenRouter model slug (e.g. openai/gpt-4o).'
              : 'Choose a custom model ID or pick a preset from the model list.',
          timestamp: Date.now(),
        },
      ]);
      return;
    }
    if (effectiveModelChoice === '__loading__' || effectiveModelChoice === '__error__') {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'system',
          content: 'Wait for the model list to load, refresh it, or switch provider.',
          timestamp: Date.now(),
        },
      ]);
      return;
    }
    if (!resolvedLlmModel.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'system',
          content: 'Select a language model before sending.',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    const userMessage: ChatMessage = { id: uid(), role: 'user', content: prompt, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const snapshot = useSkinStore.getState();
      if (!snapshot.proposalBaseSnapshot) {
        beginProposal();
      }

      const afterBegin = useSkinStore.getState();
      const workingImage = afterBegin.proposalDraftSnapshot ?? afterBegin.skinData;
      const workingModelType = afterBegin.proposalDraftModelType ?? afterBegin.modelType;
      const raw = await chatSkinEdit({
        message: prompt,
        modelType: workingModelType,
        skinImage: workingImage,
        history: sendHistory,
        llmProvider,
        llmModel: resolvedLlmModel.trim(),
        apiKey: apiKeys[llmProvider].trim(),
        includeSkinPngForVision: attachSkinAsImage,
      });

      const aiResponse = validateAiEditResponse(raw);
      const result = executeAiEdits({
        baseImage: workingImage,
        baseModelType: workingModelType,
        operations: aiResponse.operations,
      });

      setProposalDraft({
        draftImage: result.nextImageData,
        draftModelType: result.nextModelType,
        operations: aiResponse.operations,
        message: aiResponse.message,
        changedPixelCount: result.changedPixelCount,
      });

      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: aiResponse.message, timestamp: Date.now() }]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setMessages((prev) => [...prev, { id: uid(), role: 'system', content: msg, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleApply = () => {
    applyProposal();
    setMessages((prev) => [...prev, { id: uid(), role: 'system', content: 'Changes applied to your skin.', timestamp: Date.now() }]);
  };

  const handleReject = () => {
    rejectProposal();
    setMessages((prev) => [...prev, { id: uid(), role: 'system', content: 'Draft rejected. Skin restored.', timestamp: Date.now() }]);
  };

  const hasMessages = messages.length > 0;

  return (
    <aside className="chat-panel">
      <div className="chat-header">
        <div className="chat-header__left">
          <div className="chat-header__icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="14" height="10" rx="2" />
              <polygon points="5,12 8,14 11,12" />
            </svg>
          </div>
          <div>
            <h2 className="chat-header__title">AI Chat</h2>
            <p className="chat-header__model">
              Skin: {proposalDraftModelType ?? modelType}
              <span className="chat-header__status-dot" />
            </p>
            <p className="chat-header__llm" title={llmSummary}>
              {llmSummary}
            </p>
          </div>
        </div>
        <div className="chat-header__right">
          <div className="chat-header__badge">
            {messages.filter((m) => m.role === 'assistant').length} replies
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="chat-close-btn"
              aria-label="Close chat"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M13 3L8 8M8 8L3 13M8 8L13 13M8 8L3 3" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {proposalStatus === 'preview' && proposalDraftSnapshot && (
        <div className="chat-proposal">
          <SkinDiffPreview
            base={proposalBaseSnapshot}
            draft={proposalDraftSnapshot}
            changedPixelCount={proposalChangedPixelCount}
          />
          <div className="chat-proposal__body">
            <p className="chat-proposal__message">
              {proposalMessage || 'Draft ready for review.'}
            </p>
            <div className="chat-proposal__actions">
              <button
                onClick={handleApply}
                disabled={isLoading}
                className="chat-btn chat-btn--apply"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 8 7 12 13 4" />
                </svg>
                Apply
              </button>
              <button
                onClick={handleReject}
                disabled={isLoading}
                className="chat-btn chat-btn--reject"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="4" x2="12" y2="12" />
                  <line x1="12" y1="4" x2="4" y2="12" />
                </svg>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasMessages && !proposalDraftSnapshot && (
        <div className="chat-body chat-body--empty">
          <WelcomeState />
        </div>
      )}

      {(hasMessages || (proposalDraftSnapshot && proposalStatus !== 'preview')) && (
        <div className="chat-body">
          {messages.map((m, i) => (
            <div
              key={m.id}
              className={`chat-message-row chat-message-row--${m.role} chat-msg-enter`}
              style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
            >
              <PixelAvatar role={m.role} />
              <div className={`chat-bubble chat-bubble--${m.role}`}>
                <p className="chat-bubble__text">{m.content}</p>
                <span className="chat-bubble__time">{formatTime(m.timestamp)}</span>
              </div>
            </div>
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="chat-ai-settings">
        <div className="chat-ai-settings__row chat-ai-settings__row--full">
          <span className="chat-ai-settings__label">Skin image</span>
          <label className="chat-ai-settings__checkbox-label" htmlFor="msm-skin-vision">
            <input
              id="msm-skin-vision"
              type="checkbox"
              checked={attachSkinAsImage}
              disabled={isLoading}
              onChange={(e) => setAttachSkinAsImage(e.target.checked)}
            />
            <span>Attach 64×64 PNG for vision-capable models (alongside RGBA in JSON)</span>
          </label>
        </div>
        <div className="chat-ai-settings__row">
          <label className="chat-ai-settings__label" htmlFor="msm-llm-provider">
            Provider
          </label>
          <select
            id="msm-llm-provider"
            className="chat-ai-settings__select"
            value={llmProvider}
            disabled={isLoading}
            onChange={(e) => {
              const p = e.target.value as LlmProvider;
              setLlmProvider(p);
              saveProvider(p);
              if (p === 'openrouter') {
                saveModelChoice(p, CUSTOM_MODEL_VALUE);
              }
            }}
          >
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="anthropic">Claude (Anthropic)</option>
            <option value="google">Google (Gemini)</option>
          </select>
        </div>
        <div className="chat-ai-settings__row chat-ai-settings__row--model">
          <label
            className="chat-ai-settings__label"
            htmlFor={llmProvider === 'openrouter' ? 'msm-llm-openrouter-model' : 'msm-llm-model'}
          >
            Model
          </label>
          <div className="chat-ai-settings__model-wrap">
            {llmProvider === 'openrouter' ? (
              <input
                id="msm-llm-openrouter-model"
                type="text"
                className="chat-ai-settings__select chat-ai-settings__input--mono"
                style={{ flex: 1, minWidth: 0 }}
                placeholder="e.g. openai/gpt-4o, anthropic/claude-sonnet-4"
                value={customModelId}
                disabled={isLoading}
                onChange={(e) => setCustomModelId(e.target.value)}
                onBlur={(e) => saveCustomModelId('openrouter', e.currentTarget.value)}
              />
            ) : (
              <>
                <select
                  id="msm-llm-model"
                  className="chat-ai-settings__select"
                  value={effectiveModelChoice}
                  disabled={
                    isLoading ||
                    (isDynamicModelProvider(llmProvider) &&
                      modelsListStatus === 'loading' &&
                      dynamicModels.length === 0)
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setModelChoice(v);
                    saveModelChoice(llmProvider, v);
                  }}
                >
                  {modelSelectOptions.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      disabled={opt.value === '__loading__' || opt.value === '__error__'}
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
                {isDynamicModelProvider(llmProvider) && (
                  <button
                    type="button"
                    className="chat-ai-models-refresh"
                    disabled={isLoading || modelsListStatus === 'loading'}
                    title="Reload model list (uses your API key when set)"
                    onClick={() => setModelsRefreshNonce((n) => n + 1)}
                  >
                    Refresh
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {isDynamicModelProvider(llmProvider) && modelsListStatus === 'error' && modelsListError && (
          <p className="chat-ai-models-hint chat-ai-models-hint--error">{modelsListError}</p>
        )}
        {isDynamicModelProvider(llmProvider) &&
          modelsListStatus === 'idle' &&
          modelsListInfo && (
            <p
              className={
                modelsListInfo.tone === 'warning'
                  ? 'chat-ai-models-hint chat-ai-models-hint--warning'
                  : 'chat-ai-models-hint chat-ai-models-hint--muted'
              }
            >
              {modelsListInfo.text}
            </p>
          )}
        {isDynamicModelProvider(llmProvider) &&
          modelsListStatus === 'idle' &&
          dynamicModels.length > 0 &&
          !modelsListInfo && (
            <p className="chat-ai-models-hint">
              List shows chat models that support image or file input (per provider API).
            </p>
          )}
        {effectiveModelChoice === CUSTOM_MODEL_VALUE && llmProvider !== 'openrouter' && (
          <div className="chat-ai-settings__row chat-ai-settings__row--full">
            <label className="chat-ai-settings__label" htmlFor="msm-llm-custom">
              Custom ID
            </label>
            <input
              id="msm-llm-custom"
              type="text"
              className="chat-ai-settings__input chat-ai-settings__input--mono"
              placeholder="e.g. gpt-4o or anthropic/claude-3.5-sonnet"
              value={customModelId}
              disabled={isLoading}
              onChange={(e) => setCustomModelId(e.target.value)}
              onBlur={(e) => saveCustomModelId(llmProvider, e.currentTarget.value)}
            />
          </div>
        )}
        <details className="chat-ai-keys">
          <summary className="chat-ai-keys__summary">API keys (stored in this browser; required for API calls)</summary>
          <div className="chat-ai-keys__grid">
            <div className="chat-ai-keys__field">
              <label className="chat-ai-keys__label" htmlFor={`msm-key-${llmProvider}`}>
                {providerLabel(llmProvider)}
              </label>
              <input
                id={`msm-key-${llmProvider}`}
                type="password"
                className="chat-ai-settings__input"
                autoComplete="off"
                placeholder="Stored in this browser only"
                value={apiKeys[llmProvider]}
                disabled={isLoading}
                onChange={(e) =>
                  setApiKeys((prev) => ({
                    ...prev,
                    [llmProvider]: e.target.value,
                  }))
                }
                onBlur={(e) => saveApiKey(llmProvider, e.currentTarget.value)}
              />
            </div>
          </div>
        </details>
      </div>

      <form onSubmit={submitPrompt} className="chat-input-bar">
        <div className="chat-input-wrap">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe skin changes..."
            disabled={isLoading}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="chat-send-btn"
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="chat-send-spinner" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.5 2.1a.75.75 0 0 1 .8-.04l10 5.5a.75.75 0 0 1 0 1.3l-10 5.5A.75.75 0 0 1 2 13.75V9l6-1-6-1V2.75a.75.75 0 0 1 .5-.65Z" />
              </svg>
            )}
          </button>
        </div>
        <p className="chat-input-hint">
          {isLoading ? 'Generating edits...' : 'Press Enter to send'}
        </p>
      </form>
    </aside>
  );
}
