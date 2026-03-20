import { useRef, useEffect, useCallback, useState } from 'react';
import { useSkinStore } from '../store/useSkinStore';
import { SKIN_WIDTH, SKIN_HEIGHT } from '../utils/skinLayout';

const MAP_SCALE = 3;
const MAP_W = SKIN_WIDTH * MAP_SCALE;
const MAP_H = SKIN_HEIGHT * MAP_SCALE;

interface MiniTextureMapProps {
  highlightPixel?: { x: number; y: number } | null;
}

export default function MiniTextureMap({ highlightPixel }: MiniTextureMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skinData = useSkinStore((s) => s.skinData);
  const textureVersion = useSkinStore((s) => s.textureVersion);
  const [collapsed, setCollapsed] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, MAP_W, MAP_H);

    ctx.fillStyle = '#0c0c18';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    const tmp = document.createElement('canvas');
    tmp.width = SKIN_WIDTH;
    tmp.height = SKIN_HEIGHT;
    const tmpCtx = tmp.getContext('2d')!;
    tmpCtx.putImageData(skinData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, MAP_W, MAP_H);

    if (highlightPixel) {
      const px = highlightPixel.x * MAP_SCALE;
      const py = highlightPixel.y * MAP_SCALE;
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 0.5, py + 0.5, MAP_SCALE - 1, MAP_SCALE - 1);
      ctx.fillStyle = 'rgba(45, 212, 191, 0.3)';
      ctx.fillRect(px, py, MAP_SCALE, MAP_SCALE);
    }
  }, [skinData, textureVersion, highlightPixel]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="mini-texture-map absolute bottom-3 left-3 z-20 select-none">
      <div className="relative">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -top-2 -right-2 z-30 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--bg-surface)] border border-white/15 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/30 transition-all duration-200 text-[9px] leading-none shadow-lg shadow-black/40"
          title={collapsed ? 'Show texture map' : 'Hide texture map'}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: collapsed ? 'rotate(180deg)' : undefined,
              transition: 'transform 200ms ease',
            }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div
          className="overflow-hidden transition-all duration-300 ease-out"
          style={{
            maxHeight: collapsed ? 0 : MAP_H + 8,
            opacity: collapsed ? 0 : 1,
          }}
        >
          <div className="rounded-xl border border-white/10 bg-[var(--bg-deep)]/85 backdrop-blur-md p-1 shadow-xl shadow-black/40">
            <canvas
              ref={canvasRef}
              width={MAP_W}
              height={MAP_H}
              className="rounded-lg block"
              style={{ imageRendering: 'pixelated', width: MAP_W, height: MAP_H }}
            />
            <div className="text-center text-[8px] text-[var(--text-muted)] mt-0.5 tracking-wider uppercase">
              Texture Map
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
