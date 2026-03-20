import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type BackgroundMode = 'blueprint' | 'minecraft';
export const GROUND_Y = -24.5;

export function createPixelTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  draw(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function pixelHash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 12345) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) & 0xff) / 255;
}

function createGrassTopTexture() {
  return createPixelTexture((ctx, size) => {
    const shades = ['#6A9E3C', '#72A842', '#7AB349', '#80BA50', '#87C156'];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = pixelHash(x, y, 0);
        const idx = v < 0.08 ? 0 : v < 0.25 ? 1 : v < 0.55 ? 2 : v < 0.82 ? 3 : 4;
        ctx.fillStyle = shades[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

function createSunTexture() {
  return createPixelTexture((ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    const square = Math.floor(size * 0.36);
    const start = Math.floor((size - square) / 2);
    ctx.fillStyle = '#fffbd1';
    ctx.fillRect(start, start, square, square);
    ctx.fillStyle = '#fff0a6';
    ctx.fillRect(start + 1, start + 1, square - 2, square - 2);
  }, 64);
}

const CLOUD_CELL = 5;
const CLOUD_GRID = 64;
const CLOUD_Y = 70;

function MinecraftClouds() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const cloudBlocks = useMemo(() => {
    const blocks: [number, number][] = [];
    for (let z = 0; z < CLOUD_GRID; z++) {
      for (let x = 0; x < CLOUD_GRID; x++) {
        const cluster = pixelHash(Math.floor(x / 9), Math.floor(z / 6), 888);
        const medium = pixelHash(Math.floor(x / 4), Math.floor(z / 3), 999);
        const detail = pixelHash(x, z, 777);
        if (cluster * 0.45 + medium * 0.35 + detail * 0.2 > 0.53) {
          blocks.push([x - CLOUD_GRID / 2, z - CLOUD_GRID / 2]);
        }
      }
    }
    return blocks;
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    cloudBlocks.forEach(([x, z], i) => {
      dummy.position.set(x * CLOUD_CELL, 0, z * CLOUD_CELL);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [cloudBlocks]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.position.x += delta * 1.5;
    const halfSpan = (CLOUD_GRID / 2) * CLOUD_CELL;
    if (meshRef.current.position.x > halfSpan) {
      meshRef.current.position.x -= halfSpan * 2;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, cloudBlocks.length]}
      position={[0, CLOUD_Y, 0]}
      frustumCulled={false}
    >
      <boxGeometry args={[CLOUD_CELL, 4, CLOUD_CELL]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={0.08}
        roughness={1}
        metalness={0}
      />
    </instancedMesh>
  );
}

export function MinecraftEnvironment() {
  const { grassTopTexture, sunTexture } = useMemo(() => {
    const grassTop = createGrassTopTexture();
    const sun = createSunTexture();

    const groundRepeat = 40;
    grassTop.wrapS = THREE.RepeatWrapping;
    grassTop.wrapT = THREE.RepeatWrapping;
    grassTop.repeat.set(groundRepeat, groundRepeat);

    return { grassTopTexture: grassTop, sunTexture: sun };
  }, []);

  useEffect(() => {
    return () => {
      grassTopTexture.dispose();
      sunTexture.dispose();
    };
  }, [grassTopTexture, sunTexture]);

  return (
    <>
      <fog attach="fog" args={['#7fb2ff', 90, 360]} />

      <mesh position={[0, GROUND_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[320, 320]} />
        <meshStandardMaterial map={grassTopTexture} roughness={1} metalness={0} />
      </mesh>

      <sprite position={[95, 88, -170]} scale={[54, 54, 1]}>
        <spriteMaterial map={sunTexture} transparent depthWrite={false} toneMapped={false} />
      </sprite>

      <MinecraftClouds />
    </>
  );
}

export function SceneLighting({ backgroundMode }: { backgroundMode: BackgroundMode }) {
  return (
    <>
      <ambientLight intensity={backgroundMode === 'minecraft' ? 0.82 : 0.7} />
      <directionalLight
        position={backgroundMode === 'minecraft' ? [20, 30, 18] : [10, 15, 10]}
        intensity={backgroundMode === 'minecraft' ? 1.2 : 0.9}
      />
      <directionalLight
        position={backgroundMode === 'minecraft' ? [-16, 6, -20] : [-10, -5, -10]}
        intensity={backgroundMode === 'minecraft' ? 0.35 : 0.3}
      />
      <pointLight
        position={backgroundMode === 'minecraft' ? [0, 14, 24] : [0, 10, 20]}
        intensity={backgroundMode === 'minecraft' ? 0.22 : 0.4}
      />
    </>
  );
}
