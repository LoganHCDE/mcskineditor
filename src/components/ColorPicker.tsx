import { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { useSkinStore } from '../store/useSkinStore';
import { isValidSkinPixel } from '../utils/skinLayout';

const PRESET_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff',
  '#9900ff', '#ff00ff', '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3',
  '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc', '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599',
  '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
];

interface ColorPickerProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

export default function ColorPicker({ anchorRef, onClose }: ColorPickerProps) {
  const color = useSkinStore((s) => s.color);
  const alpha = useSkinStore((s) => s.alpha);
  const setColor = useSkinStore((s) => s.setColor);
  const setAlpha = useSkinStore((s) => s.setAlpha);
  const skinData = useSkinStore((s) => s.skinData);
  const textureVersion = useSkinStore((s) => s.textureVersion);

  const [hexInput, setHexInput] = useState(color);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isPickingRef = useRef(false);
  const usedColors = useMemo(() => {
    const counts = new Map<string, number>();
    const data = skinData.data;

    for (let y = 0; y < skinData.height; y++) {
      for (let x = 0; x < skinData.width; x++) {
        if (!isValidSkinPixel(x, y)) continue;
        const i = (y * skinData.width + x) * 4;
        const a = data[i + 3];
        if (a === 0) continue;
        const hex = '#' + [data[i], data[i + 1], data[i + 2]].map((c) => c.toString(16).padStart(2, '0')).join('');
        counts.set(hex, (counts.get(hex) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([hex]) => hex);
  }, [skinData, textureVersion]);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const drawGradient = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    const hueGrad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 360; i += 30) {
      hueGrad.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
    }
    ctx.fillStyle = hueGrad;
    ctx.fillRect(0, 0, w, h);

    const whiteGrad = ctx.createLinearGradient(0, 0, 0, h / 2);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, w, h / 2);

    const blackGrad = ctx.createLinearGradient(0, h / 2, 0, h);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
    blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, w, h);
  }, []);

  useEffect(() => {
    drawGradient();
  }, [drawGradient]);

  const pickFromCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
    const ctx = canvas.getContext('2d')!;
    const pixel = ctx.getImageData(Math.max(0, Math.min(x, canvas.width - 1)), Math.max(0, Math.min(y, canvas.height - 1)), 1, 1).data;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('');
    setColor(hex);
  }, [setColor]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isPickingRef.current = true;
    pickFromCanvas(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPickingRef.current) pickFromCanvas(e);
  };

  useEffect(() => {
    const up = () => { isPickingRef.current = false; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const panel = panelRef.current;
      const anchor = anchorRef.current;
      if (!panel || !anchor) return;
      if (!panel.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [onClose, anchorRef]);

  const handleHexSubmit = () => {
    const cleaned = hexInput.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      setColor(cleaned);
    } else {
      setHexInput(color);
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-1/2 left-[calc(100%+12px)] -translate-y-1/2 z-50 flex flex-col gap-4 bg-[var(--bg-secondary)] border-2 border-[var(--accent)] rounded-xl shadow-2xl"
      style={{ padding: 32, width: 292 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Color</span>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Color swatch + hex */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className="w-10 h-10 rounded-lg border-2 border-[var(--border-light)] shadow-lg"
            style={{
              backgroundColor: color,
              opacity: alpha / 255,
              boxShadow: `0 0 12px ${color}33, inset 0 0 0 1px rgba(255,255,255,0.1)`,
            }}
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-[var(--bg-secondary)]" style={{ backgroundColor: color }} />
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Hex</label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={handleHexSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleHexSubmit()}
              className="flex-1 px-2 py-1 text-xs bg-[var(--bg-deep)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_2px_var(--accent-glow)] font-mono transition-all duration-200"
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Spectrum */}
      <div className="flex flex-col gap-1">
        <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Spectrum</label>
        <canvas
          ref={canvasRef}
          width={228}
          height={40}
          className="rounded-md cursor-crosshair border border-[var(--border)] hover:border-[var(--border-light)] transition-colors w-full"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
        />
      </div>

      {/* Opacity */}
      <div className="flex flex-col gap-1">
        <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
          Opacity <span className="text-[var(--accent)] ml-0.5">{Math.round(alpha / 255 * 100)}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={255}
          value={alpha}
          onChange={(e) => setAlpha(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Colors currently used on the skin */}
      {usedColors.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Colors on Skin</label>
          <div className="flex gap-1 flex-wrap">
            {usedColors.slice(0, 10).map((c, i) => (
              <button
                key={`${c}-${i}`}
                onClick={() => setColor(c)}
                className={`w-[22px] h-[22px] rounded-md border-2 transition-all duration-150 ${
                  c === color
                    ? 'border-[var(--accent)] scale-110 shadow-md shadow-[var(--accent-glow)]'
                    : 'border-[var(--border)] hover:border-[var(--text-muted)] hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      )}

      {/* Preset palette */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Palette</label>
        <div className="flex gap-[3px] flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-[13px] h-[13px] rounded-sm transition-all duration-100 ${
                c === color ? 'ring-1 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-secondary)] scale-150' : 'hover:scale-125'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
