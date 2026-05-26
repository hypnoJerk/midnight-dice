import React, { useState, useEffect, useRef } from 'react';
import { Room, getRunningScore } from 'shared/types.js';
import Scoreboard from './Scoreboard.js';
import KeepZone from './KeepZone.js';
import DiceScene from '../canvas/DiceScene.js';
import { useSound } from '../hooks/useSound.js';

interface GamePlayViewProps {
  room: Room;
  myUserId: string;
  activeRoll: number[] | null;
  diceToRoll: number | null;
  rollId: number;
  submitRollResults: (dice: number[]) => void;
  clearActiveRoll: () => void;
  onRollDice: () => void;
  onKeepDice: (diceIndexes: number[]) => void;
  onLeaveRoom: () => void;
  onInitiateRematch: () => void;
  preset: 'green' | 'amber';
}

export function GamePlayView({
  room,
  myUserId,
  activeRoll,
  diceToRoll,
  rollId,
  submitRollResults,
  clearActiveRoll,
  onRollDice,
  onKeepDice,
  onLeaveRoom,
  onInitiateRematch,
  preset
}: GamePlayViewProps) {
  const { playClick, playRoll, playSuccess, playDq } = useSound();
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [isDqBust, setIsDqBust] = useState(false);

  // Rematch countdown logic
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!room?.rematch?.timerEndsAt) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((room.rematch!.timerEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);

    return () => clearInterval(interval);
  }, [room?.rematch?.timerEndsAt]);
 
  const mePlayer = room.players.find(p => p.id === myUserId);
  const isMeDq = !!mePlayer?.isDQ;

  const activePlayer = room.players[room.activePlayerIndex];
  const isActive = activePlayer?.id === myUserId;
  const isSpectator = !isActive;

  const isPhysicsRolling = diceToRoll !== null;
  const diceCount = isPhysicsRolling ? diceToRoll : (activeRoll ? activeRoll.length : 0);

  // Clear selections when active roll changes
  useEffect(() => {
    setSelectedIndexes([]);
  }, [activeRoll]);

  // Capture DQ occurrences for active player
  useEffect(() => {
    if (isMeDq) {
      setIsDqBust(true);
      playDq();
      
      // Stop shaking after 3 seconds
      const shakeTimer = setTimeout(() => {
        setIsDqBust(false);
      }, 3000);
   
      return () => {
        clearTimeout(shakeTimer);
      };
    } else {
      setIsDqBust(false);
    }
  }, [isMeDq]);

  const handleTapDie = (index: number) => {
    playClick();
    setSelectedIndexes(prev => {
      if (prev.includes(index)) {
        return prev.filter(idx => idx !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleRoll = () => {
    playRoll();
    onRollDice();
  };

  const handleKeep = () => {
    if (selectedIndexes.length === 0) return;
    playSuccess();
    onKeepDice(selectedIndexes);
  };

  return (
    <div className={`terminal-panel ${isDqBust ? 'dq-shake-active' : ''}`} style={{
      width: '100%',
      maxWidth: '640px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      transition: 'var(--transition-smooth)'
    }}>
      {/* 1. Header status bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--crt-border-muted)',
        paddingBottom: '8px',
        fontSize: '0.85rem'
      }}>
        <span style={{ color: 'var(--crt-text-secondary)' }}>
          MODE: {room.gameState}
        </span>
        <span style={{ 
          color: 'var(--crt-text)', 
          fontFamily: 'Press Start 2P, monospace', 
          fontSize: '0.6rem',
          textShadow: 'var(--crt-glow)'
        }}>
          ROUND {room.currentRound || 1} / 3
        </span>
        <span style={{ color: isConnectedColor(room.gameState) }}>
          ROOM: {room.code}
        </span>
      </div>

      {/* 2. Main Play tray */}
      {room.gameState === 'PLAYING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isActive ? (
            /* Active Player View (R3F Canvas) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ 
                fontFamily: 'Press Start 2P, monospace', 
                fontSize: '0.55rem', 
                color: '#00ff66',
                textAlign: 'center'
              }}>
                * YOUR TURN TO ROLL *
              </div>
              
              <DiceScene 
                diceCount={diceCount}
                rollId={rollId}
                targetValues={isPhysicsRolling ? undefined : (activeRoll || undefined)}
                onTapDie={handleTapDie}
                onRollComplete={(values) => {
                  if (isPhysicsRolling) {
                    submitRollResults(values);
                  }
                }}
                preset={preset}
                selectedIndexes={selectedIndexes}
              />

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button 
                  onClick={handleRoll} 
                  disabled={isPhysicsRolling || (activeRoll !== null && activeRoll.length > 0)}
                  className="btn-retro"
                  style={{ flex: 1 }}
                >
                  ROLL DICE
                </button>
                <button 
                  onClick={handleKeep} 
                  disabled={isPhysicsRolling || selectedIndexes.length === 0}
                  className="btn-retro"
                  style={{ 
                    flex: 1, 
                    borderColor: (!isPhysicsRolling && selectedIndexes.length > 0) ? '#00ff66' : 'var(--crt-border-muted)',
                    color: (!isPhysicsRolling && selectedIndexes.length > 0) ? '#00ff66' : 'var(--crt-text-muted)'
                  }}
                >
                  LOCK SELECTION ({selectedIndexes.length})
                </button>
              </div>
            </div>
          ) : (
            /* Spectator View (Battery Saver - unmounted canvas) */
            <div style={{
              height: '180px',
              border: '1px dashed var(--crt-border-muted)',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
              gap: '8px',
              padding: '16px'
            }}>
              <span className="crt-flicker-layer" style={{ animationDuration: '2s' }} />
              <div style={{ 
                fontFamily: 'Press Start 2P, monospace', 
                fontSize: '0.65rem',
                color: 'var(--crt-text-muted)'
              }}>
                [SPECTATING ACTIVE DICE BOARD]
              </div>
              <div style={{ fontSize: '1rem', color: 'var(--crt-text-secondary)', textAlign: 'center' }}>
                Waiting for {activePlayer?.name || 'player'} to throw...
              </div>
              <div style={{
                fontSize: '2.5rem',
                fontFamily: 'VT323, monospace',
                color: 'var(--crt-text)',
                textShadow: 'var(--crt-glow-strong)',
                marginTop: '4px'
              }}>
                CURRENT SCORE: {getRunningScore(activePlayer?.diceKept || [])}
              </div>
            </div>
          )}

          {/* Active player's individual 2D Keep zone */}
          <KeepZone 
            keptDice={activePlayer?.diceKept || []} 
            hasOne={activePlayer?.hasOne || false} 
            hasFour={activePlayer?.hasFour || false}
            preset={preset}
          />
        </div>
      )}

      {/* 3. Shootout Phase View */}
      {room.gameState === 'SHOOTOUT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            textAlign: 'center',
            background: 'rgba(255, 51, 51, 0.1)',
            border: '1px solid var(--color-danger)',
            padding: '12px',
            borderRadius: '4px'
          }}>
            <h3 style={{ color: 'var(--color-danger)', fontFamily: 'Press Start 2P, monospace', fontSize: '0.75rem' }}>
              !!! TIE-BREAKER SHOOTOUT !!!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--crt-text-secondary)', marginTop: '4px' }}>
              Qualification rules suspended! Sum of all 6 dice is your score.
            </p>
          </div>

          {isActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <DiceScene 
                diceCount={diceCount}
                rollId={activePlayer?.rollsCount || 0}
                onTapDie={() => {}} // No tapping in shootout
                onRollComplete={(values) => {
                  if (isPhysicsRolling) {
                    submitRollResults(values);
                  }
                }}
                preset={preset}
              />
              <button onClick={handleRoll} disabled={isPhysicsRolling || !!activeRoll} className="btn-retro">
                ROLL ALL SIX DICE
              </button>
            </div>
          ) : (
            <div style={{
              height: '140px',
              border: '1px dashed var(--crt-border-muted)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)'
            }}>
              <span>Waiting for {activePlayer?.name} to shootout...</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Game Over View */}
      {room.gameState === 'GAME_OVER' && (() => {
        const hasAccepted = room.rematch?.acceptedPlayers.includes(myUserId);
        const accentColor = preset === 'amber' ? '#ffb000' : '#00ff66';
        const glowShadow = preset === 'amber' ? '0 0 8px rgba(255, 176, 0, 0.8)' : '0 0 8px rgba(0, 255, 102, 0.8)';
        
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: '24px',
            border: `2px solid ${accentColor}`,
            borderRadius: '4px',
            background: `rgba(${preset === 'amber' ? '255, 176, 0' : '0, 255, 102'}, 0.05)`,
            boxShadow: `0 0 15px rgba(${preset === 'amber' ? '255, 176, 0' : '0, 255, 102'}, 0.25)`,
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ 
              fontFamily: 'Press Start 2P, monospace', 
              fontSize: '1rem', 
              color: accentColor,
              textShadow: glowShadow,
              margin: 0
            }}>
              MATCH COMPLETE
            </h2>
            <div style={{ fontSize: '1.2rem', textAlign: 'center', fontFamily: 'VT323, monospace', fontSize: '1.6rem' }}>
              Winner(s):{' '}
              <span style={{ color: accentColor, fontWeight: 'bold', textShadow: glowShadow }}>
                {room.winners.map(id => room.players.find(p => p.id === id)?.name).join(', ')}
              </span>
            </div>

            <hr style={{ width: '100%', border: '0', borderTop: '1px dashed var(--crt-border-muted)', margin: '4px 0' }} />

            {/* Rematch Section */}
            {!room.rematch ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                <div style={{ fontFamily: 'Press Start 2P', fontSize: '0.55rem', color: 'var(--crt-text-secondary)', textAlign: 'center' }}>
                  WANT A REMATCH?
                </div>
                <button 
                  onClick={onInitiateRematch} 
                  className="btn-retro"
                  style={{ 
                    borderColor: accentColor, 
                    color: accentColor,
                    fontFamily: 'Press Start 2P, monospace',
                    fontSize: '0.75rem',
                    width: '100%',
                    padding: '12px'
                  }}
                >
                  [ INITIATE REMATCH ]
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
                {/* Flashing Timer Countdown */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.6)',
                  border: `1px solid ${accentColor}`,
                  borderRadius: '4px',
                  padding: '12px',
                  width: '100%',
                  boxSizing: 'border-box',
                  animation: timeLeft <= 5 ? 'crt-flicker 0.2s infinite' : 'none'
                }}>
                  <div style={{ fontFamily: 'Press Start 2P', fontSize: '0.5rem', color: 'var(--crt-text-muted)', marginBottom: '6px' }}>
                    REMATCH TIMER COUNTDOWN
                  </div>
                  <div style={{ 
                    fontFamily: 'Press Start 2P, monospace', 
                    fontSize: '1.4rem', 
                    color: timeLeft <= 5 ? 'var(--color-danger)' : accentColor,
                    textShadow: timeLeft <= 5 ? 'var(--color-danger-glow)' : glowShadow,
                    fontWeight: 'bold'
                  }}>
                    {timeLeft}s SECONDS LEFT
                  </div>
                </div>

                {/* Acceptance Buttons */}
                {!hasAccepted ? (
                  <button 
                    onClick={onInitiateRematch} 
                    className="btn-retro"
                    style={{ 
                      borderColor: '#00ff66', 
                      color: '#00ff66',
                      fontFamily: 'Press Start 2P, monospace',
                      fontSize: '0.75rem',
                      width: '100%',
                      padding: '12px'
                    }}
                  >
                    [ JOIN REMATCH MATCH ]
                  </button>
                ) : (
                  <div style={{
                    fontFamily: 'Press Start 2P, monospace',
                    fontSize: '0.6rem',
                    color: '#00ff66',
                    textShadow: '0 0 6px #00ff66',
                    padding: '8px',
                    textAlign: 'center',
                    border: '1px dashed #00ff66',
                    width: '100%',
                    boxSizing: 'border-box',
                    animation: 'pulse 1.5s infinite'
                  }}>
                    * READY - WAITING FOR OTHER PLAYERS *
                  </div>
                )}

                {/* Participant Checklist */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.9rem',
                  fontFamily: 'VT323, monospace',
                  textAlign: 'left',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--crt-border-muted)'
                }}>
                  <div style={{ borderBottom: '1px dashed var(--crt-border-muted)', paddingBottom: '4px', marginBottom: '2px', fontSize: '0.8rem', color: 'var(--crt-text-muted)' }}>
                    LOBBY DECISIONS:
                  </div>
                  {room.players.map(p => {
                    const ready = room.rematch?.acceptedPlayers.includes(p.id);
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem' }}>
                        <span>{p.name} {p.id === myUserId && '(YOU)'}</span>
                        {ready ? (
                          <span style={{ color: '#00ff66', fontWeight: 'bold' }}>[READY]</span>
                        ) : (
                          <span style={{ color: 'var(--crt-text-muted)', animation: 'pulse 1s infinite' }}>[DECIDING...]</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={onLeaveRoom} className="btn-retro" style={{ width: '100%', marginTop: '4px' }}>
              Return to Main Menu
            </button>
          </div>
        );
      })()}

      {/* 5. Match Scoreboard list */}
      <Scoreboard 
        players={room.players} 
        activePlayerId={activePlayer?.id || null} 
        winners={room.winners} 
        myUserId={myUserId}
      />

      <button 
        onClick={onLeaveRoom} 
        className="btn-retro" 
        style={{ 
          marginTop: '8px', 
          borderColor: 'var(--crt-border-muted)', 
          color: 'var(--crt-text-secondary)',
          boxShadow: 'none'
        }}
      >
        QUIT MATCH
      </button>

    </div>
  );
}

function isConnectedColor(gameState: string) {
  return gameState === 'LOBBY' ? 'var(--crt-text-secondary)' : '#00ff66';
}
export default GamePlayView;
