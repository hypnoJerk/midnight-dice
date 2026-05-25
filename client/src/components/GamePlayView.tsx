import React, { useState, useEffect } from 'react';
import { Room } from 'shared/types.js';
import Scoreboard from './Scoreboard.js';
import KeepZone from './KeepZone.js';
import DiceScene from '../canvas/DiceScene.js';
import { useSound } from '../hooks/useSound.js';

interface GamePlayViewProps {
  room: Room;
  myUserId: string;
  activeRoll: number[] | null;
  diceToRoll: number | null;
  submitRollResults: (dice: number[]) => void;
  clearActiveRoll: () => void;
  onRollDice: () => void;
  onKeepDice: (diceIndexes: number[]) => void;
  onLeaveRoom: () => void;
  preset: 'green' | 'amber';
}

export function GamePlayView({
  room,
  myUserId,
  activeRoll,
  diceToRoll,
  submitRollResults,
  clearActiveRoll,
  onRollDice,
  onKeepDice,
  onLeaveRoom,
  preset
}: GamePlayViewProps) {
  const { playClick, playRoll, playSuccess, playDq } = useSound();
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [isDqBust, setIsDqBust] = useState(false);
  const [showDqModal, setShowDqModal] = useState(false);

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
    const mePlayer = room.players.find(p => p.id === myUserId);
    if (mePlayer?.isDQ && !isDqBust) {
      setIsDqBust(true);
      playDq();
      
      // Trigger temporary violent shake and then show pop-up
      const timer = setTimeout(() => {
        setShowDqModal(true);
      }, 1000);
 
      return () => clearTimeout(timer);
    } else if (room.gameState === 'PLAYING' && !mePlayer?.isDQ) {
      setIsDqBust(false);
      setShowDqModal(false);
    }
  }, [room.players, myUserId, playDq, isDqBust, room.gameState]);

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
                rollId={activePlayer?.rollsCount || 0}
                onTapDie={handleTapDie}
                onRollComplete={(values) => {
                  if (isPhysicsRolling) {
                    submitRollResults(values);
                  }
                }}
                preset={preset}
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
              gap: '12px'
            }}>
              <span className="crt-flicker-layer" style={{ animationDuration: '2s' }} />
              <div style={{ 
                fontFamily: 'Press Start 2P, monospace', 
                fontSize: '0.65rem',
                color: 'var(--crt-text-muted)'
              }}>
                [SPECTATING ACTIVE DICE BOARD]
              </div>
              <div style={{ fontSize: '1rem', color: 'var(--crt-text-secondary)' }}>
                Waiting for {activePlayer?.name || 'player'} to throw...
              </div>
            </div>
          )}

          {/* Active player's individual 2D Keep zone */}
          <KeepZone 
            keptDice={activePlayer?.diceKept || []} 
            hasOne={activePlayer?.hasOne || false} 
            hasFour={activePlayer?.hasFour || false}
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
      {room.gameState === 'GAME_OVER' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          padding: '24px',
          border: '2px solid #00ff66',
          borderRadius: '4px',
          background: 'rgba(0, 255, 102, 0.05)',
          boxShadow: 'var(--crt-glow-strong)'
        }}>
          <h2 style={{ fontFamily: 'Press Start 2P, monospace', fontSize: '1rem', color: '#00ff66' }}>
            MATCH COMPLETE
          </h2>
          <div style={{ fontSize: '1.2rem', textAlign: 'center' }}>
            Winner(s):{' '}
            <span style={{ color: '#00ff66', fontWeight: 'bold' }}>
              {room.winners.map(id => room.players.find(p => p.id === id)?.name).join(', ')}
            </span>
          </div>
          <button onClick={onLeaveRoom} className="btn-retro">
            Return to Lobby
          </button>
        </div>
      )}

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

      {/* Disqualification BUST pop-up Modal */}
      {showDqModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'crt-flicker 0.15s infinite'
        }}>
          <div className="terminal-panel" style={{
            maxWidth: '340px',
            textAlign: 'center',
            borderColor: 'var(--color-danger)',
            boxShadow: 'var(--color-danger-glow)'
          }}>
            <h2 style={{ color: 'var(--color-danger)', fontSize: '2.5rem', marginBottom: '12px' }}>
              DQ'D!
            </h2>
            <div style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--crt-text-secondary)' }}>
              BUST! Failed to keep both a 1 and a 4 by the end of your turn.
            </div>
            <button onClick={() => setShowDqModal(false)} className="btn-retro" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function isConnectedColor(gameState: string) {
  return gameState === 'LOBBY' ? 'var(--crt-text-secondary)' : '#00ff66';
}
export default GamePlayView;
