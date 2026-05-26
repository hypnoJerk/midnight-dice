import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext.js';
import { AudioProvider, useAudio } from './context/AudioContext.js';
import { useGame } from './hooks/useGame.js';
import { useSound } from './hooks/useSound.js';
import LobbyView from './components/LobbyView.js';
import GamePlayView from './components/GamePlayView.js';
import CRTOverlay from './components/CRTOverlay.js';
import SandboxDebugView from './components/SandboxDebugView.js';

function GameAppInner() {
  const { theme, preset, toggleTheme, togglePreset } = useTheme();
  const { isMuted, toggleMute } = useAudio();
  const { playClick, playSuccess } = useSound();
  
  const {
    room,
    userId,
    error,
    activeRoll,
    diceToRoll,
    rollId,
    clearActiveRoll,
    createRoom,
    joinRoom,
    startGame,
    rollDice,
    submitRollResults,
    keepDice,
    leaveRoom,
    initiateRematch,
    isConnected
  } = useGame();

  const [displayName, setDisplayName] = useState(
    localStorage.getItem('midnight_display_name') || ''
  );
  const [roomCode, setRoomCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const prevRoundTransitionRef = useRef<any>(null);

  // Trigger procedural 8-bit victory success chime when round transition starts
  useEffect(() => {
    if (room?.roundTransition && !prevRoundTransitionRef.current) {
      playSuccess();
    }
    prevRoundTransitionRef.current = room?.roundTransition;
  }, [room?.roundTransition, playSuccess]);

  const saveDisplayName = (name: string) => {
    setDisplayName(name);
    localStorage.setItem('midnight_display_name', name);
  };

  const handleRegisterAndAction = async (action: 'create' | 'join') => {
    playClick();
    if (!displayName.trim()) return;

    setIsRegistering(true);
    try {
      await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, displayName })
      });
      
      if (action === 'create') {
        createRoom(displayName);
      } else {
        joinRoom(displayName, roomCode);
      }
    } catch (err) {
      console.error('Failed to register identity to Postgres:', err);
      if (action === 'create') {
        createRoom(displayName);
      } else {
        joinRoom(displayName, roomCode);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Top Phosphor Toolbar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderBottom: '2px solid var(--crt-border-muted)',
        background: 'rgba(0,0,0,0.6)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            background: isConnected ? '#00ff66' : 'var(--color-danger)',
            boxShadow: isConnected ? '0 0 6px #00ff66' : '0 0 6px var(--color-danger)',
            display: 'inline-block'
          }} />
          <span style={{ 
            fontFamily: 'Press Start 2P, monospace', 
            fontSize: '0.85rem',
            color: 'var(--crt-text-secondary)'
          }}>
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Username & Settings Gear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {displayName && (
            <span style={{
              fontFamily: 'Press Start 2P, monospace',
              fontSize: '0.85rem',
              color: 'var(--crt-text)',
              textShadow: 'var(--crt-glow)'
            }}>
              {displayName}
            </span>
          )}
          <button 
            onClick={() => { playClick(); setShowSettings(true); }} 
            className="btn-retro" 
            style={{ 
              padding: '6px 12px', 
              fontSize: '1.2rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              lineHeight: 1
            }}
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Settings Dialog Overlay */}
      {showSettings && (
        <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal terminal-panel" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', textAlign: 'center', color: 'var(--crt-text)', textShadow: 'var(--crt-glow-strong)' }}>
              SYSTEM CONFIG
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.1rem', color: 'var(--crt-text-secondary)' }}>THEME:</span>
                <button onClick={() => { playClick(); toggleTheme(); }} className="btn-retro" style={{ fontSize: '0.9rem', width: '130px', padding: '8px' }}>
                  {theme === 'dark' ? 'LIGHT' : 'DARK'}
                </button>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.1rem', color: 'var(--crt-text-secondary)' }}>PRESET:</span>
                <button onClick={() => { playClick(); togglePreset(); }} className="btn-retro" style={{ fontSize: '0.9rem', width: '130px', padding: '8px' }}>
                  {preset === 'green' ? 'AMBER' : 'GREEN'}
                </button>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.1rem', color: 'var(--crt-text-secondary)' }}>AUDIO:</span>
                <button onClick={() => { playClick(); toggleMute(); }} className="btn-retro" style={{ fontSize: '0.9rem', width: '130px', padding: '8px' }}>
                  {isMuted ? 'UNMUTE' : 'MUTE'}
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => { playClick(); setShowSettings(false); }} 
              className="btn-retro" 
              style={{ marginTop: '28px', width: '100%', borderColor: 'var(--crt-border-muted)', fontSize: '1.05rem' }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Main viewport card content */}
      <main className="app-main">
        {error && !isSandbox && (
          <div style={{
            background: 'rgba(255, 51, 51, 0.1)',
            border: '2px solid var(--color-danger)',
            color: 'var(--color-danger)',
            padding: '12px 24px',
            borderRadius: '4px',
            marginBottom: '16px',
            maxWidth: '440px',
            textAlign: 'center',
            fontSize: '0.9rem',
            boxShadow: 'var(--color-danger-glow)'
          }}>
            ERROR: {error}
          </div>
        )}

        {/* 1. Sandbox Playground View */}
        {isSandbox ? (
          <SandboxDebugView preset={preset} onBack={() => setIsSandbox(false)} />
        ) : (
          <>
            {/* 2. Registration lobby view */}
            {!room && (
              <div className="terminal-panel" style={{
                width: '100%',
                maxWidth: '440px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <h1 style={{
                    fontSize: '2.8rem',
                    color: 'var(--crt-text)',
                    letterSpacing: '0.1em'
                  }}>
                    MIDNIGHT
                  </h1>
                  <p style={{
                    fontSize: '0.8rem',
                    color: 'var(--crt-text-secondary)',
                    letterSpacing: '0.05em',
                    marginTop: '4px'
                  }}>
                    1-4-24 MULTIPLAYER RETRO PWA
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--crt-text-secondary)' }}>
                    INPUT DISP_NAME:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. USERNAME"
                    value={displayName}
                    onChange={(e) => saveDisplayName(e.target.value.toUpperCase())}
                    style={{
                      background: 'rgba(0,0,0,0.8)',
                      border: '2px solid var(--crt-border-muted)',
                      borderRadius: '4px',
                      padding: '12px',
                      color: 'var(--crt-text)',
                      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)'
                    }}
                  />
                </div>

                <hr style={{ border: '0', borderTop: '1px dashed var(--crt-border-muted)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => handleRegisterAndAction('create')}
                    disabled={!displayName.trim() || isRegistering}
                    className="btn-retro"
                  >
                    {isRegistering ? 'INITIALIZING...' : 'HOST NEW MATCH'}
                  </button>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    color: 'var(--crt-text-muted)',
                    fontSize: '0.8rem'
                  }}>
                    <span style={{ height: '1px', flex: 1, background: 'var(--crt-border-muted)' }} />
                    <span>OR JOIN EXISTING</span>
                    <span style={{ height: '1px', flex: 1, background: 'var(--crt-border-muted)' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="ROOM CODE"
                      maxLength={4}
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      style={{
                        background: 'rgba(0,0,0,0.8)',
                        border: '2px solid var(--crt-border-muted)',
                        borderRadius: '4px',
                        padding: '12px',
                        color: 'var(--crt-text)',
                        textAlign: 'center',
                        letterSpacing: '0.3em',
                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)'
                      }}
                    />
                    <button
                      onClick={() => handleRegisterAndAction('join')}
                      disabled={!displayName.trim() || roomCode.length !== 4 || isRegistering}
                      className="btn-retro"
                      style={{ 
                        borderColor: (displayName.trim() && roomCode.length === 4) ? 'var(--crt-border)' : 'var(--crt-border-muted)'
                      }}
                    >
                      ENTER MATCH ROOM
                    </button>
                  </div>

                  <hr style={{ border: '0', borderTop: '1px dashed var(--crt-border-muted)', margin: '4px 0' }} />
                  
                  <button
                    onClick={() => { playClick(); setIsSandbox(true); }}
                    className="btn-retro"
                    style={{
                      borderColor: 'var(--crt-text-secondary)',
                      color: 'var(--crt-text-secondary)',
                      fontFamily: 'Press Start 2P, monospace',
                      fontSize: '0.55rem',
                      padding: '12px'
                    }}
                  >
                    BOOT SANDBOX PLAYGROUND
                  </button>
                </div>
              </div>
            )}

            {/* 3. Lobby Sync View */}
            {room && room.gameState === 'LOBBY' && (
              <LobbyView 
                room={room} 
                myUserId={userId} 
                onStartGame={startGame} 
                onLeaveRoom={leaveRoom}
              />
            )}

            {/* 4. Game Play View */}
            {room && room.gameState !== 'LOBBY' && (
              <GamePlayView 
                room={room} 
                myUserId={userId} 
                activeRoll={activeRoll}
                diceToRoll={diceToRoll}
                rollId={rollId}
                submitRollResults={submitRollResults}
                clearActiveRoll={clearActiveRoll}
                onRollDice={rollDice}
                onKeepDice={keepDice}
                onLeaveRoom={leaveRoom}
                onInitiateRematch={initiateRematch}
                preset={preset}
              />
            )}
          </>
        )}
      </main>

      {/* Global Turn Transition Screen Override */}
      {room && room.turnTransition && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'var(--crt-bg)',
          opacity: 0.98,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '24px',
          animation: 'crt-flicker 0.15s infinite',
          boxSizing: 'border-box'
        }}>
          <span className="crt-flicker-layer" style={{ animationDuration: '0.15s' }} />
          
          <div style={{
            border: '2px solid var(--crt-border)',
            boxShadow: 'var(--crt-glow-strong)',
            background: 'var(--crt-bg-panel)',
            padding: '40px',
            borderRadius: '8px',
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            position: 'relative'
          }}>
            <div style={{
              fontFamily: 'Press Start 2P, monospace',
              fontSize: '0.75rem',
              color: 'var(--crt-text-secondary)',
              letterSpacing: '0.15em'
            }}>
              [ SYSTEM INTERRUPT ]
            </div>
            
            <h2 style={{
              fontSize: '2.5rem',
              color: 'var(--crt-text)',
              fontFamily: 'VT323, monospace',
              margin: 0
            }}>
              {room.turnTransition.playerName.toUpperCase()}<br/>FINISHED TURN!
            </h2>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(0, 0, 0, 0.6)',
              border: '1px dashed var(--crt-border-muted)',
              padding: '24px 40px',
              borderRadius: '4px'
            }}>
              {room.turnTransition.isDQ ? (
                <span style={{
                  color: 'var(--color-danger)',
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  fontFamily: 'VT323, monospace',
                  textShadow: 'var(--color-danger-glow)'
                }}>
                  DQ'D!
                </span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    color: (preset === 'amber' ? '#00ff66' : '#ffb000'), // Contrast colors
                    fontSize: '4rem',
                    fontWeight: 'bold',
                    fontFamily: 'VT323, monospace',
                    lineHeight: '1',
                    textShadow: (preset === 'amber' ? '0 0 12px rgba(0, 255, 102, 0.8)' : '0 0 12px rgba(255, 176, 0, 0.8)')
                  }}>
                    {room.turnTransition.score} PTS
                  </span>
                  {room.turnTransition.isShootout && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--crt-text-muted)', fontFamily: 'Press Start 2P', marginTop: '4px' }}>
                      SHOOTOUT SCORE
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={{
              fontSize: '0.65rem',
              color: 'var(--crt-text-muted)',
              fontFamily: 'Press Start 2P, monospace',
            }}>
              PREPARING NEXT TRANSFERS...
            </div>
          </div>
        </div>
      )}

      {/* Global Round Transition Screen Override */}
      {room && room.roundTransition && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'var(--crt-bg)',
          opacity: 0.98,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '24px',
          animation: 'crt-flicker 0.15s infinite',
          boxSizing: 'border-box'
        }}>
          <span className="crt-flicker-layer" style={{ animationDuration: '0.15s' }} />
          
          <div style={{
            border: '2px solid var(--crt-border)',
            boxShadow: 'var(--crt-glow-strong)',
            background: 'var(--crt-bg-panel)',
            padding: '40px',
            borderRadius: '8px',
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            position: 'relative'
          }}>
            <div style={{
              fontFamily: 'Press Start 2P, monospace',
              fontSize: '0.75rem',
              color: 'var(--crt-text-secondary)',
              letterSpacing: '0.15em'
            }}>
              [ ROUND COMPLETED ]
            </div>
            
            <h2 style={{
              fontSize: '2.5rem',
              color: 'var(--crt-text)',
              fontFamily: 'VT323, monospace',
              margin: 0
            }}>
              ROUND {room.roundTransition.roundNumber}<br/>VICTOR!
            </h2>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(0, 0, 0, 0.6)',
              border: '1px dashed var(--crt-border-muted)',
              padding: '24px 40px',
              borderRadius: '4px'
            }}>
              <span style={{
                color: (preset === 'amber' ? '#ffb000' : '#00ff66'),
                fontSize: '3.5rem',
                fontWeight: 'bold',
                fontFamily: 'VT323, monospace',
                lineHeight: '1',
                textShadow: 'var(--crt-glow)'
              }}>
                {room.roundTransition.winnerName.toUpperCase()}
              </span>
            </div>

            {/* standings breakdown */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '0.9rem',
              color: 'var(--crt-text-secondary)',
              textAlign: 'left',
              width: '100%',
              fontFamily: 'VT323, monospace'
            }}>
              <div style={{ borderBottom: '1px dashed var(--crt-border-muted)', paddingBottom: '4px', marginBottom: '4px', fontWeight: 'bold' }}>
                CURRENT ROUND WINS:
              </div>
              {room.players.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
                  <span>{p.name} {p.id === userId && '(YOU)'}</span>
                  <span style={{ color: 'var(--crt-text)' }}>{p.roundWins} WINS</span>
                </div>
              ))}
            </div>

            <div style={{
              fontSize: '0.65rem',
              color: 'var(--crt-text-muted)',
              fontFamily: 'Press Start 2P, monospace',
              marginTop: '8px'
            }}>
              PREPARING ROUND {room.roundTransition.roundNumber + 1}...
            </div>
          </div>
        </div>
      )}

      {/* Global CRT scanlines overlay */}
      <CRTOverlay />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AudioProvider>
        <GameAppInner />
      </AudioProvider>
    </ThemeProvider>
  );
}
