import React from 'react';

interface KeepZoneProps {
  keptDice: number[];
  hasOne: boolean;
  hasFour: boolean;
}

export function KeepZone({ keptDice, hasOne, hasFour }: KeepZoneProps) {
  // Authoritative visual sorting: Snap 1 and 4 to the far-left
  const sortedKept = [...keptDice].sort((a, b) => {
    if (a === 1 && b !== 1) return -1;
    if (b === 1 && a !== 1) return 1;
    if (a === 4 && b !== 4) return -1;
    if (b === 4 && a !== 4) return 1;
    return a - b; // Sort others ascending
  });

  // Create placeholders for up to 6 dice
  const placeholders = Array.from({ length: 6 });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      width: '100%',
      padding: '16px',
      borderTop: '2px solid var(--crt-border-muted)',
      background: 'rgba(0, 0, 0, 0.4)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        color: 'var(--crt-text-secondary)',
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '0.55rem',
        letterSpacing: '0.05em'
      }}>
        <span>[KEEP ZONE]</span>
        <span style={{ color: (hasOne && hasFour) ? '#00ff66' : 'var(--color-danger)' }}>
          {(hasOne && hasFour) ? '* QUALIFIED *' : '* UNQUALIFIED *'}
        </span>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '380px'
      }}>
        {placeholders.map((_, idx) => {
          const val = sortedKept[idx];
          const isQVal = val === 1 || val === 4;

          return (
            <div 
              key={idx} 
              style={{
                width: '50px',
                height: '50px',
                border: `2px solid ${val ? (isQVal ? '#00ff66' : 'var(--crt-border)') : 'var(--crt-border-muted)'}`,
                background: val ? 'rgba(0, 255, 102, 0.05)' : 'rgba(0,0,0,0.8)',
                boxShadow: val ? (isQVal ? '0 0 10px rgba(0, 255, 102, 0.4)' : 'var(--crt-glow)') : 'none',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 'bold',
                fontFamily: 'VT323, monospace',
                color: isQVal ? '#00ff66' : 'var(--crt-text)',
                transition: 'var(--transition-smooth)',
                position: 'relative'
              }}
            >
              {val || ''}
              
              {/* Subtle visual marker for Q-dice */}
              {isQVal && (
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: '#00ff66',
                  boxShadow: '0 0 6px #00ff66'
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default KeepZone;
