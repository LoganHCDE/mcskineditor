import type { ModelType } from '../store/useSkinStore';

export type AiEditOperation =
  | {
      type: 'set_pixels';
      pixels: Array<{ x: number; y: number; color: string; alpha?: number }>;
    }
  | {
      type: 'fill_area';
      x: number;
      y: number;
      color: string;
      alpha?: number;
    }
  | {
      type: 'set_region';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      alpha?: number;
    }
  | {
      type: 'set_model_type';
      modelType: ModelType;
    };

export const MAX_AI_EDIT_OPERATIONS = 100;

export interface AiEditResponse {
  message: string;
  operations: AiEditOperation[];
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

function isValidAlpha(alpha: unknown): alpha is number {
  return typeof alpha === 'number' && Number.isInteger(alpha) && alpha >= 0 && alpha <= 255;
}

function isValidColor(color: unknown): color is string {
  return typeof color === 'string' && HEX_RE.test(color);
}

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

export function validateAiEditResponse(value: unknown): AiEditResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('AI response must be an object.');
  }

  const obj = value as Record<string, unknown>;
  const message = obj.message;
  const operations = obj.operations;

  if (typeof message !== 'string' || !message.trim()) {
    throw new Error('AI response message is missing.');
  }

  if (!Array.isArray(operations)) {
    throw new Error('AI response operations must be an array.');
  }

  const parsedOps: AiEditOperation[] = operations.map((opRaw, index) => {
    if (!opRaw || typeof opRaw !== 'object') {
      throw new Error(`Operation ${index} is invalid.`);
    }
    const op = opRaw as Record<string, unknown>;
    const type = op.type;

    if (type === 'set_pixels') {
      const pixels = op.pixels;
      if (!Array.isArray(pixels)) {
        throw new Error(`Operation ${index}: pixels must be an array.`);
      }
      return {
        type,
        pixels: pixels.map((p, pixelIndex) => {
          if (!p || typeof p !== 'object') {
            throw new Error(`Operation ${index} pixel ${pixelIndex} is invalid.`);
          }
          const px = p as Record<string, unknown>;
          if (!isInt(px.x) || !isInt(px.y) || !isValidColor(px.color)) {
            throw new Error(`Operation ${index} pixel ${pixelIndex} has invalid fields.`);
          }
          if (px.alpha !== undefined && !isValidAlpha(px.alpha)) {
            throw new Error(`Operation ${index} pixel ${pixelIndex} has invalid alpha.`);
          }
          return {
            x: px.x,
            y: px.y,
            color: px.color.toLowerCase(),
            alpha: px.alpha as number | undefined,
          };
        }),
      };
    }

    if (type === 'fill_area') {
      if (!isInt(op.x) || !isInt(op.y) || !isValidColor(op.color)) {
        throw new Error(`Operation ${index}: fill_area fields are invalid.`);
      }
      if (op.alpha !== undefined && !isValidAlpha(op.alpha)) {
        throw new Error(`Operation ${index}: fill_area alpha is invalid.`);
      }
      return {
        type,
        x: op.x,
        y: op.y,
        color: op.color.toLowerCase(),
        alpha: op.alpha as number | undefined,
      };
    }

    if (type === 'set_region') {
      if (!isInt(op.x1) || !isInt(op.y1) || !isInt(op.x2) || !isInt(op.y2) || !isValidColor(op.color)) {
        throw new Error(`Operation ${index}: set_region fields are invalid.`);
      }
      if (op.alpha !== undefined && !isValidAlpha(op.alpha)) {
        throw new Error(`Operation ${index}: set_region alpha is invalid.`);
      }
      return {
        type,
        x1: op.x1,
        y1: op.y1,
        x2: op.x2,
        y2: op.y2,
        color: op.color.toLowerCase(),
        alpha: op.alpha as number | undefined,
      };
    }

    if (type === 'set_model_type') {
      if (op.modelType !== 'steve' && op.modelType !== 'alex') {
        throw new Error(`Operation ${index}: modelType must be steve or alex.`);
      }
      return {
        type,
        modelType: op.modelType,
      };
    }

    throw new Error(`Operation ${index}: unsupported type.`);
  });

  if (parsedOps.length > MAX_AI_EDIT_OPERATIONS) {
    throw new Error(`Too many operations in one response (max ${MAX_AI_EDIT_OPERATIONS}).`);
  }

  return { message: message.trim(), operations: parsedOps };
}
