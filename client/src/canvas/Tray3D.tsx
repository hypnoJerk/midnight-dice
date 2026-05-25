import React from 'react';
import { usePlane } from '@react-three/cannon';
import { useTheme } from '../context/ThemeContext.js';

export function Tray3D() {
  const { theme } = useTheme();

  // 1. Ground Plane (Floor of the tray - elevated to y = -0.5)
  const [floorRef] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.5, 0],
    type: 'Static'
  }));

  // 2. Bounding Walls (Elevated to y = 1.5 to map to our raised floor)
  const [wallNorth] = usePlane(() => ({
    rotation: [0, 0, 0],
    position: [0, 1.5, -4.5],
    type: 'Static'
  }));

  const [wallSouth] = usePlane(() => ({
    rotation: [Math.PI, 0, 0],
    position: [0, 1.5, 4.5],
    type: 'Static'
  }));

  const [wallWest] = usePlane(() => ({
    rotation: [0, Math.PI / 2, 0],
    position: [-4.5, 1.5, 0],
    type: 'Static'
  }));

  const [wallEast] = usePlane(() => ({
    rotation: [0, -Math.PI / 2, 0],
    position: [4.5, 1.5, 0],
    type: 'Static'
  }));

  const floorColor = theme === 'light' ? '#dcfce7' : '#030804';

  return (
    <group>
      {/* Visual Floor representation */}
      <mesh ref={floorRef as any} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial 
          color={floorColor} 
          roughness={0.75} 
          metalness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Bounding Wall representations (invisible colliders) */}
      <mesh ref={wallNorth as any} />
      <mesh ref={wallSouth as any} />
      <mesh ref={wallWest as any} />
      <mesh ref={wallEast as any} />
    </group>
  );
}
export default Tray3D;
