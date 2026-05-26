import React from 'react';
import { usePlane } from '@react-three/cannon';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext.js';

export function Tray3D() {
  const { theme, preset } = useTheme();

  // 1. Ground Plane (Floor of the tray - elevated to y = -0.5)
  const [floorRef] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.5, 0],
    type: 'Static'
  }));

  // 2. Bounding Walls (Elevated to y = 1.5 to map to our raised floor)
  const [wallNorth] = usePlane(() => ({
    rotation: [0, 0, 0],
    position: [0, 1.5, -6.0],
    type: 'Static'
  }));

  const [wallSouth] = usePlane(() => ({
    rotation: [Math.PI, 0, 0],
    position: [0, 1.5, 6.0],
    type: 'Static'
  }));

  const [wallWest] = usePlane(() => ({
    rotation: [0, Math.PI / 2, 0],
    position: [-6.0, 1.5, 0],
    type: 'Static'
  }));

  const [wallEast] = usePlane(() => ({
    rotation: [0, -Math.PI / 2, 0],
    position: [6.0, 1.5, 0],
    type: 'Static'
  }));

  // Calibrate procedural retro colors based on preset (green/amber) and theme (light/dark)
  const isGreen = preset === 'green';
  const isDark = theme === 'dark';

  // Rich contrasted floor color
  const floorColor = isDark
    ? (isGreen ? '#05180c' : '#1e1104')
    : (isGreen ? '#e8f7ed' : '#fef6e5');

  // Glowing holographic lines color
  const glowColor = isDark
    ? (isGreen ? '#00ff66' : '#ffb000')
    : (isGreen ? '#166534' : '#b45309');

  // Secondary sub-grid line color (low opacity/dim)
  const gridSecondary = isDark
    ? (isGreen ? '#003311' : '#331a00')
    : (isGreen ? '#bbf7d0' : '#fef3c7');

  return (
    <group>
      {/* 1. Visual Floor Bed (glowing contrast base) */}
      <mesh ref={floorRef as any} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial 
          color={floorColor} 
          roughness={0.7} 
          metalness={0.15}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* 2. Procedural Depth Grid Helper (provides high-precision movement cues) */}
      <gridHelper
        args={[12, 12, glowColor, gridSecondary]}
        position={[0, -0.49, 0]}
        rotation={[0, 0, 0]}
      />

      {/* 3. Holographic Glowing Boundary Box Outline (Perfect clean lines, no diagonals) */}
      <lineSegments position={[0, 0.5, 0]}>
        <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(12.05, 2.0, 12.05)]} />
        <lineBasicMaterial attach="material" color={glowColor} transparent opacity={isDark ? 0.22 : 0.4} />
      </lineSegments>

      {/* Bounding Wall representations (invisible physical colliders) */}
      <mesh ref={wallNorth as any} />
      <mesh ref={wallSouth as any} />
      <mesh ref={wallWest as any} />
      <mesh ref={wallEast as any} />
    </group>
  );
}
export default Tray3D;
