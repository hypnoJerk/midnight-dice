import React, { useState } from 'react';
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
  const { playClick } = useSound();
  
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
    isConnected
  } = useGame();

  const [displayName, setDisplayName] = useState(
    localStorage.getItem('midnight_display_name') || ''
  );
  const [roomCode, setRoomCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: isConnected ? '#00ff66' : 'var(--color-danger)',
            boxShadow: isConnected ? '0 0 6px #00ff66' : '0 0 6px var(--color-danger)',
            display: 'inline-block'
          }} />
          <span style={{ 
            fontFamily: 'Press Start 2P, monospace', 
            fontSize: '0.45rem',
            color: 'var(--crt-text-secondary)'
          }}>
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Phosphor control buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { playClick(); toggleTheme(); }} className="btn-retro" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
            {theme === 'dark' ? 'LIGHT' : 'DARK'}
          </button>
          <button onClick={() => { playClick(); togglePreset(); }} className="btn-retro" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
            {preset === 'green' ? 'AMBER' : 'GREEN'}
          </button>
          <button onClick={() => { playClick(); toggleMute(); }} className="btn-retro" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
            {isMuted ? 'UNMUTE' : 'MUTE'}
          </button>
        </div>
      </header>

      {/* Main viewport card content */}
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '24px 16px',
        zIndex: 2
      }}>
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
                  BUSTED!
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
