import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSkinStore } from '../store/useSkinStore';
import { getBodyParts, OVERLAY_SCALE, SKIN_WIDTH, SKIN_HEIGHT } from '../utils/skinLayout';
import { createSkinPartGeometry } from '../utils/bodyPartGeometry';
import { imageDataToCanvas } from '../utils/textureUtils';
import {
  MinecraftEnvironment,
  SceneLighting,
  GROUND_Y,
  type BackgroundMode,
} from './Scene3DEnvironment';
import MiniTextureMap from './MiniTextureMap';

const UV_EPSILON = 1e-6;

function uvToPixelStable(
  uv: THREE.Vector2 | undefined,
): { x: number; y: number } | null {
  if (!uv) return null;
  const clampedU = THREE.MathUtils.clamp(uv.x, UV_EPSILON, 1 - UV_EPSILON);
  const clampedV = THREE.MathUtils.clamp(uv.y, UV_EPSILON, 1 - UV_EPSILON);
  const x = THREE.MathUtils.clamp(
    Math.floor(clampedU * SKIN_WIDTH),
    0,
    SKIN_WIDTH - 1,
  );
  const y = THREE.MathUtils.clamp(
    Math.floor((1 - clampedV) * SKIN_HEIGHT),
    0,
    SKIN_HEIGHT - 1,
  );
  return { x, y };
}

function getPlaneNormalKey(normal: THREE.Vector3): string {
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);
  if (absX >= absY && absX >= absZ) return normal.x >= 0 ? 'x+' : 'x-';
  if (absY >= absX && absY >= absZ) return normal.y >= 0 ? 'y+' : 'y-';
  return normal.z >= 0 ? 'z+' : 'z-';
}

interface HoverInfo {
  point: [number, number, number];
  normal: [number, number, number];
  pixel: { x: number; y: number };
}

function HoverIndicator({
  point,
  normal,
}: {
  point: [number, number, number];
  normal: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    const n = new THREE.Vector3(...normal);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      n,
    );
    meshRef.current.quaternion.copy(q);
  }, [normal[0], normal[1], normal[2]]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.55 + Math.sin(state.clock.getElapsedTime() * 5) * 0.25;
  });

  return (
    <mesh ref={meshRef} position={point} renderOrder={999}>
      <ringGeometry args={[0.3, 0.52, 16]} />
      <meshBasicMaterial
        color="#2dd4bf"
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        depthTest={false}
      />
    </mesh>
  );
}


