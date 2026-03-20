import { useMemo } from 'react';

interface SkinDiffPreviewProps {
  base: ImageData | null;
  draft: ImageData | null;
  changedPixelCount: number;
}

function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

export default function SkinDiffPreview({ base, draft, changedPixelCount }: SkinDiffPreviewProps) {
  const baseUrl = useMemo(() => (base ? imageDataToDataUrl(base) : ''), [base]);
  const draftUrl = useMemo(() => (draft ? imageDataToDataUrl(draft) : ''), [draft]);

  const changedPercent = useMemo(() => {
    const total = 64 * 64;
    return ((changedPixelCount / total) * 100).toFixed(1);
  }, [changedPixelCount]);

  if (!base || !draft) {
    return null;
  }

  return (
    <div className="diff-preview">
      <div className="diff-preview__header">
        <div className="diff-preview__label">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3l2 2" />
          </svg>
          Pending changes
        </div>
        <div className="diff-preview__stat">
          <span className="diff-preview__count">{changedPixelCount}</span>
          <span className="diff-preview__percent">px ({changedPercent}%)</span>
        </div>
      </div>
      <div className="diff-preview__grid">
        <div className="diff-preview__card">
          <div className="diff-preview__card-label">Before</div>
          {baseUrl && (
            <img
              src={baseUrl}
              alt="Base skin"
              className="diff-preview__img"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
        </div>
        <div className="diff-preview__arrow">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h10M10 5l3 3-3 3" />
          </svg>
        </div>
        <div className="diff-preview__card diff-preview__card--draft">
          <div className="diff-preview__card-label diff-preview__card-label--draft">Draft</div>
          {draftUrl && (
            <img
              src={draftUrl}
              alt="Draft skin"
              className="diff-preview__img"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
