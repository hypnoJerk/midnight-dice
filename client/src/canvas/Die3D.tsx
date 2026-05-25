import React, { useEffect, useState, useRef } from 'react';
import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext.js';

interface Die3DProps {
  index: number;
  value?: number; // Optional target value (used to steer the die physically in Sandbox FORCE_ROLL mode)
  onTap: (index: number) => void;
  onSettle?: (index: number, value: number) => void;
  preset: 'green' | 'amber';
  diceScale?: number;
}

// Local face normal vectors: which direction each face points in local die space
const FACE_NORMALS: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0, 1, 0),   // Face 1 is on top (+Y)
  6: new THREE.Vector3(0, -1, 0),  // Face 6 is on bottom (-Y)
  5: new THREE.Vector3(0, 0, 1),   // Face 5 is on front (+Z)
  2: new THREE.Vector3(0, 0, -1),  // Face 2 is on back (-Z)
  4: new THREE.Vector3(-1, 0, 0),  // Face 4 is on left (-X)
  3: new THREE.Vector3(1, 0, 0)    // Face 3 is on right (+X)
};

export function Die3D({ index, value, onTap, onSettle, preset, diceScale }: Die3DProps) {
  const { theme } = useTheme();
  const [hasSettled, setHasSettled] = useState(false);
  const [detectedValue, setDetectedValue] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);

  // Accents: high-contrast dark forest green/amber for light mode, bright neon for dark mode
  const colorAccent = theme === 'light'
    ? (preset === 'green' ? '#166534' : '#b45309')
    : (preset === 'green' ? '#00ff66' : '#ffb000');

  const dieColor = theme === 'light' ? '#f8fafc' : '#0f172a';
  const dieOpacity = theme === 'light' ? 0.75 : 0.8;
  
  // Set size scale (default 1.2, user calibrated 0.8)
  const scale = diceScale || 1.2;
  const half = scale / 2;
  const faceOffset = half + 0.01;
  const r = scale / 1.2; // Scaling ratio for relative pip positions

  // Randomized start position above the tray
  const startX = -2.2 + (index * 1.1) + (Math.random() * 0.3);
  const startY = 4.0 + (Math.random() * 1.5);
  const startZ = -1.5 + (Math.random() * 2);

  const [ref, api] = useBox(() => ({
    mass: 1.5,
    position: [startX, startY, startZ],
    args: [scale, scale, scale],
    allowSleep: true,
    sleepSpeedLimit: 0.1,
    sleepTimeLimit: 0.8
  }));

  const velocity = useRef([0, 0, 0]);
  const quaternion = useRef([0, 0, 0, 1]);
  const frameCount = useRef(0);
  const innerRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const unsubscribeV = api.velocity.subscribe(v => {
      velocity.current = v;
    });
    const unsubscribeQ = api.quaternion.subscribe(q => {
      quaternion.current = q;
    });
    return () => {
      unsubscribeV();
      unsubscribeQ();
    };
  }, [api]);

  useEffect(() => {
    // Apply initial random impulse and torque to throw the die
    const forceX = -3 + Math.random() * 6;
    const forceY = -2 - Math.random() * 4;
    const forceZ = -3 + Math.random() * 6;

    api.applyImpulse([forceX, forceY, forceZ], [0, half, 0]);
    api.applyTorque([
      (Math.random() * 10) + 15,
      (Math.random() * 10) + 15,
      (Math.random() * 10) + 15
    ]);
  }, [api, half]);

  // Adjust cursor style dynamically on hover
  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'default';
    return () => {
      document.body.style.cursor = 'default';
    };
  }, [hovered]);

  useFrame(() => {
    if (hasSettled) return;

    frameCount.current += 1;
    if (frameCount.current < 60) return; // 60 frame (approx 1s) grace period for physical throw

    // Check if the die has practically stopped moving
    const speed = Math.sqrt(
      velocity.current[0] ** 2 +
      velocity.current[1] ** 2 +
      velocity.current[2] ** 2
    );

    // Dynamic magnetic torque guiding (only used in Sandbox FORCE_ROLL mode when a value target is passed)
    if (value !== undefined && speed < 2.0 && speed >= 0.05 && ref.current) {
      const faceNormal = FACE_NORMALS[value];
      if (faceNormal) {
        const qOuter = new THREE.Quaternion(
          quaternion.current[0],
          quaternion.current[1],
          quaternion.current[2],
          quaternion.current[3]
        );
        const vWorld = faceNormal.clone().applyQuaternion(qOuter).normalize();
        const worldUp = new THREE.Vector3(0, 1, 0);
        
        // Find shortest rotation axis to pull the target face up
        const torqueAxis = new THREE.Vector3().crossVectors(vWorld, worldUp);
        
        // Apply continuous physical torque. Gain K = 25.0 matches 1.5 mass nicely.
        const K = 25.0;
        api.applyTorque([torqueAxis.x * K, torqueAxis.y * K, torqueAxis.z * K]);
      }
    }

    if (speed < 0.05 && ref.current) {
      // 1. Math-based face-up value detection using authoritative physics quaternion
      let maxUp = -Infinity;
      let bestFace = 1;
      const qOuter = new THREE.Quaternion(
        quaternion.current[0],
        quaternion.current[1],
        quaternion.current[2],
        quaternion.current[3]
      );

      for (const [faceStr, localNormal] of Object.entries(FACE_NORMALS)) {
        const face = parseInt(faceStr);
        const worldNormal = localNormal.clone().applyQuaternion(qOuter);
        if (worldNormal.y > maxUp) {
          maxUp = worldNormal.y;
          bestFace = face;
        }
      }

      setDetectedValue(bestFace);
      setHasSettled(true);
      api.mass.set(0);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);

      // 2. Invoke settle callback to report results
      if (onSettle) {
        onSettle(index, bestFace);
      }
    }
  });

  // Minimum-rotation correction: tilt the target face to point straight up,
  // preserving the die's natural landing yaw (no Y-axis spin)
  useFrame(() => {
    if (hasSettled && ref.current && innerRef.current) {
      // Use override value if forced, otherwise naturally detected landing value
      const targetFace = value !== undefined ? value : detectedValue;
      if (targetFace !== null && targetFace !== undefined) {
        const faceNormal = FACE_NORMALS[targetFace];
        if (faceNormal) {
          const qOuter = new THREE.Quaternion(
            quaternion.current[0],
            quaternion.current[1],
            quaternion.current[2],
            quaternion.current[3]
          );

          // Transform the local face normal into world space
          const vWorld = faceNormal.clone().applyQuaternion(qOuter);

          // Find the shortest rotation from vWorld to world-up (0, 1, 0)
          const worldUp = new THREE.Vector3(0, 1, 0);
          const qCorrect = new THREE.Quaternion().setFromUnitVectors(vWorld.normalize(), worldUp);

          // The final desired world orientation
          const qFinal = qCorrect.multiply(qOuter);

          // Compute local inner target: qInnerTarget = qOuter^-1 * qFinal
          const qOuterInv = qOuter.clone().invert();
          const qInnerTarget = qOuterInv.multiply(qFinal);

          // Smoothly slerp local quaternion to keep visual faces perfectly level
          innerRef.current.quaternion.slerp(qInnerTarget, 0.1);
        }
      }
    }
  });

  return (
    <group ref={ref as any}>
      <group ref={innerRef}>
        {/* Primary semi-translucent glass die body with direct raycasting click triggers */}
        <mesh 
          castShadow 
          receiveShadow
          onClick={(e) => {
            e.stopPropagation(); // Stop raycast bubbling to background floor/walls
            onTap(index);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHovered(false);
          }}
        >
          <boxGeometry args={[scale, scale, scale]} />
          <meshStandardMaterial 
            color={dieColor} 
            roughness={0.05} 
            metalness={theme === 'light' ? 0.3 : 0.9} 
            transparent
            opacity={dieOpacity}
          />
        </mesh>

        {/* Glow outlines on corners - raycast disabled to prevent click blocking */}
        <mesh raycast={() => null}>
          <boxGeometry args={[scale * 1.02, scale * 1.02, scale * 1.02]} />
          <meshBasicMaterial 
            color={colorAccent} 
            wireframe 
            transparent
            opacity={hovered ? 0.65 : 0.35} // Highlight glow on hover!
          />
        </mesh>

        {/* ========================================================
           Simultaneous 3D Pips Rendering (All 6 faces active)
           ======================================================== */}
        
        {/* Face 1 (Top, y = +faceOffset) */}
        <mesh position={[0, faceOffset, 0]} raycast={() => null}>
          <boxGeometry args={[scale * 0.16, 0.01, scale * 0.16]} />
          <meshBasicMaterial color={colorAccent} />
        </mesh>

        {/* Face 6 (Bottom, y = -faceOffset) */}
        <group raycast={() => null}>
          <mesh position={[-0.25 * r, -faceOffset, -0.3 * r]} raycast={() => null}><boxGeometry args={[scale * 0.12, 0.01, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[0.25 * r, -faceOffset, -0.3 * r]} raycast={() => null}><boxGeometry args={[scale * 0.12, 0.01, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[-0.25 * r, -faceOffset, 0]} raycast={() => null}><boxGeometry args={[scale * 0.12, 0.01, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[0.25 * r, -faceOffset, 0]} raycast={() => null}><boxGeometry args={[scale * 0.12, 0.01, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[-0.25 * r, -faceOffset, 0.3 * r]} raycast={() => null}><boxGeometry args={[scale * 0.12, 0.01, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[0.25 * r, -faceOffset, 0.3 * r]} raycast={() => null}><boxGeometry args={[scale * 0.12, 0.01, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
        </group>

        {/* Face 5 (Front, z = +faceOffset) */}
        <group raycast={() => null}>
          <mesh position={[-0.3 * r, 0.3 * r, faceOffset]} raycast={() => null}><boxGeometry args={[scale * 0.12, scale * 0.12, 0.01]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[0.3 * r, 0.3 * r, faceOffset]} raycast={() => null}><boxGeometry args={[scale * 0.12, scale * 0.12, 0.01]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[0, 0, faceOffset]} raycast={() => null}><boxGeometry args={[scale * 0.12, scale * 0.12, 0.01]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[-0.3 * r, -0.3 * r, faceOffset]} raycast={() => null}><boxGeometry args={[scale * 0.12, scale * 0.12, 0.01]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[0.3 * r, -0.3 * r, faceOffset]} raycast={() => null}><boxGeometry args={[scale * 0.12, scale * 0.12, 0.01]} /><meshBasicMaterial color={colorAccent} /></mesh>
        </group>

        {/* Face 2 (Back, z = -faceOffset) */}
        <group raycast={() => null}>
          <mesh position={[-0.3 * r, 0.3 * r, -faceOffset]} raycast={() => null}><boxGeometry args={[scale * 0.12, scale * 0.12, 0.01]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[0.3 * r, -0.3 * r, -faceOffset]} raycast={() => null}><boxGeometry args={[scale * 0.12, scale * 0.12, 0.01]} /><meshBasicMaterial color={colorAccent} /></mesh>
        </group>

        {/* Face 4 (Left, x = -faceOffset) */}
        <group raycast={() => null}>
          <mesh position={[-faceOffset, 0.3 * r, 0.3 * r]} raycast={() => null}><boxGeometry args={[0.01, scale * 0.12, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[-faceOffset, 0.3 * r, -0.3 * r]} raycast={() => null}><boxGeometry args={[0.01, scale * 0.12, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[-faceOffset, -0.3 * r, 0.3 * r]} raycast={() => null}><boxGeometry args={[0.01, scale * 0.12, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[-faceOffset, -0.3 * r, -0.3 * r]} raycast={() => null}><boxGeometry args={[0.01, scale * 0.12, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
        </group>

        {/* Face 3 (Right, x = +faceOffset) */}
        <group raycast={() => null}>
          <mesh position={[faceOffset, 0.3 * r, 0.3 * r]} raycast={() => null}><boxGeometry args={[0.01, scale * 0.12, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[faceOffset, 0, 0]} raycast={() => null}><boxGeometry args={[0.01, scale * 0.12, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
          <mesh position={[faceOffset, -0.3 * r, -0.3 * r]} raycast={() => null}><boxGeometry args={[0.01, scale * 0.12, scale * 0.12]} /><meshBasicMaterial color={colorAccent} /></mesh>
        </group>
      </group>
    </group>
  );
}
export default Die3D;
