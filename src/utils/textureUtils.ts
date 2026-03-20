import { SKIN_WIDTH, SKIN_HEIGHT } from './skinLayout';

export type RGBA = [number, number, number, number];

export function createBlankSkin(): ImageData {
  return new ImageData(SKIN_WIDTH, SKIN_HEIGHT);
}

export function cloneImageData(src: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
}

export function getPixel(img: ImageData, x: number, y: number): RGBA {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}

export function setPixel(img: ImageData, x: number, y: number, color: RGBA): void {
  const i = (y * img.width + x) * 4;
  img.data[i] = color[0];
  img.data[i + 1] = color[1];
  img.data[i + 2] = color[2];
  img.data[i + 3] = color[3];
}

export function colorsEqual(a: RGBA, b: RGBA): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export function floodFill(
  img: ImageData,
  startX: number,
  startY: number,
  fillColor: RGBA,
  isValid?: (x: number, y: number) => boolean,
): ImageData {
  const result = cloneImageData(img);
  const targetColor = getPixel(result, startX, startY);

  if (colorsEqual(targetColor, fillColor)) return result;

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<number>();
  const stride = img.width;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = y * stride + x;

    if (visited.has(key)) continue;
    if (x < 0 || x >= img.width || y < 0 || y >= img.height) continue;
    if (isValid && !isValid(x, y)) continue;

    const current = getPixel(result, x, y);
    if (!colorsEqual(current, targetColor)) continue;

    visited.add(key);
    setPixel(result, x, y, fillColor);

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return result;
}

/** Paint every pixel in an axis-aligned UV rectangle (x1,y1 inclusive; x2,y2 exclusive). */
export function fillRectPixels(
  img: ImageData,
  rect: { x1: number; y1: number; x2: number; y2: number },
  color: RGBA,
  isValid?: (x: number, y: number) => boolean,
): void {
  for (let y = rect.y1; y < rect.y2; y++) {
    for (let x = rect.x1; x < rect.x2; x++) {
      if (isValid && !isValid(x, y)) continue;
      setPixel(img, x, y, color);
    }
  }
}

export function hexToRgba(hex: string, alpha = 255): RGBA {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, alpha];
}

export function rgbaToHex(rgba: RGBA): string {
  return '#' + rgba.slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('');
}

export function imageDataToCanvas(img: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function imageDataToDataURL(img: ImageData): string {
  return imageDataToCanvas(img).toDataURL('image/png');
}

/** PNG data URL for LLM vision APIs (`data:image/png;base64,...`). */
export function imageDataToPngDataUrl(img: ImageData): string {
  return imageDataToDataURL(img);
}

export function downloadSkin(img: ImageData, filename = 'minecraft-skin.png'): void {
  const url = imageDataToDataURL(img);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

function convertOldSkinFormat(imgData: ImageData): void {
  function copyRegionFlippedH(
    srcX: number, srcY: number, w: number, h: number,
    dstX: number, dstY: number,
  ) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = ((srcY + y) * SKIN_WIDTH + (srcX + x)) * 4;
        const di = ((dstY + y) * SKIN_WIDTH + (dstX + w - 1 - x)) * 4;
        imgData.data[di]     = imgData.data[si];
        imgData.data[di + 1] = imgData.data[si + 1];
        imgData.data[di + 2] = imgData.data[si + 2];
        imgData.data[di + 3] = imgData.data[si + 3];
      }
    }
  }

  // Right leg → Left leg (mirrored)
  copyRegionFlippedH(4, 16, 4, 4, 20, 48);   // top
  copyRegionFlippedH(8, 16, 4, 4, 24, 48);   // bottom
  copyRegionFlippedH(0, 20, 4, 12, 24, 52);  // right → left
  copyRegionFlippedH(4, 20, 4, 12, 20, 52);  // front
  copyRegionFlippedH(8, 20, 4, 12, 16, 52);  // left → right
  copyRegionFlippedH(12, 20, 4, 12, 28, 52); // back

  // Right arm → Left arm (mirrored)
  copyRegionFlippedH(44, 16, 4, 4, 36, 48);  // top
  copyRegionFlippedH(48, 16, 4, 4, 40, 48);  // bottom
  copyRegionFlippedH(40, 20, 4, 12, 40, 52); // right → left
  copyRegionFlippedH(44, 20, 4, 12, 36, 52); // front
  copyRegionFlippedH(48, 20, 4, 12, 32, 52); // left → right
  copyRegionFlippedH(52, 20, 4, 12, 44, 52); // back
}