function PaintableSkinModel({
  onHoverPixelChange,
}: {
  onHoverPixelChange: (pixel: { x: number; y: number } | null) => void;
}) {
  const skinData = useSkinStore((s) => s.skinData);
  const textureVersion = useSkinStore((s) => s.textureVersion);
  const modelType = useSkinStore((s) => s.modelType);
  const tool = useSkinStore((s) => s.tool);
  const paintPixel = useSkinStore((s) => s.paintPixel);
  const erasePixel = useSkinStore((s) => s.erasePixel);
  const fillArea = useSkinStore((s) => s.fillArea);
  const pickColor = useSkinStore((s) => s.pickColor);
  const pushHistory = useSkinStore((s) => s.pushHistory);
  const invalidate = useThree((s) => s.invalidate);

  const isPaintingRef = useRef(false);
  const activePaintPlaneRef = useRef<string | null>(null);
  const activePaintOverlayRef = useRef<boolean | null>(null);
  const paintedPixelsRef = useRef<Set<string>>(new Set());
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const texture = useMemo(() => {
    const canvas = imageDataToCanvas(skinData);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skinData, textureVersion]);

  useEffect(() => {
    invalidate();
    return () => {
      texture.dispose();
    };
  }, [texture, invalidate]);

  const geometries = useMemo(
    () =>
      getBodyParts(modelType).map((part) => ({
        part,
        geometry: createSkinPartGeometry(part),
      })),
    [modelType],
  );

  const applyTool = useCallback(
    (x: number, y: number) => {
      switch (tool) {
        case 'pencil':
          paintPixel(x, y);
          break;
        case 'eraser':
          erasePixel(x, y);
          break;
        case 'fill':
          fillArea(x, y);
          break;
        case 'eyedropper':
          pickColor(x, y);
          break;
      }
    },
    [tool, paintPixel, erasePixel, fillArea, pickColor],
  );

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.nativeEvent.button !== 0) return;
      e.stopPropagation();
      const pixel = uvToPixelStable(e.uv);
      if (!pixel || !e.face) return;
      const normal = e.face.normal.clone();
      normal.transformDirection(e.object.matrixWorld);
      const isOverlay = Boolean((e.object as THREE.Mesh).userData?.isOverlay);

      pushHistory();
      isPaintingRef.current = true;
      activePaintPlaneRef.current = getPlaneNormalKey(normal);
      activePaintOverlayRef.current = isOverlay;
      paintedPixelsRef.current.clear();
      paintedPixelsRef.current.add(`${pixel.x},${pixel.y}`);
      applyTool(pixel.x, pixel.y);
    },
    [applyTool, pushHistory],
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const primaryHit = e.intersections[0];
      if (primaryHit && primaryHit.object !== e.object) return;
      if (isPaintingRef.current) {
        e.stopPropagation();
      }

      const pixel = uvToPixelStable(e.uv);

      if (pixel && e.face) {
        const normal = e.face.normal.clone();
        if (e.object) {
          normal.transformDirection(e.object.matrixWorld);
        }
        const offset = normal.clone().multiplyScalar(0.08);
        const pos = e.point.clone().add(offset);
        setHoverInfo({
          point: [pos.x, pos.y, pos.z],
          normal: [normal.x, normal.y, normal.z],
          pixel,
        });
        onHoverPixelChange(pixel);
      }

      if (!isPaintingRef.current) return;
      if (tool === 'fill' || tool === 'eyedropper') return;
      if (!pixel || !e.face) return;

      const activePlane = activePaintPlaneRef.current;
      const activeOverlay = activePaintOverlayRef.current;
      if (!activePlane || activeOverlay == null) return;

      const currentNormal = e.face.normal.clone();
      currentNormal.transformDirection(e.object.matrixWorld);
      const currentPlane = getPlaneNormalKey(currentNormal);
      if (currentPlane !== activePlane) return;

      const isOverlay = Boolean((e.object as THREE.Mesh).userData?.isOverlay);
      if (isOverlay !== activeOverlay) return;

      const pixelKey = `${pixel.x},${pixel.y}`;
      if (paintedPixelsRef.current.has(pixelKey)) return;
      paintedPixelsRef.current.add(pixelKey);
      applyTool(pixel.x, pixel.y);
    },
    [applyTool, tool, onHoverPixelChange],
  );

  const handlePointerUp = useCallback(() => {
    isPaintingRef.current = false;
    activePaintPlaneRef.current = null;
    activePaintOverlayRef.current = null;
    paintedPixelsRef.current.clear();
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoverInfo(null);
    onHoverPixelChange(null);
  }, [onHoverPixelChange]);

  useEffect(() => {
    const handler = () => {
      isPaintingRef.current = false;
      activePaintPlaneRef.current = null;
      activePaintOverlayRef.current = null;
      paintedPixelsRef.current.clear();
    };
    window.addEventListener('mouseup', handler);
    window.addEventListener('pointerup', handler);
    return () => {
      window.removeEventListener('mouseup', handler);
      window.removeEventListener('pointerup', handler);
    };
  }, []);

  return (
    <group>
      {geometries.map(({ part, geometry }) => {
        const scale = part.isOverlay ? OVERLAY_SCALE : 1;
        return (
          <mesh
            key={part.name}
            geometry={geometry}
            position={[part.position[0], part.position[1], part.position[2]]}
            scale={[scale, scale, scale]}
            userData={{ isOverlay: Boolean(part.isOverlay) }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          >
            <meshStandardMaterial
              map={texture}
              transparent={!!part.isOverlay}
              alphaTest={part.isOverlay ? 0.01 : 0}
              side={part.isOverlay ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>
        );
      })}

      {hoverInfo && (
        <HoverIndicator point={hoverInfo.point} normal={hoverInfo.normal} />
      )}
    </group>
  );
}

export default function Editor3D() {
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(
    'blueprint',
  );
  const tool = useSkinStore((s) => s.tool);
  const [hoverPixel, setHoverPixel] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [allowLeftRotate, setAllowLeftRotate] = useState(true);

  const handleHoverPixelChange = useCallback(
    (pixel: { x: number; y: number } | null) => {
      setAllowLeftRotate(!pixel);
      setHoverPixel((prev) => {
        if (!pixel && !prev) return prev;
        if (pixel && prev && pixel.x === prev.x && pixel.y === prev.y)
          return prev;
        return pixel;
      });
    },
    [],
  );

  const getCursor = () => {
    switch (tool) {
      case 'pencil':
      case 'eraser':
      case 'eyedropper':
        return 'crosshair';
      case 'fill':
        return 'pointer';
      default:
        return 'default';
    }
  };

  return (
    <div
      className="w-full h-full relative"
      style={{ cursor: getCursor() }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {backgroundMode === 'blueprint' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.08),transparent_50%),linear-gradient(180deg,#0e0e1a_0%,#08080f_100%)]" />
      )}

      <div className="absolute top-4 right-4 z-20">
        <div className="flex gap-2 rounded-2xl border border-white/20 bg-[var(--bg-deep)]/88 backdrop-blur-md px-3 py-1.5 shadow-xl shadow-black/35">
          <button
            type="button"
            onClick={() =>
              setBackgroundMode((m) =>
                m === 'blueprint' ? 'minecraft' : 'blueprint',
              )
            }
            className="flex shrink-0 items-center justify-center gap-2.5 min-w-[220px] px-6 py-1 h-8 whitespace-nowrap text-sm leading-none font-semibold rounded-lg border border-white/10 bg-[var(--bg-surface)]/45 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/8 shadow-sm shadow-black/25 transition-all duration-200"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
        onPointerMissed={() => handleHoverPixelChange(null)}
      >
        <color
          attach="background"
          args={[backgroundMode === 'minecraft' ? '#73a9f8' : '#08080f']}
        />
        {backgroundMode === 'minecraft' && <MinecraftEnvironment />}

        <SceneLighting backgroundMode={backgroundMode} />

        <PaintableSkinModel onHoverPixelChange={handleHoverPixelChange} />

        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={20}
          maxDistance={80}
          target={[0, -6, 0]}
          autoRotate={false}
          mouseButtons={{
            LEFT: allowLeftRotate ? THREE.MOUSE.ROTATE : undefined,
            RIGHT: THREE.MOUSE.ROTATE,
          }}
        />

        {backgroundMode === 'blueprint' && (
          <gridHelper
            args={[40, 20, '#1c1c32', '#141422']}
            position={[0, GROUND_Y + 0.05, 0]}
          />
        )}
      </Canvas>

      <MiniTextureMap highlightPixel={hoverPixel} />

      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg-deep)]/60 backdrop-blur-sm px-2.5 py-1 rounded-lg z-20 select-none border border-white/5">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-50"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
        Left-click on model to paint &middot; Left-drag on background or
        right-drag to rotate &middot; Scroll to zoom
      </div>
    </div>
  );
}
