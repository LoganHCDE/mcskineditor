export interface FaceUV {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BodyPartFaces {
  top: FaceUV;
  bottom: FaceUV;
  right: FaceUV;
  front: FaceUV;
  left: FaceUV;
  back: FaceUV;
}

export interface BodyPartDef {
  name: string;
  label: string;
  faces: BodyPartFaces;
  size: [number, number, number]; // width, height, depth in pixels
  position: [number, number, number]; // 3D position offset
  isOverlay?: boolean;
}

function face(x1: number, y1: number, x2: number, y2: number): FaceUV {
  return { x1, y1, x2, y2 };
}

function faces(
  top: FaceUV, bottom: FaceUV, right: FaceUV,
  front: FaceUV, left: FaceUV, back: FaceUV
): BodyPartFaces {
  return { top, bottom, right, front, left, back };
}

export type ModelType = 'steve' | 'alex';

export const SKIN_WIDTH = 64;
export const SKIN_HEIGHT = 64;

export const bodyParts: BodyPartDef[] = [
  // === Base layers ===
  {
    name: 'head',
    label: 'Head',
    size: [8, 8, 8],
    position: [0, 4, 0],
    faces: faces(
      face(8, 0, 16, 8),   // top
      face(16, 0, 24, 8),  // bottom
      face(0, 8, 8, 16),   // right
      face(8, 8, 16, 16),  // front
      face(16, 8, 24, 16), // left
      face(24, 8, 32, 16), // back
    ),
  },
  {
    name: 'body',
    label: 'Body',
    size: [8, 12, 4],
    position: [0, -6, 0],
    faces: faces(
      face(20, 16, 28, 20),
      face(28, 16, 36, 20),
      face(16, 20, 20, 32),
      face(20, 20, 28, 32),
      face(28, 20, 32, 32),
      face(32, 20, 40, 32),
    ),
  },
  {
    name: 'rightArm',
    label: 'Right Arm',
    size: [4, 12, 4],
    position: [-6, -6, 0],
    faces: faces(
      face(44, 16, 48, 20),
      face(48, 16, 52, 20),
      face(40, 20, 44, 32),
      face(44, 20, 48, 32),
      face(48, 20, 52, 32),
      face(52, 20, 56, 32),
    ),
  },
  {
    name: 'leftArm',
    label: 'Left Arm',
    size: [4, 12, 4],
    position: [6, -6, 0],
    faces: faces(
      face(36, 48, 40, 52),
      face(40, 48, 44, 52),
      face(32, 52, 36, 64),
      face(36, 52, 40, 64),
      face(40, 52, 44, 64),
      face(44, 52, 48, 64),
    ),
  },
  {
    name: 'rightLeg',
    label: 'Right Leg',
    size: [4, 12, 4],
    position: [-2, -18, 0],
    faces: faces(
      face(4, 16, 8, 20),
      face(8, 16, 12, 20),
      face(0, 20, 4, 32),
      face(4, 20, 8, 32),
      face(8, 20, 12, 32),
      face(12, 20, 16, 32),
    ),
  },
  {
    name: 'leftLeg',
    label: 'Left Leg',
    size: [4, 12, 4],
    position: [2, -18, 0],
    faces: faces(
      face(20, 48, 24, 52),
      face(24, 48, 28, 52),
      face(16, 52, 20, 64),
      face(20, 52, 24, 64),
      face(24, 52, 28, 64),
      face(28, 52, 32, 64),
    ),
  },

  // === Overlay layers ===
  {
    name: 'headOverlay',
    label: 'Hat',
    size: [8, 8, 8],
    position: [0, 4, 0],
    isOverlay: true,
    faces: faces(
      face(40, 0, 48, 8),
      face(48, 0, 56, 8),
      face(32, 8, 40, 16),
      face(40, 8, 48, 16),
      face(48, 8, 56, 16),
      face(56, 8, 64, 16),
    ),
  },
  {
    name: 'bodyOverlay',
    label: 'Jacket',
    size: [8, 12, 4],
    position: [0, -6, 0],
    isOverlay: true,
    faces: faces(
      face(20, 32, 28, 36),
      face(28, 32, 36, 36),
      face(16, 36, 20, 48),
      face(20, 36, 28, 48),
      face(28, 36, 32, 48),
      face(32, 36, 40, 48),
    ),
  },
  {
    name: 'rightArmOverlay',
    label: 'Right Sleeve',
    size: [4, 12, 4],
    position: [-6, -6, 0],
    isOverlay: true,
    faces: faces(
      face(44, 32, 48, 36),
      face(48, 32, 52, 36),
      face(40, 36, 44, 48),
      face(44, 36, 48, 48),
      face(48, 36, 52, 48),
      face(52, 36, 56, 48),
    ),
  },
  {
    name: 'leftArmOverlay',
    label: 'Left Sleeve',
    size: [4, 12, 4],
    position: [6, -6, 0],
    isOverlay: true,
    faces: faces(
      face(52, 48, 56, 52),
      face(56, 48, 60, 52),
      face(48, 52, 52, 64),
      face(52, 52, 56, 64),
      face(56, 52, 60, 64),
      face(60, 52, 64, 64),
    ),
  },
  {
    name: 'rightLegOverlay',
    label: 'Right Pant',
    size: [4, 12, 4],
    position: [-2, -18, 0],
    isOverlay: true,
    faces: faces(
      face(4, 32, 8, 36),
      face(8, 32, 12, 36),
      face(0, 36, 4, 48),
      face(4, 36, 8, 48),
      face(8, 36, 12, 48),
      face(12, 36, 16, 48),
    ),
  },
  {
    name: 'leftLegOverlay',
    label: 'Left Pant',
    size: [4, 12, 4],
    position: [2, -18, 0],
    isOverlay: true,
    faces: faces(
      face(4, 48, 8, 52),
      face(8, 48, 12, 52),
      face(0, 52, 4, 64),
      face(4, 52, 8, 64),
      face(8, 52, 12, 64),
      face(12, 52, 16, 64),
    ),
  },
];

export const OVERLAY_SCALE = 1.07;

// Alex model: arms are 3px wide instead of 4px wide.
// Positions shift inward by 0.5 so arms stay flush with the body edge at ±4.
export const alexBodyParts: BodyPartDef[] = [
  // === Base layers (head, body, legs unchanged) ===
  {
    name: 'head',
    label: 'Head',
    size: [8, 8, 8],
    position: [0, 4, 0],
    faces: faces(
      face(8, 0, 16, 8),
      face(16, 0, 24, 8),
      face(0, 8, 8, 16),
      face(8, 8, 16, 16),
      face(16, 8, 24, 16),
      face(24, 8, 32, 16),
    ),
  },
  {
    name: 'body',
    label: 'Body',
    size: [8, 12, 4],
    position: [0, -6, 0],
    faces: faces(
      face(20, 16, 28, 20),
      face(28, 16, 36, 20),
      face(16, 20, 20, 32),
      face(20, 20, 28, 32),
      face(28, 20, 32, 32),
      face(32, 20, 40, 32),
    ),
  },
  // Alex right arm: W=3, origin (40,16)
  {
    name: 'rightArm',
    label: 'Right Arm',
    size: [3, 12, 4],
    position: [-5.5, -6, 0],
    faces: faces(
      face(44, 16, 47, 20),
      face(47, 16, 50, 20),
      face(40, 20, 44, 32),
      face(44, 20, 47, 32),
      face(47, 20, 51, 32),
      face(51, 20, 54, 32),
    ),
  },
  // Alex left arm: W=3, origin (32,48)
  {
    name: 'leftArm',
    label: 'Left Arm',
    size: [3, 12, 4],
    position: [5.5, -6, 0],
    faces: faces(
      face(36, 48, 39, 52),
      face(39, 48, 42, 52),
      face(32, 52, 36, 64),
      face(36, 52, 39, 64),
      face(39, 52, 43, 64),
      face(43, 52, 46, 64),
    ),
  },
  {
    name: 'rightLeg',
    label: 'Right Leg',
    size: [4, 12, 4],
    position: [-2, -18, 0],
    faces: faces(
      face(4, 16, 8, 20),
      face(8, 16, 12, 20),
      face(0, 20, 4, 32),
      face(4, 20, 8, 32),
      face(8, 20, 12, 32),
      face(12, 20, 16, 32),
    ),
  },
  {
    name: 'leftLeg',
    label: 'Left Leg',
    size: [4, 12, 4],
    position: [2, -18, 0],
    faces: faces(
      face(20, 48, 24, 52),
      face(24, 48, 28, 52),
      face(16, 52, 20, 64),
      face(20, 52, 24, 64),
      face(24, 52, 28, 64),
      face(28, 52, 32, 64),
    ),
  },

  // === Overlay layers ===
  {
    name: 'headOverlay',
    label: 'Hat',
    size: [8, 8, 8],
    position: [0, 4, 0],
    isOverlay: true,
    faces: faces(
      face(40, 0, 48, 8),
      face(48, 0, 56, 8),
      face(32, 8, 40, 16),
      face(40, 8, 48, 16),
      face(48, 8, 56, 16),
      face(56, 8, 64, 16),
    ),
  },
  {
    name: 'bodyOverlay',
    label: 'Jacket',
    size: [8, 12, 4],
    position: [0, -6, 0],
    isOverlay: true,
    faces: faces(
      face(20, 32, 28, 36),
      face(28, 32, 36, 36),
      face(16, 36, 20, 48),
      face(20, 36, 28, 48),
      face(28, 36, 32, 48),
      face(32, 36, 40, 48),
    ),
  },
  // Alex right sleeve: W=3, origin (40,32)
  {
    name: 'rightArmOverlay',
    label: 'Right Sleeve',
    size: [3, 12, 4],
    position: [-5.5, -6, 0],
    isOverlay: true,
    faces: faces(
      face(44, 32, 47, 36),
      face(47, 32, 50, 36),
      face(40, 36, 44, 48),
      face(44, 36, 47, 48),
      face(47, 36, 51, 48),
      face(51, 36, 54, 48),
    ),
  },
  // Alex left sleeve: W=3, origin (48,48)
  {
    name: 'leftArmOverlay',
    label: 'Left Sleeve',
    size: [3, 12, 4],
    position: [5.5, -6, 0],
    isOverlay: true,
    faces: faces(
      face(52, 48, 55, 52),
      face(55, 48, 58, 52),
      face(48, 52, 52, 64),
      face(52, 52, 55, 64),
      face(55, 52, 59, 64),
      face(59, 52, 62, 64),
    ),
  },
  {
    name: 'rightLegOverlay',
    label: 'Right Pant',
    size: [4, 12, 4],
    position: [-2, -18, 0],
    isOverlay: true,
    faces: faces(
      face(4, 32, 8, 36),
      face(8, 32, 12, 36),
      face(0, 36, 4, 48),
      face(4, 36, 8, 48),
      face(8, 36, 12, 48),
      face(12, 36, 16, 48),
    ),
  },
  {
    name: 'leftLegOverlay',
    label: 'Left Pant',
    size: [4, 12, 4],
    position: [2, -18, 0],
    isOverlay: true,
    faces: faces(
      face(4, 48, 8, 52),
      face(8, 48, 12, 52),
      face(0, 52, 4, 64),
      face(4, 52, 8, 64),
      face(8, 52, 12, 64),
      face(12, 52, 16, 64),
    ),
  },
];

export function getBodyParts(modelType: ModelType): BodyPartDef[] {
  return modelType === 'alex' ? alexBodyParts : bodyParts;
}

// Pre-computed flat boolean mask of which pixels belong to a body part face
function buildValidPixelMask(parts: BodyPartDef[]): boolean[] {
  const mask = new Array(SKIN_WIDTH * SKIN_HEIGHT).fill(false);
  for (const part of parts) {
    for (const faceUV of Object.values(part.faces)) {
      for (let y = faceUV.y1; y < faceUV.y2; y++) {
        for (let x = faceUV.x1; x < faceUV.x2; x++) {
          mask[y * SKIN_WIDTH + x] = true;
        }
      }
    }
  }
  return mask;
}

export const VALID_PIXEL_MASK: boolean[] = buildValidPixelMask(bodyParts);
const ALEX_VALID_PIXEL_MASK: boolean[] = buildValidPixelMask(alexBodyParts);

export function getValidPixelMask(modelType: ModelType): boolean[] {
  return modelType === 'alex' ? ALEX_VALID_PIXEL_MASK : VALID_PIXEL_MASK;
}

export function isValidSkinPixel(x: number, y: number): boolean {
  if (x < 0 || x >= SKIN_WIDTH || y < 0 || y >= SKIN_HEIGHT) return false;
  return VALID_PIXEL_MASK[y * SKIN_WIDTH + x];
}

export function isValidSkinPixelForModel(x: number, y: number, modelType: ModelType): boolean {
  if (x < 0 || x >= SKIN_WIDTH || y < 0 || y >= SKIN_HEIGHT) return false;
  return getValidPixelMask(modelType)[y * SKIN_WIDTH + x];
}

// Mirror pairs: painting on one side also paints the corresponding face on the other
const MIRROR_PART_PAIRS: [string, string][] = [
  ['rightArm', 'leftArm'],
  ['rightLeg', 'leftLeg'],
  ['rightArmOverlay', 'leftArmOverlay'],
  ['rightLegOverlay', 'leftLegOverlay'],
];

// When mirroring, right↔left faces swap; other faces are horizontally flipped
const FACE_MIRROR_MAP: Record<string, string> = {
  right: 'left',
  left: 'right',
  front: 'front',
  back: 'back',
  top: 'top',
  bottom: 'bottom',
};

function getMirroredPixelFromParts(
  x: number,
  y: number,
  parts: BodyPartDef[]
): { x: number; y: number } | null {
  for (const part of parts) {
    for (const [faceName, faceUV] of Object.entries(part.faces)) {
      if (x >= faceUV.x1 && x < faceUV.x2 && y >= faceUV.y1 && y < faceUV.y2) {
        const pair = MIRROR_PART_PAIRS.find(([a, b]) => a === part.name || b === part.name);
        if (!pair) return null;

        const mirrorName = pair[0] === part.name ? pair[1] : pair[0];
        const mirrorPart = parts.find((p) => p.name === mirrorName);
        if (!mirrorPart) return null;

        const mirrorFaceName = FACE_MIRROR_MAP[faceName];
        const mirrorFace = mirrorPart.faces[mirrorFaceName as keyof BodyPartFaces];

        const faceWidth = faceUV.x2 - faceUV.x1;
        const offsetX = x - faceUV.x1;
        const offsetY = y - faceUV.y1;
        const flippedOffsetX = faceWidth - 1 - offsetX;

        return {
          x: mirrorFace.x1 + flippedOffsetX,
          y: mirrorFace.y1 + offsetY,
        };
      }
    }
  }
  return null;
}

export function getMirroredPixel(x: number, y: number): { x: number; y: number } | null {
  return getMirroredPixelFromParts(x, y, bodyParts);
}

export function getMirroredPixelForModel(
  x: number,
  y: number,
  modelType: ModelType
): { x: number; y: number } | null {
  return getMirroredPixelFromParts(x, y, getBodyParts(modelType));
}

export type FaceKey = keyof BodyPartFaces;

/** The body-part face (single UV quad) that contains the pixel, if any. */
export function getFaceContainingPixel(
  x: number,
  y: number,
  modelType: ModelType,
): { partName: string; faceKey: FaceKey; uv: FaceUV } | null {
  const parts = getBodyParts(modelType);
  const keys: FaceKey[] = ['top', 'bottom', 'right', 'front', 'left', 'back'];
  for (const part of parts) {
    for (const faceKey of keys) {
      const uv = part.faces[faceKey];
      if (x >= uv.x1 && x < uv.x2 && y >= uv.y1 && y < uv.y2) {
        return { partName: part.name, faceKey, uv };
      }
    }
  }
  return null;
}

/** Corresponding face on the mirrored limb (right arm ↔ left arm, etc.), or null. */
export function getMirroredFaceRegion(
  partName: string,
  faceKey: FaceKey,
  modelType: ModelType,
): FaceUV | null {
  const pair = MIRROR_PART_PAIRS.find(([a, b]) => a === partName || b === partName);
  if (!pair) return null;
  const mirrorName = pair[0] === partName ? pair[1] : pair[0];
  const mirrorPart = getBodyParts(modelType).find((p) => p.name === mirrorName);
  if (!mirrorPart) return null;
  const mirrorFaceName = FACE_MIRROR_MAP[faceKey] as FaceKey;
  return mirrorPart.faces[mirrorFaceName];
}

export const BODY_PART_COLORS: Record<string, string> = {
  head: '#e74c3c',
  body: '#3498db',
  rightArm: '#2ecc71',
  leftArm: '#9b59b6',
  rightLeg: '#f39c12',
  leftLeg: '#1abc9c',
  headOverlay: '#e74c3c80',
  bodyOverlay: '#3498db80',
  rightArmOverlay: '#2ecc7180',
  leftArmOverlay: '#9b59b680',
  rightLegOverlay: '#f39c1280',
  leftLegOverlay: '#1abc9c80',
};
