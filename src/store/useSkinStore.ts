import { create } from 'zustand';
import {
  createDefaultSkin,
  cloneImageData,
  setPixel,
  getPixel,
  fillRectPixels,
  hexToRgba,
  loadImageFromUrl,
  publicAssetUrl,
  createDefaultSkinForModelType,
  type RGBA,
} from '../utils/textureUtils';
import {
  isValidSkinPixelForModel,
  getMirroredPixelForModel,
  getFaceContainingPixel,
  getMirroredFaceRegion,
} from '../utils/skinLayout';
import type { AiEditOperation } from '../types/aiEdits';

export type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper';
export type ModelType = 'steve' | 'alex';
export type EditorMode = '2d' | '3d';

interface SkinState {
  skinData: ImageData;
  defaultSkinBaseline: ImageData | null;
  baselineIsImported: boolean;
  textureVersion: number;
  tool: Tool;
  color: string;
  alpha: number;
  modelType: ModelType;
  editorMode: EditorMode;
  isDefaultSkin: boolean;
  showGrid: boolean;
  showBodyPartOutlines: boolean;
  showExternalBodyPartOutlines: boolean;
  mirrorMode: boolean;
  history: ImageData[];
  historyIndex: number;
  recentColors: string[];
  proposalStatus: 'idle' | 'preview';
  proposalBaseSnapshot: ImageData | null;
  proposalBaseModelType: ModelType | null;
  proposalDraftSnapshot: ImageData | null;
  proposalDraftModelType: ModelType | null;
  proposalMessage: string;
  proposalChangedPixelCount: number;
  pendingOps: AiEditOperation[];
  /** Incremented when starting a fresh document (new / import) so AI chat can clear thread-local history. */
  aiChatResetNonce: number;

  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setAlpha: (alpha: number) => void;
  setModelType: (type: ModelType) => void;
  setEditorMode: (mode: EditorMode) => void;
  toggleGrid: () => void;
  toggleBodyPartOutlines: () => void;
  toggleExternalBodyPartOutlines: () => void;
  toggleMirrorMode: () => void;

  paintPixel: (x: number, y: number) => void;
  erasePixel: (x: number, y: number) => void;
  fillArea: (x: number, y: number) => void;
  pickColor: (x: number, y: number) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  loadSkin: (data: ImageData) => void;
  loadDefaultSkin: (data: ImageData) => void;
  resetSkin: () => void;
  newSkin: () => void;
  getSkinData: () => ImageData;
  beginProposal: () => void;
  setProposalDraft: (input: {
    draftImage: ImageData;
    draftModelType: ModelType;
    operations: AiEditOperation[];
    message: string;
    changedPixelCount: number;
  }) => void;
  applyProposal: () => void;
  rejectProposal: () => void;
  clearProposal: () => void;
}

const MAX_HISTORY = 50;

function addRecentColor(colors: string[], newColor: string): string[] {
  const filtered = colors.filter(c => c !== newColor);
  return [newColor, ...filtered].slice(0, 16);
}

function imageDataEquals(a: ImageData, b: ImageData): boolean {
  if (a.width !== b.width || a.height !== b.height) return false;
  if (a.data.length !== b.data.length) return false;
  for (let i = 0; i < a.data.length; i++) {
    if (a.data[i] !== b.data[i]) return false;
  }
  return true;
}

const clearProposalState = {
  proposalStatus: 'idle' as const,
  proposalBaseSnapshot: null,
  proposalBaseModelType: null as ModelType | null,
  proposalDraftSnapshot: null,
  proposalDraftModelType: null as ModelType | null,
  proposalMessage: '',
  proposalChangedPixelCount: 0,
  pendingOps: [] as AiEditOperation[],
};

