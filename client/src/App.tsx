import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext.js';
import { AudioProvider, useAudio } from './context/AudioContext.js';
import { useGame } from './hooks/useGame.js';
import { useSound } from './hooks/useSound.js';
import LobbyView from './components/LobbyView.js';
import GamePlayView from './components/GamePlayView.js';
import CRTOverlay from './components/CRTOverlay.js';
import SandboxDebugView from './components/SandboxDebugView.js';
import LeaderboardView from './components/LeaderboardView.js';

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
    isConnected,
    loginUser,
    logoutUser
  } = useGame();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [displayName, setDisplayName] = useState(
    localStorage.getItem('midnight_display_name') || ''
  );
  const [roomCode, setRoomCode] = useState('');
  const [isSandbox, setIsSandbox] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const prevRoundTransitionRef = useRef<any>(null);

  // Sync displayName with local storage when userId changes
  useEffect(() => {
    setDisplayName(localStorage.getItem('midnight_display_name') || '');
  }, [userId]);

  // Trigger procedural 8-bit victory success chime when round transition starts
  useEffect(() => {
    if (room?.roundTransition && !prevRoundTransitionRef.current) {
      playSuccess();
    }
    prevRoundTransitionRef.current = room?.roundTransition;
  }, [room?.roundTransition, playSuccess]);

  const handleAuth = async (action: 'login' | 'create') => {
    playClick();
    setAuthError(null);

    const cleanUsername = usernameInput.trim().toUpperCase();
    if (!cleanUsername) {
      setAuthError('USERNAME REQUIRED');
      return;
    }
    if (!passwordInput) {
      setAuthError('PASSWORD REQUIRED');
      return;
    }

    setIsAuthenticating(true);
    try {
      const endpoint = action === 'create' ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: passwordInput })
      });

      const data = await response.json();

      if (!response.ok) {
        // Map backend responses to exact required retro displays
        if (action === 'create' && response.status === 409) {
          setAuthError('USERNAME ALREADY EXISTS. TRY A DIFFERENT NAME.');
        } else if (action === 'login' && response.status === 404) {
          setAuthError('USERNAME DOES NOT EXIST.');
        } else if (action === 'login' && response.status === 401) {
          setAuthError('INVALID LOGIN.');
        } else {
          setAuthError((data.error || 'AUTHENTICATION FAILED.').toUpperCase());
        }
        return;
      }

      loginUser(data.id, data.displayName);
      setUsernameInput('');
      setPasswordInput('');
    } catch (err: any) {
      console.error(err);
      setAuthError('SYSTEM OFFLINE. TRY AGAIN LATER.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleHostRoom = () => {
    playClick();
    if (!displayName) return;
    createRoom(displayName);
  };

  const handleJoinRoom = () => {
    playClick();
    if (!displayName || roomCode.length !== 4) return;
    joinRoom(displayName, roomCode);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Top Phosphor Toolbar */}
      <header className="app-header">
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
              padding: '6px 10px', 
              fontSize: '1rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              lineHeight: 1
            }}
          >
            <svg 
              width="1.1em" 
              height="1.1em" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ display: 'inline-block', verticalAlign: 'middle' }}
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
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
        ) : showLeaderboard ? (
          <LeaderboardView onClose={() => setShowLeaderboard(false)} preset={preset} myUserId={userId} />
        ) : (
          <>
            {/* 2. Unauthenticated Login/Create form */}
            {!room && !userId && (
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

                {authError && (
                  <div style={{
                    background: 'rgba(255, 51, 51, 0.1)',
                    border: '2px solid var(--color-danger)',
                    color: 'var(--color-danger)',
                    padding: '12px',
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontFamily: 'Press Start 2P, monospace',
                    lineHeight: '1.4',
                    boxShadow: 'var(--color-danger-glow)',
                    textTransform: 'uppercase'
                  }}>
                    {authError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--crt-text-secondary)' }}>
                    PLAYER CODENAME:
                  </label>
                  <input
                    type="text"
                    placeholder="ENTER USERNAME"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value.toUpperCase())}
                    disabled={isAuthenticating}
                    style={{
                      background: 'var(--crt-bg-solid)',
                      border: '2px solid var(--crt-border-muted)',
                      borderRadius: '4px',
                      padding: '12px',
                      color: 'var(--crt-text)',
                      boxShadow: 'var(--crt-shadow-inset)'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--crt-text-secondary)' }}>
                    SECURITY KEYPASS:
                  </label>
                  <input
                    type="password"
                    placeholder="ENTER PASSWORD"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    disabled={isAuthenticating}
                    style={{
                      background: 'var(--crt-bg-solid)',
                      border: '2px solid var(--crt-border-muted)',
                      borderRadius: '4px',
                      padding: '12px',
                      color: 'var(--crt-text)',
                      boxShadow: 'var(--crt-shadow-inset)',
                      letterSpacing: '0.1em'
                    }}
                  />
                </div>

                <hr style={{ border: '0', borderTop: '1px dashed var(--crt-border-muted)' }} />

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleAuth('login')}
                    disabled={isAuthenticating}
                    className="btn-retro"
                    style={{ flex: 1, fontSize: '1rem', padding: '12px' }}
                  >
                    {isAuthenticating ? 'LOGGING IN...' : 'LOGIN'}
                  </button>
                  <button
                    onClick={() => handleAuth('create')}
                    disabled={isAuthenticating}
                    className="btn-retro"
                    style={{ flex: 1, fontSize: '1rem', padding: '12px' }}
                  >
                    {isAuthenticating ? 'CREATING...' : 'CREATE'}
                  </button>
                </div>

                <button
                  onClick={() => { playClick(); setShowLeaderboard(true); }}
                  className="btn-retro"
                  style={{
                    borderColor: 'var(--crt-text-secondary)',
                    color: 'var(--crt-text-secondary)',
                    fontFamily: 'Press Start 2P, monospace',
                    fontSize: '0.55rem',
                    padding: '12px',
                    marginTop: '4px',
                    width: '100%'
                  }}
                >
                  ACCESS GLOBAL LEADERBOARD
                </button>
              </div>
            )}

            {/* 2b. Authenticated Host/Join game controls */}
            {!room && userId && (
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

                <div style={{
                  background: 'var(--crt-bg-card)',
                  border: '1px dashed var(--crt-border-muted)',
                  padding: '12px 16px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--crt-text-muted)', fontFamily: 'Press Start 2P' }}>LOGGED IN AS</span>
                    <span style={{ fontSize: '1.2rem', color: 'var(--crt-text)', textShadow: 'var(--crt-glow)' }}>{displayName}</span>
                  </div>
                  <button
                    onClick={() => { playClick(); logoutUser(); }}
                    className="btn-retro"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      borderColor: 'var(--color-danger)',
                      color: 'var(--color-danger)',
                      boxShadow: 'none'
                    }}
                  >
                    LOGOUT
                  </button>
                </div>

                <hr style={{ border: '0', borderTop: '1px dashed var(--crt-border-muted)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Primary Option: Join Game */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{
                      fontFamily: 'Press Start 2P, monospace',
                      fontSize: '0.75rem',
                      color: 'var(--crt-text)',
                      textShadow: 'var(--crt-glow)',
                      textAlign: 'center',
                      letterSpacing: '0.1em',
                      marginBottom: '4px'
                    }}>
                      ▼ JOIN ACTIVE MATCH
                    </div>

                    <input
                      type="text"
                      placeholder="ENTER 4-DIGIT CODE"
                      maxLength={4}
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      style={{
                        background: 'var(--crt-bg-solid)',
                        border: roomCode.length === 4 
                          ? '2px solid var(--crt-border)' 
                          : '2px solid var(--crt-text-secondary)',
                        borderRadius: '4px',
                        padding: '14px',
                        color: 'var(--crt-text)',
                        textAlign: 'center',
                        fontSize: '1.25rem',
                        letterSpacing: '0.25em',
                        boxShadow: roomCode.length === 4
                          ? '0 0 15px var(--crt-border), var(--crt-shadow-inset)'
                          : 'var(--crt-shadow-inset)',
                        transition: 'var(--transition-smooth)'
                      }}
                    />

                    <button
                      onClick={handleJoinRoom}
                      disabled={roomCode.length !== 4}
                      className={roomCode.length === 4 ? 'btn-retro btn-retro-primary' : 'btn-retro'}
                      style={{ 
                        padding: '14px',
                        fontSize: '1.1rem',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {roomCode.length === 4 ? '⚡ DEPLOY TO ROOM ⚡' : 'ENTER MATCH ROOM'}
                    </button>
                  </div>

                  {/* Separator */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    color: 'var(--crt-text-secondary)',
                    fontSize: '0.7rem',
                    fontFamily: 'Press Start 2P, monospace'
                  }}>
                    <span style={{ height: '1px', flex: 1, background: 'var(--crt-border-muted)' }} />
                    <span>OR HOST A ROOM</span>
                    <span style={{ height: '1px', flex: 1, background: 'var(--crt-border-muted)' }} />
                  </div>

                  {/* Secondary Option: Host Game */}
                  <button
                    onClick={handleHostRoom}
                    className="btn-retro"
                    style={{ 
                      padding: '12px', 
                      fontSize: '0.95rem',
                      borderColor: 'var(--crt-border-muted)',
                      color: 'var(--crt-text-secondary)',
                      boxShadow: 'none'
                    }}
                  >
                    HOST NEW MATCH
                  </button>

                  <hr style={{ border: '0', borderTop: '1px dashed var(--crt-border-muted)', margin: '4px 0' }} />
                  
                  {displayName && displayName.toUpperCase() === 'HYPNO' && (
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
                  )}

                  <button
                    onClick={() => { playClick(); setShowLeaderboard(true); }}
                    className="btn-retro"
                    style={{
                      borderColor: 'var(--crt-text-secondary)',
                      color: 'var(--crt-text-secondary)',
                      fontFamily: 'Press Start 2P, monospace',
                      fontSize: '0.55rem',
                      padding: '12px',
                      marginTop: '8px'
                    }}
                  >
                    ACCESS GLOBAL LEADERBOARD
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
              background: 'var(--crt-bg-card)',
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
              background: 'var(--crt-bg-card)',
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
