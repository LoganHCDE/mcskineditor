import type { ModelType } from '../store/useSkinStore';
import { SKIN_HEIGHT, SKIN_WIDTH } from '../utils/skinLayout';

const EXPECTED_BYTE_LEN = SKIN_WIDTH * SKIN_HEIGHT * 4;

function uint8ToBase64(u8: Uint8Array): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

function rgbaToHex8(r: number, g: number, b: number, a: number): string {
  return `#${[r, g, b, a].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function serializeSkinPixelsDebug(imageData: ImageData): string[][] {
  const rows: string[][] = [];
  for (let y = 0; y < imageData.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < imageData.width; x++) {
      const i = (y * imageData.width + x) * 4;
      row.push(
        rgbaToHex8(
          imageData.data[i],
          imageData.data[i + 1],
          imageData.data[i + 2],
          imageData.data[i + 3]
        )
      );
    }
    rows.push(row);
  }
  return rows;
}

export function validateDecodedRgbaBase64(base64: string): void {
  const t = base64.trim();
  if (!t) throw new Error('pixelsRgbaBase64 is empty.');
  let binary: string;
  try {
    binary = atob(t);
  } catch {
    throw new Error('pixelsRgbaBase64 is not valid base64.');
  }
  if (binary.length !== EXPECTED_BYTE_LEN) {
    throw new Error(`pixelsRgbaBase64 decodes to ${binary.length} bytes; expected ${EXPECTED_BYTE_LEN}.`);
  }
}

export interface BuildSkinLlmPayloadInput {
  instruction: string;
  modelType: ModelType;
  imageData: ImageData;
  /** Verbose 64×64 #RRGGBBAA grid for debugging; omit in production requests. */
  includeSkinPixelsDebug?: boolean;
}

/**
 * Versioned user JSON for skin-edit LLM calls. Primary skin encoding is raw RGBA base64
 * (row-major, 64×64, 4 bytes per pixel) — smaller than a hex grid in the prompt.
 */
export function buildSkinLlmPayload(input: BuildSkinLlmPayloadInput): Record<string, unknown> {
  const { instruction, modelType, imageData, includeSkinPixelsDebug } = input;
  if (imageData.width !== SKIN_WIDTH || imageData.height !== SKIN_HEIGHT) {
    throw new Error(`Skin must be ${SKIN_WIDTH}×${SKIN_HEIGHT} ImageData.`);
  }
  const raw = new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength);
  if (raw.byteLength !== EXPECTED_BYTE_LEN) {
    throw new Error('Unexpected ImageData buffer size.');
  }
  const pixelsRgbaBase64 = uint8ToBase64(raw);
  validateDecodedRgbaBase64(pixelsRgbaBase64);

  const payload: Record<string, unknown> = {
    schemaVersion: 1,
    instruction,
    modelType,
    pixelsRgbaBase64,
    encodingNote: `Raw RGBA row-major, width ${SKIN_WIDTH}, height ${SKIN_HEIGHT}, ${EXPECTED_BYTE_LEN} bytes before base64.`,
  };
  if (includeSkinPixelsDebug) {
    payload.skinPixels = serializeSkinPixelsDebug(imageData);
    payload.skinPixelsNote = 'Optional debug: 64×64 matrix of #RRGGBBAA hex strings, row-major.';
  }
  return payload;
}
