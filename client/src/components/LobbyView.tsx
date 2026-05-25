import React from 'react';
import { Room } from 'shared/types.js';

interface LobbyViewProps {
  room: Room;
  myUserId: string;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export function LobbyView({ room, myUserId, onStartGame, onLeaveRoom }: LobbyViewProps) {
  const isHost = room.hostId === myUserId;
  const canStart = room.players.length >= 1; // Allows solo sandbox for easy local testing

  return (
    <div className="terminal-panel" style={{
      width: '100%',
      maxWidth: '460px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontFamily: 'Press Start 2P, monospace', 
          fontSize: '0.65rem',
          color: 'var(--crt-text-secondary)',
          marginBottom: '8px'
        }}>
          [MATCH LOBBY REGISTERED]
        </div>
        <h2 style={{ fontSize: '2.5rem', letterSpacing: '0.2em', color: 'var(--crt-text)' }}>
          {room.code}
        </h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--crt-text-muted)', marginTop: '4px' }}>
          SHARE THIS 4-CHARACTER CODE FOR PAIRING
        </div>
      </div>

      <hr style={{ border: '0', borderTop: '1px dashed var(--crt-border-muted)' }} />

      <div>
        <div style={{ 
          fontFamily: 'Press Start 2P, monospace', 
          fontSize: '0.55rem', 
          color: 'var(--crt-text-secondary)',
          marginBottom: '12px'
        }}>
          [CONNECTED PLAYERS: {room.players.length}/6]
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {room.players.map((p) => (
            <div 
              key={p.id} 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 12px',
                border: '1px solid var(--crt-border-muted)',
                borderRadius: '4px',
                background: 'rgba(0,0,0,0.3)'
              }}
            >
              <span>{p.name} {p.id === myUserId && '(YOU)'}</span>
              {p.isHost ? (
                <span style={{ color: 'var(--crt-text-secondary)' }}>[HOST]</span>
              ) : (
                <span style={{ color: 'var(--crt-text-muted)' }}>[READY]</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <hr style={{ border: '0', borderTop: '1px dashed var(--crt-border-muted)' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isHost ? (
          <button 
            onClick={onStartGame} 
            disabled={!canStart}
            className="btn-retro" 
            style={{ 
              width: '100%',
              fontSize: '1.2rem',
              color: '#00ff66',
              boxShadow: canStart ? 'var(--crt-glow-strong)' : 'none'
            }}
          >
            START MATCH
          </button>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            fontSize: '0.9rem', 
            color: 'var(--crt-text-secondary)',
            padding: '12px',
            border: '1px dashed var(--crt-border-muted)'
          }}>
            WAITING FOR HOST TO BOOT...
          </div>
        )}

        <button 
          onClick={onLeaveRoom} 
          className="btn-retro" 
          style={{ 
            width: '100%',
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
            boxShadow: 'none'
          }}
        >
          QUIT LOBBY
        </button>
      </div>
    </div>
  );
}
export default LobbyView;