export const useSkinStore = create<SkinState>((set, get) => {
  const defaultSkin = createDefaultSkin();

  return {
    skinData: defaultSkin,
    defaultSkinBaseline: cloneImageData(defaultSkin),
    baselineIsImported: false,
    textureVersion: 0,
    tool: 'pencil',
    color: '#e74c3c',
    alpha: 255,
    modelType: 'steve',
    editorMode: '2d',
    isDefaultSkin: true,
    showGrid: true,
    showBodyPartOutlines: true,
    showExternalBodyPartOutlines: false,
    mirrorMode: false,
    history: [cloneImageData(defaultSkin)],
    historyIndex: 0,
    recentColors: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#000000', '#ffffff'],
    aiChatResetNonce: 0,
    ...clearProposalState,

    setTool: (tool) => set({ tool }),
    setEditorMode: (mode) => set({ editorMode: mode }),
    setColor: (color) => set((s) => ({
      color,
      recentColors: addRecentColor(s.recentColors, color),
    })),
    setAlpha: (alpha) => set({ alpha }),
    setModelType: (type) => {
      const { isDefaultSkin } = get();
      if (!isDefaultSkin) {
        set({ modelType: type, ...clearProposalState });
        return;
      }

      const applyDefaultSkin = (data: ImageData) => {
        set((state) => ({
          modelType: type,
          skinData: data,
          defaultSkinBaseline: cloneImageData(data),
          history: [cloneImageData(data)],
          historyIndex: 0,
          textureVersion: state.textureVersion + 1,
          isDefaultSkin: true,
          ...clearProposalState,
        }));
      };

      const url = type === 'alex' ? publicAssetUrl('alex.png') : publicAssetUrl('steve.png');
      loadImageFromUrl(url)
        .then(applyDefaultSkin)
        .catch(() => applyDefaultSkin(createDefaultSkinForModelType(type)));
    },
    toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
    toggleBodyPartOutlines: () => set((s) => ({ showBodyPartOutlines: !s.showBodyPartOutlines })),
    toggleExternalBodyPartOutlines: () => set((s) => ({ showExternalBodyPartOutlines: !s.showExternalBodyPartOutlines })),
    toggleMirrorMode: () => set((s) => ({ mirrorMode: !s.mirrorMode })),

    paintPixel: (x, y) => {
      const { skinData, color, alpha, mirrorMode, modelType } = get();
      if (!isValidSkinPixelForModel(x, y, modelType)) return;
      const rgba = hexToRgba(color, alpha);
      setPixel(skinData, x, y, rgba);
      if (mirrorMode) {
        const mirrored = getMirroredPixelForModel(x, y, modelType);
        if (mirrored) setPixel(skinData, mirrored.x, mirrored.y, rgba);
      }
      set({ textureVersion: get().textureVersion + 1, isDefaultSkin: false, ...clearProposalState });
    },

    erasePixel: (x, y) => {
      const { skinData, mirrorMode, modelType } = get();
      if (!isValidSkinPixelForModel(x, y, modelType)) return;
      setPixel(skinData, x, y, [0, 0, 0, 0]);
      if (mirrorMode) {
        const mirrored = getMirroredPixelForModel(x, y, modelType);
        if (mirrored) setPixel(skinData, mirrored.x, mirrored.y, [0, 0, 0, 0]);
      }
      set({ textureVersion: get().textureVersion + 1, isDefaultSkin: false, ...clearProposalState });
    },

    fillArea: (x, y) => {
      const { skinData, color, alpha, modelType, mirrorMode } = get();
      if (!isValidSkinPixelForModel(x, y, modelType)) return;
      const hit = getFaceContainingPixel(x, y, modelType);
      if (!hit) return;
      const rgba: RGBA = hexToRgba(color, alpha);
      const newData = cloneImageData(skinData);
      const inModel = (px: number, py: number) => isValidSkinPixelForModel(px, py, modelType);
      fillRectPixels(newData, hit.uv, rgba, inModel);
      if (mirrorMode) {
        const mirrorUv = getMirroredFaceRegion(hit.partName, hit.faceKey, modelType);
        if (mirrorUv) fillRectPixels(newData, mirrorUv, rgba, inModel);
      }
      set({ skinData: newData, textureVersion: get().textureVersion + 1, isDefaultSkin: false, ...clearProposalState });
    },

    pickColor: (x, y) => {
      const { skinData } = get();
      const [r, g, b, a] = getPixel(skinData, x, y);
      const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
      set((s) => ({
        color: hex,
        alpha: a,
        tool: 'pencil',
        recentColors: addRecentColor(s.recentColors, hex),
      }));
    },

    pushHistory: () => {
      const { skinData, history, historyIndex } = get();
      const trimmed = history.slice(0, historyIndex + 1);
      const snapshot = cloneImageData(skinData);
      const newHistory = [...trimmed, snapshot].slice(-MAX_HISTORY);
      set({ history: newHistory, historyIndex: newHistory.length - 1 });
    },

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex <= 0) return;
      const newIndex = historyIndex - 1;
      set({
        skinData: cloneImageData(history[newIndex]),
        historyIndex: newIndex,
        textureVersion: get().textureVersion + 1,
        isDefaultSkin: get().defaultSkinBaseline
          ? imageDataEquals(history[newIndex], get().defaultSkinBaseline!)
          : false,
        ...clearProposalState,
      });
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex >= history.length - 1) return;
      const newIndex = historyIndex + 1;
      set({
        skinData: cloneImageData(history[newIndex]),
        historyIndex: newIndex,
        textureVersion: get().textureVersion + 1,
        isDefaultSkin: get().defaultSkinBaseline
          ? imageDataEquals(history[newIndex], get().defaultSkinBaseline!)
          : false,
        ...clearProposalState,
      });
    },

    loadSkin: (data) => {
      const baseline = cloneImageData(data);
      set({
        skinData: data,
        defaultSkinBaseline: baseline,
        baselineIsImported: true,
        history: [cloneImageData(data)],
        historyIndex: 0,
        textureVersion: get().textureVersion + 1,
        isDefaultSkin: false,
        aiChatResetNonce: get().aiChatResetNonce + 1,
        ...clearProposalState,
      });
    },

    loadDefaultSkin: (data) => {
      set({
        skinData: data,
        defaultSkinBaseline: cloneImageData(data),
        baselineIsImported: false,
        history: [cloneImageData(data)],
        historyIndex: 0,
        textureVersion: get().textureVersion + 1,
        isDefaultSkin: true,
        ...clearProposalState,
      });
    },

    resetSkin: () => {
      const { defaultSkinBaseline, baselineIsImported } = get();
      if (!defaultSkinBaseline) return;
      const restored = cloneImageData(defaultSkinBaseline);
      set({
        skinData: restored,
        history: [cloneImageData(restored)],
        historyIndex: 0,
        textureVersion: get().textureVersion + 1,
        isDefaultSkin: !baselineIsImported,
        ...clearProposalState,
      });
    },

    newSkin: () => {
      const currentModelType = get().modelType;
      const defaultSkinUrl = currentModelType === 'alex' ? publicAssetUrl('alex.png') : publicAssetUrl('steve.png');

      loadImageFromUrl(defaultSkinUrl).then((data) => {
        set({
          skinData: data,
          defaultSkinBaseline: cloneImageData(data),
          baselineIsImported: false,
          modelType: currentModelType,
          history: [cloneImageData(data)],
          historyIndex: 0,
          textureVersion: get().textureVersion + 1,
          isDefaultSkin: true,
          aiChatResetNonce: get().aiChatResetNonce + 1,
          ...clearProposalState,
        });
      }).catch(() => {
        const fresh = createDefaultSkinForModelType(currentModelType);
        set({
          skinData: fresh,
          defaultSkinBaseline: cloneImageData(fresh),
          baselineIsImported: false,
          modelType: currentModelType,
          history: [cloneImageData(fresh)],
          historyIndex: 0,
          textureVersion: get().textureVersion + 1,
          isDefaultSkin: true,
          aiChatResetNonce: get().aiChatResetNonce + 1,
          ...clearProposalState,
        });
      });
    },

    getSkinData: () => get().skinData,
    beginProposal: () => {
      const state = get();
      if (state.proposalBaseSnapshot) return;
      set({
        proposalStatus: 'preview',
        proposalBaseSnapshot: cloneImageData(state.skinData),
        proposalBaseModelType: state.modelType,
        proposalDraftSnapshot: cloneImageData(state.skinData),
        proposalDraftModelType: state.modelType,
        proposalMessage: '',
        proposalChangedPixelCount: 0,
        pendingOps: [],
      });
    },
    setProposalDraft: ({ draftImage, draftModelType, operations, message, changedPixelCount }) => {
      const state = get();
      const baseSnapshot = state.proposalBaseSnapshot ?? cloneImageData(state.skinData);
      const baseModelType = state.proposalBaseModelType ?? state.modelType;
      set((s) => ({
        proposalStatus: 'preview',
        proposalBaseSnapshot: baseSnapshot,
        proposalBaseModelType: baseModelType,
        proposalDraftSnapshot: cloneImageData(draftImage),
        proposalDraftModelType: draftModelType,
        proposalMessage: message,
        proposalChangedPixelCount: changedPixelCount,
        pendingOps: operations,
        skinData: cloneImageData(draftImage),
        modelType: draftModelType,
        textureVersion: s.textureVersion + 1,
        isDefaultSkin: false,
      }));
    },
    applyProposal: () => {
      const state = get();
      if (!state.proposalBaseSnapshot || !state.proposalDraftSnapshot) return;

      const trimmed = state.history.slice(0, state.historyIndex + 1);
      const committedBase = cloneImageData(state.proposalBaseSnapshot);
      const committedDraft = cloneImageData(state.proposalDraftSnapshot);
      const newHistory = [...trimmed, committedBase, committedDraft].slice(-MAX_HISTORY);

      set((s) => ({
        skinData: committedDraft,
        modelType: state.proposalDraftModelType ?? state.modelType,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        textureVersion: s.textureVersion + 1,
        isDefaultSkin: false,
        ...clearProposalState,
      }));
    },
    rejectProposal: () => {
      const state = get();
      if (!state.proposalBaseSnapshot) {
        set(clearProposalState);
        return;
      }
      const restored = cloneImageData(state.proposalBaseSnapshot);
      const restoredModelType = state.proposalBaseModelType ?? state.modelType;
      set((s) => ({
        skinData: restored,
        modelType: restoredModelType,
        textureVersion: s.textureVersion + 1,
        isDefaultSkin: state.defaultSkinBaseline
          ? imageDataEquals(restored, state.defaultSkinBaseline)
          : false,
        ...clearProposalState,
      }));
    },
    clearProposal: () => set(clearProposalState),
  };
});
