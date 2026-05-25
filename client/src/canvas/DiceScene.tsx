import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
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
 * Advanced Camera Controller. Directly updates the active R3F perspective camera's
 * position, FOV, and target alignment programmatically on every state change.
 */
function CameraController({ 
  x, y, z, fov, target 
}: { 
  x: number; y: number; z: number; fov: number; target: [number, number, number] 
}) {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(x, y, z);
    if ((camera as any).isPerspectiveCamera) {
      (camera as any).fov = fov;
      (camera as any).updateProjectionMatrix();
    }
  }, [camera, x, y, z, fov]);

  useFrame(() => {
    camera.lookAt(target[0], target[1], target[2]);
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

  // Reset tracking state on every new roll trigger
  useEffect(() => {
    settledValuesRef.current = {};
    hasTriggeredCompleteRef.current = false;
  }, [rollId]);

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
  const camY = debugConfig ? debugConfig.camY : 11.5;
  const camZ = debugConfig ? debugConfig.camZ : 2.0;
  const fov = debugConfig ? debugConfig.fov : 38;

  const targetX = debugConfig ? debugConfig.targetX : -0.2;
  const targetY = debugConfig ? debugConfig.targetY : 1.8;
  const targetZ = debugConfig ? debugConfig.targetZ : -0.2;

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
