import { useMemo, useEffect, type RefObject } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useSkinStore } from '../store/useSkinStore';
import { getBodyParts, OVERLAY_SCALE } from '../utils/skinLayout';
import { createSkinPartGeometry } from '../utils/bodyPartGeometry';
import { imageDataToCanvas } from '../utils/textureUtils';
import { useRef } from 'react';

interface SkinModelProps {
  walking?: boolean;
  lookAtCursor?: RefObject<{ x: number; y: number } | null>;
}

const WALK_SWING_SPEED = 5.5;
const WALK_SWING_ANGLE = 0.6;
const WALK_BOB_HEIGHT = 0.35;

const HEAD_MAX_YAW = 50 * THREE.MathUtils.DEG2RAD;
const HEAD_MAX_PITCH = 40 * THREE.MathUtils.DEG2RAD;
const HEAD_LERP_FACTOR = 0.1;

const HEAD_PART_NAMES = new Set(['head', 'headOverlay']);

const limbAnimationPhase: Record<string, number> = {
  rightArm: 0,
  rightArmOverlay: 0,
  leftArm: Math.PI,
  leftArmOverlay: Math.PI,
  rightLeg: Math.PI,
  rightLegOverlay: Math.PI,
  leftLeg: 0,
  leftLegOverlay: 0,
};

export default function SkinModel({ walking = false, lookAtCursor }: SkinModelProps) {
  const skinData = useSkinStore((s) => s.skinData);
  const textureVersion = useSkinStore((s) => s.textureVersion);
  const modelType = useSkinStore((s) => s.modelType);
  const invalidate = useThree((s) => s.invalidate);
  const rootRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const limbRefs = useRef<Record<string, THREE.Group | null>>({});

  const texture = useMemo(() => {
    const canvas = imageDataToCanvas(skinData);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [skinData, textureVersion]);

  useEffect(() => {
    // Force a render after each texture swap so updates appear immediately.
    invalidate();
    return () => {
      texture.dispose();
    };
  }, [texture, invalidate]);

  const geometries = useMemo(() => {
    return getBodyParts(modelType).map((part) => ({
      part,
      geometry: createSkinPartGeometry(part),
    }));
  }, [modelType]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const bobTarget = walking ? Math.sin(time * WALK_SWING_SPEED * 2) * WALK_BOB_HEIGHT : 0;

    if (rootRef.current) {
      rootRef.current.position.y += (bobTarget - rootRef.current.position.y) * 0.14;
    }

    for (const [partName, phase] of Object.entries(limbAnimationPhase)) {
      const group = limbRefs.current[partName];
      if (!group) continue;
      const swingTarget = walking ? Math.sin(time * WALK_SWING_SPEED + phase) * WALK_SWING_ANGLE : 0;
      group.rotation.x += (swingTarget - group.rotation.x) * 0.2;
    }

    if (headGroupRef.current && lookAtCursor?.current) {
      const { x, y } = lookAtCursor.current;
      const targetYaw = x * HEAD_MAX_YAW;
      const targetPitch = y * HEAD_MAX_PITCH;
      headGroupRef.current.rotation.y += (targetYaw - headGroupRef.current.rotation.y) * HEAD_LERP_FACTOR;
      headGroupRef.current.rotation.x += (targetPitch - headGroupRef.current.rotation.x) * HEAD_LERP_FACTOR;
    }
  });

  const headParts: { part: (typeof geometries)[number]['part']; geometry: THREE.BufferGeometry }[] = [];
  const otherParts: typeof geometries = [];
  for (const entry of geometries) {
    if (HEAD_PART_NAMES.has(entry.part.name)) {
      headParts.push(entry);
    } else {
      otherParts.push(entry);
    }
  }

  return (
    <group ref={rootRef}>
      {/* Head pivot at neck (y=0), so parts inside are offset by their own position */}
      <group ref={headGroupRef} position={[0, 0, 0]}>
        {headParts.map(({ part, geometry }) => {
          const scale = part.isOverlay ? OVERLAY_SCALE : 1;
          return (
            <mesh
              key={part.name}
              geometry={geometry}
              position={[part.position[0], part.position[1], part.position[2]]}
              scale={[scale, scale, scale]}
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
      </group>

      {otherParts.map(({ part, geometry }) => {
        const scale = part.isOverlay ? OVERLAY_SCALE : 1;
        const limbPhase = limbAnimationPhase[part.name];

        if (limbPhase !== undefined) {
          return (
            <group
              key={part.name}
              ref={(node) => {
                limbRefs.current[part.name] = node;
              }}
              position={[part.position[0], part.position[1] + 6, part.position[2]]}
            >
              <mesh
                geometry={geometry}
                position={[0, -6, 0]}
                scale={[scale, scale, scale]}
              >
                <meshStandardMaterial
                  map={texture}
                  transparent={!!part.isOverlay}
                  alphaTest={part.isOverlay ? 0.01 : 0}
                  side={part.isOverlay ? THREE.DoubleSide : THREE.FrontSide}
                />
              </mesh>
            </group>
          );
        }

        return (
          <mesh
            key={part.name}
            geometry={geometry}
            position={[part.position[0], part.position[1], part.position[2]]}
            scale={[scale, scale, scale]}
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
    </group>
  );
}
