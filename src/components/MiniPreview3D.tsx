import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SkinModel from './SkinModel';
import { SceneLighting, GROUND_Y } from './Scene3DEnvironment';

export default function MiniPreview3D() {
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const MODEL_LOOK_SENSITIVITY = 0.4;

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const previewCx = rect.left + rect.width / 2;
      const previewCy = rect.top + rect.height / 2;
      const localNormX = Math.max(-1, Math.min(1, (e.clientX - previewCx) / (rect.width / 2)));
      const localNormY = Math.max(-1, Math.min(1, (e.clientY - previewCy) / (rect.height / 2)));
      const modelNormX = Math.max(
        -1,
        Math.min(1, localNormX * MODEL_LOOK_SENSITIVITY)
      );
      const modelNormY = Math.max(
        -1,
        Math.min(1, localNormY * MODEL_LOOK_SENSITIVITY)
      );
      cursorRef.current = {
        x: modelNormX,
        y: modelNormY,
      };
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  return (
    <div className="mini-preview-3d absolute bottom-3 left-3 z-20 select-none">
      <div className="relative">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -top-2 -right-2 z-30 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--bg-surface)] border border-white/15 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/30 transition-all duration-200 text-[9px] leading-none shadow-lg shadow-black/40"
          title={collapsed ? 'Show 3D preview' : 'Hide 3D preview'}
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
            maxHeight: collapsed ? 0 : 230,
            maxWidth: collapsed ? 0 : 240,
            opacity: collapsed ? 0 : 1,
          }}
        >
          <div className="rounded-xl border border-white/10 bg-[var(--bg-deep)]/85 backdrop-blur-md p-1 shadow-xl shadow-black/40">
            <div ref={containerRef} className="w-[230px] h-[200px] rounded-lg overflow-hidden relative">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center w-full h-full bg-[#08080f] text-[var(--text-muted)]">
                    <div className="w-4 h-4 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
                  </div>
                }
              >
                <Canvas
                  camera={{ position: [0, 0, 40], fov: 50 }}
                  gl={{ antialias: true, alpha: true }}
                  style={{ background: '#08080f' }}
                >
                  <color attach="background" args={['#08080f']} />
                  <SceneLighting backgroundMode="blueprint" />
                  <SkinModel walking={false} lookAtCursor={cursorRef} />
                  <OrbitControls
                    enablePan={false}
                    minDistance={20}
                    maxDistance={80}
                    target={[0, -6, 0]}
                  />
                  <gridHelper
                    args={[40, 20, '#1c1c32', '#141422']}
                    position={[0, GROUND_Y + 0.05, 0]}
                  />
                </Canvas>
              </Suspense>
            </div>
            <div className="text-center text-[8px] text-[var(--text-muted)] mt-0.5 tracking-wider uppercase">
              3D Preview
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
