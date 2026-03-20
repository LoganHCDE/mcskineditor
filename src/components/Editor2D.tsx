import { useRef, useEffect, useCallback, useState } from 'react';
import { useSkinStore } from '../store/useSkinStore';
import { SKIN_WIDTH, SKIN_HEIGHT, getBodyParts, BODY_PART_COLORS, getValidPixelMask, isValidSkinPixelForModel } from '../utils/skinLayout';

const CHECKERBOARD_A = '#1c1c32';
const CHECKERBOARD_B = '#161628';
const INITIAL_PIXEL_SIZE = 8;

export default function Editor2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pixelSize, setPixelSize] = useState(INITIAL_PIXEL_SIZE);
  const [hoverInvalid, setHoverInvalid] = useState(false);
  const isPaintingRef = useRef(false);
  const lastPixelRef = useRef<{ x: number; y: number } | null>(null);

  const skinData = useSkinStore((s) => s.skinData);
  const textureVersion = useSkinStore((s) => s.textureVersion);
  const tool = useSkinStore((s) => s.tool);
  const modelType = useSkinStore((s) => s.modelType);
  const showGrid = useSkinStore((s) => s.showGrid);
  const showBodyPartOutlines = useSkinStore((s) => s.showBodyPartOutlines);
  const showExternalBodyPartOutlines = useSkinStore((s) => s.showExternalBodyPartOutlines);
  const paintPixel = useSkinStore((s) => s.paintPixel);
  const erasePixel = useSkinStore((s) => s.erasePixel);
  const fillArea = useSkinStore((s) => s.fillArea);
  const pickColor = useSkinStore((s) => s.pickColor);
  const pushHistory = useSkinStore((s) => s.pushHistory);

  const canvasWidth = SKIN_WIDTH * pixelSize;
  const canvasHeight = SKIN_HEIGHT * pixelSize;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let y = 0; y < SKIN_HEIGHT; y++) {
      for (let x = 0; x < SKIN_WIDTH; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? CHECKERBOARD_A : CHECKERBOARD_B;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = SKIN_WIDTH;
    tempCanvas.height = SKIN_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(skinData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);

    const validMask = getValidPixelMask(modelType);
    for (let y = 0; y < SKIN_HEIGHT; y++) {
      for (let x = 0; x < SKIN_WIDTH; x++) {
        if (!validMask[y * SKIN_WIDTH + x]) {
          const px = x * pixelSize;
          const py = y * pixelSize;
          // Cover any underlying skin pixel with checkerboard first so color
          // doesn't bleed through the dark overlay below.
          ctx.fillStyle = (x + y) % 2 === 0 ? CHECKERBOARD_A : CHECKERBOARD_B;
          ctx.fillRect(px, py, pixelSize, pixelSize);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(px, py, pixelSize, pixelSize);
          if (pixelSize >= 6) {
            ctx.strokeStyle = 'rgba(100, 100, 140, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px, py + pixelSize);
            ctx.lineTo(px + pixelSize, py);
            ctx.stroke();
          }
        }
      }
    }

    if (showGrid && pixelSize >= 4) {
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.06)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= SKIN_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * pixelSize + 0.5, 0);
        ctx.lineTo(x * pixelSize + 0.5, canvasHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= SKIN_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * pixelSize + 0.5);
        ctx.lineTo(canvasWidth, y * pixelSize + 0.5);
        ctx.stroke();
      }
    }

    const drawPartOutlines = (isOverlay: boolean) => {
      const parts = getBodyParts(modelType).filter((p) => Boolean(p.isOverlay) === isOverlay);
      for (const part of parts) {
        const color = BODY_PART_COLORS[part.name] || '#ffffff';

        const allFaces = Object.values(part.faces);
        const minX = Math.min(...allFaces.map(f => f.x1));
        const minY = Math.min(...allFaces.map(f => f.y1));
        const maxX = Math.max(...allFaces.map(f => f.x2));
        const maxY = Math.max(...allFaces.map(f => f.y2));

        const lw = 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.strokeRect(
          minX * pixelSize + lw / 2,
          minY * pixelSize + lw / 2,
          (maxX - minX) * pixelSize - lw,
          (maxY - minY) * pixelSize - lw
        );

        if (pixelSize >= 6) {
          const fontSize = Math.max(9, Math.min(11, pixelSize));
          ctx.fillStyle = color;
          ctx.font = `bold ${fontSize}px 'DM Sans', system-ui`;
          ctx.globalAlpha = 0.75;
          const labelY = minY === 0
            ? minY * pixelSize + fontSize + 6
            : minY * pixelSize - 3;
          const labelX = minX === 0
            ? minX * pixelSize + 7
            : minX * pixelSize + 3;
          ctx.fillText(part.label, labelX, labelY);
          ctx.globalAlpha = 1;
        }
      }
    };

    if (showBodyPartOutlines) {
      drawPartOutlines(false);
    }

    if (showExternalBodyPartOutlines) {
      drawPartOutlines(true);
    }
  }, [skinData, textureVersion, pixelSize, showGrid, showBodyPartOutlines, showExternalBodyPartOutlines, modelType, canvasWidth, canvasHeight]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recalc = () => {
      const w = container.clientWidth - 48;
      const h = container.clientHeight - 48;
      if (w <= 0 || h <= 0) return;
      const fitW = Math.floor(w / SKIN_WIDTH);
      const fitH = Math.floor(h / SKIN_HEIGHT);
      setPixelSize(Math.max(4, Math.min(fitW, fitH, 12)));
    };

    recalc();
    const obs = new ResizeObserver(recalc);
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  const getPixelCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / pixelSize);
      const y = Math.floor((e.clientY - rect.top) / pixelSize);
      if (x < 0 || x >= SKIN_WIDTH || y < 0 || y >= SKIN_HEIGHT) return null;
      return { x, y };
    },
    [pixelSize]
  );

  const handleMouseMoveHover = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getPixelCoords(e);
      setHoverInvalid(coords ? !isValidSkinPixelForModel(coords.x, coords.y, modelType) : false);
    },
    [getPixelCoords, modelType]
  );

  const applyTool = useCallback(
    (x: number, y: number) => {
      switch (tool) {
        case 'pencil':  paintPixel(x, y); break;
        case 'eraser':  erasePixel(x, y); break;
        case 'fill':    fillArea(x, y); break;
        case 'eyedropper': pickColor(x, y); break;
      }
    },
    [tool, paintPixel, erasePixel, fillArea, pickColor]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const coords = getPixelCoords(e);
      if (!coords) return;

      pushHistory();
      isPaintingRef.current = true;
      lastPixelRef.current = coords;
      applyTool(coords.x, coords.y);
    },
    [getPixelCoords, applyTool, pushHistory]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPaintingRef.current) return;
      if (tool === 'fill' || tool === 'eyedropper') return;

      const coords = getPixelCoords(e);
      if (!coords) return;

      const last = lastPixelRef.current;
      if (last && last.x === coords.x && last.y === coords.y) return;

      if (last) {
        bresenhamLine(last.x, last.y, coords.x, coords.y, (px, py) => {
          applyTool(px, py);
        });
      } else {
        applyTool(coords.x, coords.y);
      }
      lastPixelRef.current = coords;
    },
    [getPixelCoords, applyTool, tool]
  );

  const handleMouseUp = useCallback(() => {
    isPaintingRef.current = false;
    lastPixelRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const getCursor = () => {
    if (hoverInvalid) return 'not-allowed';
    switch (tool) {
      case 'pencil': return 'crosshair';
      case 'eraser': return 'crosshair';
      case 'fill': return 'pointer';
      case 'eyedropper': return 'crosshair';
      default: return 'default';
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full p-6 relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(45,212,191,0.03)_0%,transparent_70%)]" />

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{ imageRendering: 'pixelated', cursor: getCursor() }}
          className="border border-[var(--border-light)] rounded-lg shadow-2xl shadow-black/40 relative z-10"
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => { handleMouseMove(e); handleMouseMoveHover(e); }}
          onMouseLeave={() => setHoverInvalid(false)}
          onContextMenu={(e) => e.preventDefault()}
        />

        <div className="absolute -inset-1 rounded-xl border border-[var(--accent)]/5 pointer-events-none" />
      </div>
    </div>
  );
}

function bresenhamLine(
  x0: number, y0: number, x1: number, y1: number,
  plot: (x: number, y: number) => void
) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}
