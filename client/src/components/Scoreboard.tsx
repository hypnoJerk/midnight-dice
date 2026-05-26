import React from 'react';
import { Player } from 'shared/types.js';

interface ScoreboardProps {
  players: Player[];
  activePlayerId: string | null;
  winners: string[];
  myUserId: string;
}

export function Scoreboard({ players, activePlayerId, winners, myUserId }: ScoreboardProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      background: 'rgba(0, 0, 0, 0.4)',
      border: '2px solid var(--crt-border-muted)',
      borderRadius: '4px',
      padding: '16px'
    }}>
      <div style={{
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '0.6rem',
        borderBottom: '1px solid var(--crt-border-muted)',
        paddingBottom: '8px',
        color: 'var(--crt-text-secondary)'
      }}>
        [PLAYER STANDINGS]
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {players.map((player) => {
          const isActive = player.id === activePlayerId;
          const isMe = player.id === myUserId;
          const isWinner = winners.includes(player.id);
          
          return (
            <div 
              key={player.id} 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 12px',
                background: isActive ? 'rgba(0, 255, 102, 0.1)' : 'transparent',
                border: isActive ? '1px solid var(--crt-border)' : '1px solid transparent',
                borderRadius: '4px',
                transition: 'var(--transition-smooth)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isActive && (
                  <span style={{ 
                    fontFamily: 'Press Start 2P, monospace',
                    fontSize: '0.6rem',
                    color: '#00ff66',
                    animation: 'crt-flicker 0.2s infinite'
                  }}>
                    &gt;
                  </span>
                )}
                <span style={{ 
                  fontWeight: isMe ? 'bold' : 'normal',
                  color: isMe ? '#00ff66' : 'var(--crt-text)'
                }}>
                  {player.name} {isMe && '(YOU)'}
                </span>
                {player.isHost && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--crt-text-muted)' }}>
                    [HOST]
                  </span>
                )}

                {/* Round Wins Indicators (Best 2 out of 3) */}
                <div style={{ display: 'flex', gap: '6px', marginLeft: '4px', alignItems: 'center' }}>
                  {[1, 2].map((roundNum) => {
                    const hasWon = player.roundWins >= roundNum;
                    return (
                      <div 
                        key={roundNum}
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: hasWon ? 'var(--crt-border)' : 'rgba(0, 0, 0, 0.4)',
                          border: `1px solid ${hasWon ? 'var(--crt-border)' : 'var(--crt-border-muted)'}`,
                          boxShadow: hasWon ? 'var(--crt-glow)' : 'none',
                          transition: 'var(--transition-smooth)'
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Qualification markers */}
                <div style={{ display: 'flex', gap: '4px', fontSize: '0.85rem' }}>
                  <span style={{ color: player.hasOne ? '#00ff66' : 'var(--crt-text-muted)' }}>1</span>
                  <span style={{ color: player.hasFour ? '#00ff66' : 'var(--crt-text-muted)' }}>4</span>
                </div>

                {/* Score or DQ'd or Winner mapping */}
                <div style={{ fontFamily: 'VT323, monospace', fontSize: '1.4rem' }}>
                  {player.isDQ ? (
                    <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>DQ'd</span>
                  ) : player.shootoutScore !== undefined && player.shootoutScore >= 0 ? (
                    <span style={{ color: '#00ff66' }}>S: {player.shootoutScore}</span>
                  ) : (
                    <span>PTS: {player.score}</span>
                  )}
                </div>

                {isWinner && (
                  <span style={{ 
                    fontFamily: 'Press Start 2P, monospace',
                    fontSize: '0.45rem', 
                    background: '#00ff66',
                    color: '#000',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    fontWeight: 'bold'
                  }}>
                    WINNER
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default Scoreboard;
