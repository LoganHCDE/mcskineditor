import * as THREE from 'three';
import type { BodyPartDef } from './skinLayout';
import { SKIN_WIDTH, SKIN_HEIGHT } from './skinLayout';

/**
 * Creates a BoxGeometry with UV coordinates mapped to the correct
 * regions of a 64x64 Minecraft skin texture.
 *
 * Three.js BoxGeometry face order: +X (right), -X (left), +Y (top), -Y (bottom), +Z (front), -Z (back)
 * Minecraft skin face mapping per body part is defined in skinLayout.ts
 */
export function createSkinPartGeometry(part: BodyPartDef): THREE.BoxGeometry {
  const [w, h, d] = part.size;

  const geo = new THREE.BoxGeometry(w, h, d);
  const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute;
  const uvArray = uvAttr.array as Float32Array;

  const { right, left, top, bottom, front, back } = part.faces;

  // Three.js BoxGeometry face order (each face = 4 vertices = 8 uv floats):
  // index 0: +X face (right side of model = left in skin coords)
  // index 1: -X face (left side of model = right in skin coords)
  // index 2: +Y face (top)
  // index 3: -Y face (bottom)
  // index 4: +Z face (front)
  // index 5: -Z face (back)

  setFaceUV(uvArray, 0, left);    // +X = left side
  setFaceUV(uvArray, 1, right);   // -X = right side
  setFaceUV(uvArray, 2, top);     // +Y = top
  setFaceUV(uvArray, 3, bottom);  // -Y = bottom
  setFaceUV(uvArray, 4, front);   // +Z = front
  setFaceUV(uvArray, 5, back);    // -Z = back

  uvAttr.needsUpdate = true;
  return geo;
}

function setFaceUV(
  uvArray: Float32Array,
  faceIndex: number,
  face: { x1: number; y1: number; x2: number; y2: number }
) {
  const offset = faceIndex * 8; // 4 vertices * 2 components
  const u1 = face.x1 / SKIN_WIDTH;
  const v1 = 1 - face.y1 / SKIN_HEIGHT; // flip Y for UV
  const u2 = face.x2 / SKIN_WIDTH;
  const v2 = 1 - face.y2 / SKIN_HEIGHT;

  // Three.js BoxGeometry vertex order per face:
  // 0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right
  uvArray[offset + 0] = u1;  uvArray[offset + 1] = v1;  // top-left
  uvArray[offset + 2] = u2;  uvArray[offset + 3] = v1;  // top-right
  uvArray[offset + 4] = u1;  uvArray[offset + 5] = v2;  // bottom-left
  uvArray[offset + 6] = u2;  uvArray[offset + 7] = v2;  // bottom-right
}
