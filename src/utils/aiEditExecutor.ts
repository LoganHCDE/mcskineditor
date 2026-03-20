import type { ModelType } from '../store/useSkinStore';
import type { AiEditOperation } from '../types/aiEdits';
import { cloneImageData, fillRectPixels, hexToRgba, setPixel } from './textureUtils';
import { getFaceContainingPixel, isValidSkinPixelForModel } from './skinLayout';

export interface ExecuteAiEditsInput {
  baseImage: ImageData;
  baseModelType: ModelType;
  operations: AiEditOperation[];
}

export interface ExecuteAiEditsResult {
  nextImageData: ImageData;
  nextModelType: ModelType;
  changedPixelCount: number;
}

const MAX_CHANGED_PIXELS = 3000;
const SKIN_SIZE = 64;

function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < SKIN_SIZE && y >= 0 && y < SKIN_SIZE;
}

function pixelKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function executeAiEdits(input: ExecuteAiEditsInput): ExecuteAiEditsResult {
  let working = cloneImageData(input.baseImage);
  let modelType = input.baseModelType;
  const changed = new Set<string>();

  for (const op of input.operations) {
    if (op.type === 'set_model_type') {
      modelType = op.modelType;
      continue;
    }

    if (op.type === 'set_pixels') {
      for (const px of op.pixels) {
        if (!inBounds(px.x, px.y)) continue;
        if (!isValidSkinPixelForModel(px.x, px.y, modelType)) continue;
        setPixel(working, px.x, px.y, hexToRgba(px.color, px.alpha ?? 255));
        changed.add(pixelKey(px.x, px.y));
      }
      continue;
    }

    if (op.type === 'fill_area') {
      if (!inBounds(op.x, op.y)) continue;
      if (!isValidSkinPixelForModel(op.x, op.y, modelType)) continue;
      const hit = getFaceContainingPixel(op.x, op.y, modelType);
      if (!hit) continue;
      const before = cloneImageData(working);
      const rgba = hexToRgba(op.color, op.alpha ?? 255);
      const inModel = (px: number, py: number) => isValidSkinPixelForModel(px, py, modelType);
      fillRectPixels(working, hit.uv, rgba, inModel);
      for (let y = 0; y < SKIN_SIZE; y++) {
        for (let x = 0; x < SKIN_SIZE; x++) {
          const idx = (y * SKIN_SIZE + x) * 4;
          const changedNow =
            before.data[idx] !== working.data[idx] ||
            before.data[idx + 1] !== working.data[idx + 1] ||
            before.data[idx + 2] !== working.data[idx + 2] ||
            before.data[idx + 3] !== working.data[idx + 3];
          if (changedNow) {
            changed.add(pixelKey(x, y));
          }
        }
      }
      continue;
    }

    if (op.type === 'set_region') {
      const minX = Math.max(0, Math.min(op.x1, op.x2));
      const maxX = Math.min(SKIN_SIZE - 1, Math.max(op.x1, op.x2));
      const minY = Math.max(0, Math.min(op.y1, op.y2));
      const maxY = Math.min(SKIN_SIZE - 1, Math.max(op.y1, op.y2));
      const rgba = hexToRgba(op.color, op.alpha ?? 255);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (!isValidSkinPixelForModel(x, y, modelType)) continue;
          setPixel(working, x, y, rgba);
          changed.add(pixelKey(x, y));
        }
      }
    }
  }

  if (changed.size > MAX_CHANGED_PIXELS) {
    throw new Error(`AI edit is too large (${changed.size} changed pixels). Try a narrower prompt.`);
  }

  return {
    nextImageData: working,
    nextModelType: modelType,
    changedPixelCount: changed.size,
  };
}
