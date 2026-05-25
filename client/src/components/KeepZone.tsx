import React from 'react';

interface KeepZoneProps {
  keptDice: number[];
  hasOne: boolean;
  hasFour: boolean;
}

export function KeepZone({ keptDice, hasOne, hasFour }: KeepZoneProps) {
  // Authoritative visual sorting: Snap only one 1 and one 4 to the far-left
  const keptCopy = [...keptDice];
  
  const oneIdx = keptCopy.indexOf(1);
  const qOne = oneIdx !== -1 ? keptCopy.splice(oneIdx, 1)[0] : null;

  const fourIdx = keptCopy.indexOf(4);
  const qFour = fourIdx !== -1 ? keptCopy.splice(fourIdx, 1)[0] : null;

  keptCopy.sort((a, b) => a - b);

  const sortedKept: number[] = [];
  let highlightedCount = 0;

  if (qOne !== null) {
    sortedKept.push(qOne);
    highlightedCount++;
  }
  if (qFour !== null) {
    sortedKept.push(qFour);
    highlightedCount++;
  }
  sortedKept.push(...keptCopy);

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
          const isHighlighted = val && idx < highlightedCount;

          return (
            <div 
              key={idx} 
              style={{
                width: '50px',
                height: '50px',
                border: `2px solid ${val ? (isHighlighted ? '#00ff66' : 'var(--crt-border)') : 'var(--crt-border-muted)'}`,
                background: val ? 'rgba(0, 255, 102, 0.05)' : 'rgba(0,0,0,0.8)',
                boxShadow: val ? (isHighlighted ? '0 0 10px rgba(0, 255, 102, 0.4)' : 'var(--crt-glow)') : 'none',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 'bold',
                fontFamily: 'VT323, monospace',
                color: isHighlighted ? '#00ff66' : 'var(--crt-text)',
                transition: 'var(--transition-smooth)',
                position: 'relative'
              }}
            >
              {val || ''}
              
              {/* Subtle visual marker for Q-dice */}
              {isHighlighted && (
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
