import React from 'react';

interface RetroDie2DProps {
  value: number;
  size?: number;
  color?: string;
}

export function RetroDie2D({ value, size = 28, color = 'currentColor' }: RetroDie2DProps) {
  const pips: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [25, 75], [75, 25], [75, 75]],
    5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
    6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]]
  };

  const activePips = pips[value] || [];

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      {activePips.map(([cx, cy], idx) => (
        <circle 
          key={idx} 
          cx={cx} 
          cy={cy} 
          r="9" 
          fill={color} 
        />
      ))}
    </svg>
  );
}

export default RetroDie2D;
