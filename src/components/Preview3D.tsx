import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SkinModel from './SkinModel';
import { MinecraftEnvironment, SceneLighting, GROUND_Y, type BackgroundMode } from './Scene3DEnvironment';

export default function Preview3D() {
  const [holdInPlace, setHoldInPlace] = useState(false);
  const [walking, setWalking] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('blueprint');

  return (
    <div className="w-full h-full relative">
      {backgroundMode === 'blueprint' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.08),transparent_50%),linear-gradient(180deg,#0e0e1a_0%,#08080f_100%)]" />
      )}

      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
        <div className="flex gap-2.5 rounded-2xl border border-white/20 bg-[var(--bg-deep)]/88 backdrop-blur-md px-3.5 py-1.5 shadow-xl shadow-black/35">
          <button
            type="button"
            onClick={() => setHoldInPlace((v) => !v)}
            className={`flex shrink-0 items-center justify-center gap-2.5 px-5 py-1.5 h-10 min-w-[118px] whitespace-nowrap text-sm leading-5 font-semibold rounded-xl border shadow-sm shadow-black/25 transition-all duration-200 ${
              holdInPlace
                ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]'
                : 'bg-[var(--bg-surface)]/45 border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/8'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {holdInPlace ? (
                <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>
              ) : (
                <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></>
              )}
            </svg>
            {holdInPlace ? 'Locked' : 'Rotate'}
          </button>

          <button
            type="button"
            onClick={() => setWalking((v) => !v)}
            className={`flex shrink-0 items-center justify-center gap-2.5 px-5 py-1.5 h-10 min-w-[104px] whitespace-nowrap text-sm leading-5 font-semibold rounded-xl border shadow-sm shadow-black/25 transition-all duration-200 ${
              walking
                ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]'
                : 'bg-[var(--bg-surface)]/45 border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/8'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1" />
              <path d="m9 20 3-6 3 6" />
              <path d="m6 8 6 2 6-2" />
              <path d="M12 10v4" />
            </svg>
            {walking ? 'Stop' : 'Walk'}
          </button>

          <div className="w-px h-6 bg-white/20 self-center mx-1.5" />

          <button
            type="button"
            onClick={() =>
              setBackgroundMode((mode) => (mode === 'blueprint' ? 'minecraft' : 'blueprint'))
            }
            className="flex shrink-0 items-center justify-center gap-2.5 px-5 py-1.5 h-10 min-w-[220px] whitespace-nowrap text-sm leading-5 font-semibold rounded-xl border border-white/10 bg-[var(--bg-surface)]/45 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/8 shadow-sm shadow-black/25 transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            {backgroundMode === 'blueprint'
              ? 'Minecraft background'
              : 'Blueprint background'}
          </button>
        </div>
      </div>

      <Canvas
        camera={{ position: [0, 0, 40], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        className="relative z-10"
      >
        <color
          attach="background"
          args={[backgroundMode === 'minecraft' ? '#73a9f8' : '#08080f']}
        />
        {backgroundMode === 'minecraft' && <MinecraftEnvironment />}

        <SceneLighting backgroundMode={backgroundMode} />

        <SkinModel walking={walking} />

        <OrbitControls
          enablePan={false}
          minDistance={20}
          maxDistance={80}
          target={[0, -6, 0]}
          autoRotate={!holdInPlace}
          autoRotateSpeed={0.5}
        />

        {backgroundMode === 'blueprint' && (
          <gridHelper
            args={[40, 20, '#1c1c32', '#141422']}
            position={[0, GROUND_Y + 0.05, 0]}
          />
        )}
      </Canvas>

      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg-deep)]/60 backdrop-blur-sm px-2.5 py-1 rounded-lg z-20 select-none border border-white/5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
          <path d="M15 3h6v6" /><path d="M14 10 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
        Drag to rotate &middot; Scroll to zoom
      </div>
    </div>
  );
}
