import React, { useState, useEffect } from 'react';
import { useSound } from '../hooks/useSound.js';

interface DBUser {
  id: string;
  displayName: string;
  totalWins: number;
  gamesPlayed: number;
}

interface RecentMatch {
  id: string;
  roomCode: string;
  createdAt: string;
  winningScore: number;
  winnerName: string | null;
}

interface LeaderboardViewProps {
  onClose: () => void;
  myUserId: string;
  preset?: 'green' | 'amber';
}

export function LeaderboardView({ onClose, myUserId, preset = 'green' }: LeaderboardViewProps) {
  const { playClick } = useSound();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'matches'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<DBUser[]>([]);
  const [matches, setMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Staggered loading sequence logs for high-immersion retro CRT effect
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const loadingLogs = [
    'CONNECTING TO CENTRAL DATABASE...',
    'RETRIEVING RECORD SHEETS...',
    'DECRYPTING MATCH HISTORY SYNC...',
    'DATABANK SYNCHRONIZATION COMPLETED.'
  ];

  const fetchData = async () => {
    setLoading(true);
    setLoadingStep(0);
    setError(null);

    try {
      const [leaderboardRes, matchesRes] = await Promise.all([
        fetch('/api/leaderboard'),
        fetch('/api/matches')
      ]);

      if (!leaderboardRes.ok || !matchesRes.ok) {
        throw new Error('System databank sync error.');
      }

      const leaderboardData = await leaderboardRes.json();
      const matchesData = await matchesRes.json();

      setLeaderboard(leaderboardData);
      setMatches(matchesData);
    } catch (err: any) {
      console.error(err);
      setError('DATABANK OFFLINE OR UNREACHABLE');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Staggered bootup text progression
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingLogs.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setLoading(false);
          return prev;
        }
      });
    }, 350);

    return () => clearInterval(interval);
  }, [loading]);

  const handleRefresh = () => {
    playClick();
    fetchData();
  };

  // Find personal user stats in leaderboard
  const currentUserStats = leaderboard.find((user) => user.id === myUserId);

  // Helper to format timestamps
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    } catch {
      return isoString;
    }
  };

  // Special retro symbols/ranks for top 3
  const getRankIndicator = (index: number) => {
    if (index === 0) return '[*] 1ST';
    if (index === 1) return '[#] 2ND';
    if (index === 2) return '[@] 3RD';
    return `[ ] ${index + 1}TH`;
  };

  return (
    <div className="terminal-panel" style={{
      width: '100%',
      maxWidth: '680px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      margin: '0 auto',
      animation: 'crt-flicker 0.15s infinite'
    }}>
      {/* Decal and Flashing Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          fontFamily: 'Press Start 2P, monospace',
          fontSize: '0.65rem',
          color: 'var(--crt-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--crt-accent)',
            boxShadow: '0 0 6px var(--crt-accent)',
            display: 'inline-block',
            animation: 'crt-flicker 0.4s infinite'
          }} />
          DATABANK: ONLINE
        </div>
        <div style={{
          fontFamily: 'Press Start 2P, monospace',
          fontSize: '0.65rem',
          color: 'var(--crt-text-muted)'
        }}>
          [SYS_VER: 1.4.24]
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '2.4rem',
          color: 'var(--crt-text)',
          letterSpacing: '0.05rem',
          margin: '0 0 4px 0',
          textShadow: 'var(--crt-glow-strong)'
        }}>
          GLOBAL LEADERBOARD
        </h1>
        <p style={{
          fontSize: '0.8rem',
          color: 'var(--crt-text-secondary)',
          letterSpacing: '0.05em'
        }}>
          CENTRAL REGISTERED HIGH SCORE DIRECTORY
        </p>
      </div>

      {/* Tabs Menu */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--crt-border-muted)',
        paddingBottom: '2px',
        gap: '12px'
      }}>
        <button
          onClick={() => { playClick(); setActiveTab('leaderboard'); }}
          className="btn-retro"
          style={{
            flex: 1,
            fontSize: '0.95rem',
            padding: '10px',
            borderColor: activeTab === 'leaderboard' ? 'var(--crt-border)' : 'transparent',
            background: activeTab === 'leaderboard' ? 'var(--crt-border-muted)' : 'transparent',
            boxShadow: activeTab === 'leaderboard' ? 'var(--crt-glow)' : 'none'
          }}
        >
          HALL OF FAME
        </button>
        <button
          onClick={() => { playClick(); setActiveTab('matches'); }}
          className="btn-retro"
          style={{
            flex: 1,
            fontSize: '0.95rem',
            padding: '10px',
            borderColor: activeTab === 'matches' ? 'var(--crt-border)' : 'transparent',
            background: activeTab === 'matches' ? 'var(--crt-border-muted)' : 'transparent',
            boxShadow: activeTab === 'matches' ? 'var(--crt-glow)' : 'none'
          }}
        >
          RECENT MATCHES
        </button>
      </div>

      {/* Data loading or rendering view */}
      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '240px',
          fontFamily: 'monospace',
          fontSize: '1rem',
          color: 'var(--crt-text)',
          gap: '16px',
          border: '1px dashed var(--crt-border-muted)',
          borderRadius: '4px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '440px' }}>
            {loadingLogs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  opacity: loadingStep >= idx ? 1 : 0.15,
                  transition: 'opacity 0.2s ease',
                  color: loadingStep === idx ? 'var(--crt-text)' : 'var(--crt-text-secondary)',
                  textShadow: loadingStep === idx ? 'var(--crt-glow)' : 'none'
                }}
              >
                {loadingStep >= idx ? '> ' : '  '} {log}
              </div>
            ))}
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--crt-text-muted)',
            marginTop: '16px',
            animation: 'crt-flicker 0.2s infinite'
          }}>
            [ SYNCHRONIZING MEMORY CORES ]
          </div>
        </div>
      ) : error ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '240px',
          border: '2px solid var(--color-danger)',
          color: 'var(--color-danger)',
          boxShadow: 'var(--color-danger-glow)',
          padding: '24px',
          borderRadius: '4px',
          textAlign: 'center',
          gap: '16px'
        }}>
          <div style={{ fontFamily: 'Press Start 2P, monospace', fontSize: '1.2rem' }}>
            SYSTEM INTERRUPT: ERROR
          </div>
          <div>{error}</div>
          <button onClick={handleRefresh} className="btn-retro" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
            RE-TRY INTERRUPT
          </button>
        </div>
      ) : (
        <>
          {/* Main content body */}
          <div style={{ minHeight: '280px', overflowX: 'auto' }}>
            {activeTab === 'leaderboard' ? (
              leaderboard.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '240px',
                  border: '1px dashed var(--crt-border-muted)',
                  color: 'var(--crt-text-muted)'
                }}>
                  NO ACTIVE PLAYER IDENTITIES INDEXED
                </div>
              ) : (
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '1.2rem',
                  fontFamily: 'var(--font-pixel)',
                  textAlign: 'left'
                }}>
                  <thead>
                    <tr style={{
                      borderBottom: '2px solid var(--crt-border)',
                      color: 'var(--crt-text-secondary)',
                      fontSize: '1rem'
                    }}>
                      <th style={{ padding: '8px 12px' }}>RANK</th>
                      <th style={{ padding: '8px 12px' }}>PLAYER DISPLAY_NAME</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>WINS</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>PLAYED</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>WIN_RATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((user, idx) => {
                      const isMe = user.id === myUserId;
                      const winRate = user.gamesPlayed > 0
                        ? `${((user.totalWins / user.gamesPlayed) * 100).toFixed(0)}%`
                        : '0%';

                      return (
                        <tr
                          key={user.id}
                          style={{
                            borderBottom: '1px solid var(--crt-border-muted)',
                            background: isMe ? 'var(--crt-border-muted)' : 'transparent',
                            color: isMe ? 'var(--crt-text)' : 'var(--crt-text-secondary)',
                            fontWeight: isMe ? 'bold' : 'normal',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          <td style={{ padding: '8px 12px', color: idx < 3 ? 'var(--crt-text)' : 'var(--crt-text-secondary)' }}>
                            {getRankIndicator(idx)}
                          </td>
                          <td style={{ padding: '8px 12px', color: isMe ? 'var(--crt-text)' : 'inherit' }}>
                            {user.displayName} {isMe && '(YOU)'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--crt-text)' }}>
                            {user.totalWins}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {user.gamesPlayed}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--crt-text)' }}>
                            {winRate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : (
              matches.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '240px',
                  border: '1px dashed var(--crt-border-muted)',
                  color: 'var(--crt-text-muted)'
                }}>
                  NO RECENT SYSTEM TERMINALS RECORDED
                </div>
              ) : (
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '1.2rem',
                  fontFamily: 'var(--font-pixel)',
                  textAlign: 'left'
                }}>
                  <thead>
                    <tr style={{
                      borderBottom: '2px solid var(--crt-border)',
                      color: 'var(--crt-text-secondary)',
                      fontSize: '1rem'
                    }}>
                      <th style={{ padding: '8px 12px' }}>TIMESTAMP</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>ROOM</th>
                      <th style={{ padding: '8px 12px' }}>VICTOR</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>SCORE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => (
                      <tr key={match.id} style={{ borderBottom: '1px solid var(--crt-border-muted)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--crt-text-secondary)' }}>
                          {formatTimestamp(match.createdAt)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace', color: 'var(--crt-text)' }}>
                          {match.roomCode}
                        </td>
                        <td style={{ padding: '8px 12px', color: match.winnerName ? 'var(--crt-text)' : 'var(--crt-text-muted)' }}>
                          {match.winnerName || '[DRAW / TIE-GAME]'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--crt-text)' }}>
                          {match.winningScore} PTS
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>

          {/* Personal Stats Card */}
          {currentUserStats && (
            <div style={{
              background: 'var(--crt-bg-card)',
              border: '1px dashed var(--crt-border)',
              borderRadius: '4px',
              padding: '16px',
              marginTop: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{
                fontFamily: 'Press Start 2P, monospace',
                fontSize: '0.65rem',
                color: 'var(--crt-text-secondary)'
              }}>
                [ MY PLAYER PROFILE STATISTICS ]
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                fontSize: '1.25rem',
                color: 'var(--crt-text)'
              }}>
                <div>
                  PLAYER DISPLAY: <span style={{ textShadow: 'var(--crt-glow)' }}>{currentUserStats.displayName}</span>
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <span>WINS: {currentUserStats.totalWins}</span>
                  <span>PLAYED: {currentUserStats.gamesPlayed}</span>
                  <span>
                    WIN_RATE:{' '}
                    {currentUserStats.gamesPlayed > 0
                      ? `${((currentUserStats.totalWins / currentUserStats.gamesPlayed) * 100).toFixed(0)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Action Footer Buttons */}
      <hr style={{ border: '0', borderTop: '1px dashed var(--crt-border-muted)', margin: '4px 0' }} />

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={handleRefresh}
          className="btn-retro"
          style={{ flex: 1, borderColor: 'var(--crt-text-secondary)', color: 'var(--crt-text-secondary)' }}
          disabled={loading}
        >
          RE-POLL DATABANK
        </button>
        <button
          onClick={() => { playClick(); onClose(); }}
          className="btn-retro"
          style={{ flex: 1, borderColor: 'var(--crt-border)', color: 'var(--crt-border)' }}
        >
          RETURN TO LOBBY
        </button>
      </div>
    </div>
  );
}

export default LeaderboardView;
