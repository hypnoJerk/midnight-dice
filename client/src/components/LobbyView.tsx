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
  const [showSoloConfirm, setShowSoloConfirm] = React.useState(false);

  return (
    <>
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
            fontSize: '0.85rem',
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
            fontSize: '0.85rem', 
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
                  background: 'var(--crt-bg-soft)'
                }}>
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
              onClick={() => {
                if (room.players.length === 1) {
                  setShowSoloConfirm(true);
                } else {
                  onStartGame();
                }
              }} 
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

      {showSoloConfirm && (
        <div className="settings-modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowSoloConfirm(false)}>
          <div className="settings-modal terminal-panel" onClick={(e) => e.stopPropagation()} style={{
            width: '90%',
            maxWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{
              fontFamily: 'Press Start 2P, monospace',
              fontSize: '0.75rem',
              color: '#ffb000',
              textAlign: 'center',
              textShadow: '0 0 5px rgba(255, 176, 0, 0.5)'
            }}>
              ⚠️ SOLO SANDBOX ACTIVE
            </div>
            
            <hr style={{ border: '0', borderTop: '1px dashed var(--crt-border-muted)', margin: '0' }} />

            <div style={{
              fontSize: '0.90rem',
              lineHeight: '1.5',
              color: 'var(--crt-text)',
              textAlign: 'center'
            }}>
              THIS MATCH WILL NOT BE RECORDED TO THE GLOBAL LEADERBOARD (REQUIRES MINIMUM 2 PLAYERS).
            </div>

            <hr style={{ border: '0', borderTop: '1px dashed var(--crt-border-muted)', margin: '0' }} />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowSoloConfirm(false)}
                className="btn-retro"
                style={{ flex: 1, borderColor: 'var(--crt-border-muted)', fontSize: '0.95rem' }}
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setShowSoloConfirm(false);
                  onStartGame();
                }}
                className="btn-retro btn-retro-primary"
                style={{ flex: 1, fontSize: '0.95rem', color: 'var(--crt-bg)' }}
              >
                OKAY
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default LobbyView;