function loadImageToSkin(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = SKIN_WIDTH;
  canvas.height = SKIN_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
  const imgData = ctx.getImageData(0, 0, SKIN_WIDTH, SKIN_HEIGHT);

  if (img.naturalHeight === 32 && img.naturalWidth === 64) {
    convertOldSkinFormat(imgData);
  }

  return imgData;
}

export function loadImageFile(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(loadImageToSkin(img));
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function loadImageFromUrl(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(loadImageToSkin(img));
    img.onerror = reject;
    img.src = url;
  });
}

/** Static file under `public/`, respecting Vite `base` (e.g. GitHub Pages subpaths). */
export function publicAssetUrl(path: string): string {
  const trimmed = path.replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${trimmed}`;
}

export function createDefaultSkin(): ImageData {
  const img = createBlankSkin();
  const skinColor: RGBA = [200, 170, 140, 255];
  const shirtColor: RGBA = [60, 140, 200, 255];
  const pantsColor: RGBA = [50, 50, 120, 255];
  const hairColor: RGBA = [80, 50, 30, 255];
  const eyeWhite: RGBA = [255, 255, 255, 255];
  const eyePupil: RGBA = [40, 30, 80, 255];
  const mouthColor: RGBA = [150, 100, 80, 255];
  const shoeColor: RGBA = [60, 40, 30, 255];

  function fillRect(x1: number, y1: number, x2: number, y2: number, color: RGBA) {
    for (let y = y1; y < y2; y++)
      for (let x = x1; x < x2; x++)
        setPixel(img, x, y, color);
  }

  // Head - skin
  fillRect(0, 8, 32, 16, skinColor);
  fillRect(8, 0, 24, 8, skinColor);

  // Hair on top
  fillRect(8, 0, 16, 2, hairColor);

  // Eyes on front face (8,8)-(16,16) — eyes at row 12
  setPixel(img, 10, 12, eyeWhite);
  setPixel(img, 11, 12, eyePupil);
  setPixel(img, 13, 12, eyeWhite);
  setPixel(img, 14, 12, eyePupil);

  // Mouth
  setPixel(img, 11, 14, mouthColor);
  setPixel(img, 12, 14, mouthColor);
  setPixel(img, 13, 14, mouthColor);

  // Body - shirt
  fillRect(16, 20, 40, 32, shirtColor);
  fillRect(20, 16, 36, 20, shirtColor);

  // Right arm - skin + shirt
  fillRect(40, 20, 56, 32, shirtColor);
  fillRect(44, 16, 52, 20, shirtColor);
  fillRect(44, 28, 48, 32, skinColor); // hand
  fillRect(40, 28, 44, 32, skinColor);
  fillRect(48, 28, 52, 32, skinColor);
  fillRect(52, 28, 56, 32, skinColor);

  // Left arm
  fillRect(32, 52, 48, 64, shirtColor);
  fillRect(36, 48, 44, 52, shirtColor);
  fillRect(36, 60, 40, 64, skinColor);
  fillRect(32, 60, 36, 64, skinColor);
  fillRect(40, 60, 44, 64, skinColor);
  fillRect(44, 60, 48, 64, skinColor);

  // Right leg - pants
  fillRect(0, 20, 16, 32, pantsColor);
  fillRect(4, 16, 12, 20, pantsColor);
  fillRect(4, 28, 8, 32, shoeColor); // shoe
  fillRect(0, 28, 4, 32, shoeColor);
  fillRect(8, 28, 12, 32, shoeColor);
  fillRect(12, 28, 16, 32, shoeColor);

  // Left leg
  fillRect(16, 52, 32, 64, pantsColor);
  fillRect(20, 48, 28, 52, pantsColor);
  fillRect(20, 60, 24, 64, shoeColor);
  fillRect(16, 60, 20, 64, shoeColor);
  fillRect(24, 60, 28, 64, shoeColor);
  fillRect(28, 60, 32, 64, shoeColor);

  return img;
}
