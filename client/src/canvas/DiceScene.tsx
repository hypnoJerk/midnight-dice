import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import * as THREE from 'three';
import Tray3D from './Tray3D.js';
import Die3D from './Die3D.js';
import { useTheme } from '../context/ThemeContext.js';

interface DebugConfig {
  gravity: number;
  impulseForce: number;
  restitution: number;
  camX: number;
  camY: number;
  camZ: number;
  fov: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  ambientIntensity: number;
  lightY: number;
  diceScale: number;
}

interface DiceSceneProps {
  diceCount: number;
  targetValues?: number[]; // Optional target values (for Sandbox FORCE_ROLL override steering)
  onTapDie: (index: number) => void;
  onRollComplete?: (values: number[]) => void;
  rollId: number;
  preset: 'green' | 'amber';
  debugConfig?: DebugConfig;
  selectedIndexes?: number[];
}

/**
 * Advanced Dynamic Camera Controller. Tracks active rolling/settled dice,
 * automatically centers them, and adjusts Y-height and Z-depth based on the
 * maximum spatial spread of the dice. Interpolated smoothly using THREE lerping.
 */
function CameraController({ 
  x, y, z, fov, target, diceRefs 
}: { 
  x: number; y: number; z: number; fov: number; target: [number, number, number];
  diceRefs: React.MutableRefObject<Record<number, React.RefObject<THREE.Group>>>;
}) {
  const { camera } = useThree();
  const currentTarget = useRef(new THREE.Vector3(target[0], target[1], target[2]));
  const currentPosition = useRef(new THREE.Vector3(x, y, z));

  // Sync with base external configurations (e.g. from Sandbox calibration sliders)
  useEffect(() => {
    currentPosition.current.set(x, y, z);
    currentTarget.current.set(target[0], target[1], target[2]);
    if ((camera as any).isPerspectiveCamera) {
      (camera as any).fov = fov;
      (camera as any).updateProjectionMatrix();
    }
  }, [camera, x, y, z, fov, target[0], target[1], target[2]]);

  useFrame(() => {
    const positions: THREE.Vector3[] = [];
    Object.values(diceRefs.current).forEach(ref => {
      if (ref?.current) {
        const p = new THREE.Vector3();
        ref.current.getWorldPosition(p);
        positions.push(p);
      }
    });

    let targetLookAt = new THREE.Vector3(target[0], target[1], target[2]);
    let targetCamPos = new THREE.Vector3(x, y, z);

    if (positions.length > 0) {
      // 1. Compute Centroid (center of mass of all active dice)
      const centroid = new THREE.Vector3();
      positions.forEach(p => centroid.add(p));
      centroid.divideScalar(positions.length);

      // Target lookAt point focuses on the centroid at floor level
      targetLookAt.set(centroid.x, 0.0, centroid.z);

      // 2. Compute Spread (maximum bounding size)
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      positions.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
      });

      const dx = maxX - minX;
      const dz = maxZ - minZ;
      const spread = Math.max(dx, dz);

      // 3. Dynamic heights and depths
      // For clustered dice (spread < 3.0), use base seating height. For spread out dice, scale up.
      const spreadOffset = Math.max(0, spread - 3.0);
      const heightPadding = spreadOffset * 0.95; // increased from 0.75 for absolute frustum safety
      
      const dynamicY = y + heightPadding;
      const dynamicZ = z + heightPadding; // 1:1 seating depth zoom ratio
      
      // Center camera X on centroid with a gentle horizontal damping
      const dynamicX = centroid.x * 0.45;

      targetCamPos.set(dynamicX, dynamicY, dynamicZ);
    }

    // Cinematic tracking catch-up (0.02 lerp lets camera drift elegantly behind the roll)
    currentPosition.current.lerp(targetCamPos, 0.02);
    currentTarget.current.lerp(targetLookAt, 0.02);

    camera.position.copy(currentPosition.current);
    camera.lookAt(currentTarget.current);
  });

  return null;
}

export function DiceScene({ 
  diceCount, 
  targetValues, 
  onTapDie, 
  onRollComplete, 
  rollId, 
  preset, 
  debugConfig,
  selectedIndexes = []
}: DiceSceneProps) {
  const { theme } = useTheme();

  // Tracks the face-up values of settled dice
  const settledValuesRef = useRef<Record<number, number>>({});
  const hasTriggeredCompleteRef = useRef(false);

  // Registry of references to the dice groups for camera centroid tracking
  const diceRefs = useRef<Record<number, React.RefObject<THREE.Group>>>({});

  // Reset tracking state on every new roll trigger
  useEffect(() => {
    settledValuesRef.current = {};
    hasTriggeredCompleteRef.current = false;
    diceRefs.current = {}; // Reset registered references on new throw
  }, [rollId]);

  const registerDieRef = (idx: number, ref: React.RefObject<THREE.Group>) => {
    if (ref) {
      diceRefs.current[idx] = ref;
    }
  };

  const handleDieSettle = (idx: number, val: number) => {
    // Record the settled value for this die index
    settledValuesRef.current[idx] = val;

    // Check if all active dice have finished settling
    if (Object.keys(settledValuesRef.current).length === diceCount && !hasTriggeredCompleteRef.current) {
      hasTriggeredCompleteRef.current = true;
      const finalValues = Array.from({ length: diceCount }).map((_, i) => settledValuesRef.current[i]);
      if (onRollComplete) {
        onRollComplete(finalValues);
      }
    }
  };

  // Calibrated default values for angled 3D terminal look
  const gravityValue = debugConfig ? debugConfig.gravity : 9.8;
  const restitutionValue = debugConfig ? debugConfig.restitution : 0.45;
  
  const camX = debugConfig ? debugConfig.camX : 0.0;
  const camY = debugConfig ? debugConfig.camY : 8.2;
  const camZ = debugConfig ? debugConfig.camZ : 5.0;
  const fov = debugConfig ? debugConfig.fov : 40;

  const targetX = debugConfig ? debugConfig.targetX : 0.0;
  const targetY = debugConfig ? debugConfig.targetY : 0.0;
  const targetZ = debugConfig ? debugConfig.targetZ : 0.0;

  const ambientIntensity = debugConfig ? debugConfig.ambientIntensity : 2.30;
  const lightY = debugConfig ? debugConfig.lightY : 10.5;
  const diceScale = debugConfig ? debugConfig.diceScale : 0.80;

  const containerBg = theme === 'light' 
    ? 'var(--crt-bg-panel)' 
    : 'rgba(0, 0, 0, 0.75)';
  const insetShadow = theme === 'light'
    ? 'inset 0 0 20px rgba(22, 101, 52, 0.15), var(--crt-glow)'
    : 'inset 0 0 30px rgba(0,0,0,0.95), var(--crt-glow)';

  return (
    <div style={{
      width: '100%',
      height: '350px',
      border: '2px solid var(--crt-border)',
      borderRadius: '4px',
      background: containerBg,
      position: 'relative',
      boxShadow: insetShadow
    }}>
      {/* 3D R3F Canvas Container */}
      <Canvas 
        shadows 
        camera={{ position: [camX, camY, camZ], fov: fov }}
        style={{ width: '100%', height: '100%', display: 'block', zIndex: 1 }}
      >
        {/* Dynamic target tracking and coordinates updates */}
        <CameraController 
          x={camX} 
          y={camY} 
          z={camZ} 
          fov={fov} 
          target={[targetX, targetY, targetZ]} 
          diceRefs={diceRefs}
        />

        <ambientLight intensity={ambientIntensity} />
        <pointLight 
          position={[0, lightY, 2]} 
          intensity={1.3} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024} 
        />
        
        {/* Dynamic Physics sandbox */}
        <Physics 
          key={rollId}
          gravity={[0, -gravityValue, 0]} 
          defaultContactMaterial={{ friction: 0.12, restitution: restitutionValue }}
        >
          <Tray3D />
          {Array.from({ length: diceCount }).map((_, idx) => (
            <Die3D 
              key={`${rollId}-${idx}`} 
              index={idx} 
              value={targetValues?.[idx]} 
              onTap={onTapDie}
              onSettle={handleDieSettle}
              preset={preset}
              diceScale={diceScale}
              isSelected={selectedIndexes.includes(idx)}
              registerDieRef={registerDieRef}
            />
          ))}
        </Physics>
      </Canvas>

      {/* Floating Retro Grid Blueprint Background lines */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(rgba(0,255,102,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,102,0.01) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: preset === 'green' ? 0.35 : 0
      }} />

      {/* Blinking Prompt overlay if tray is empty */}
      {diceCount === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'Press Start 2P, monospace',
          fontSize: '0.65rem',
          color: 'var(--crt-text)',
          textShadow: 'var(--crt-glow-text)',
          pointerEvents: 'none',
          textAlign: 'center',
          lineHeight: '1.8rem',
          zIndex: 2,
          animation: 'crt-flicker 1.5s infinite'
        }}>
          <div>[AWAITING THROW]</div>
          <div style={{ fontSize: '0.45rem', color: 'var(--crt-text-secondary)', marginTop: '8px' }}>
            ROLL DICE CONTROLS ACTIVE BELOW
          </div>
        </div>
      )}
    </div>
  );
}
export default DiceScene;
