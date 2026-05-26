import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room, RoomSyncPayload } from 'shared/types.js';

export function useGame() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [userId, setUserId] = useState<string>(
    localStorage.getItem('midnight_user_uuid') || ''
  );
  const [error, setError] = useState<string | null>(null);
  const [activeRoll, setActiveRoll] = useState<number[] | null>(null);
  const [diceToRoll, setDiceToRoll] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rollId, setRollId] = useState(0);

  // Initialize/re-initialize real-time WebSocket connection only when logged in
  useEffect(() => {
    if (!userId) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const socketUrl = window.location.origin; // Proxied by Nginx
    const newSocket = io(socketUrl, {
      auth: {
        userId: userId,
        roomCode: localStorage.getItem('midnight_last_room_code') || undefined
      }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('room:sync', (payload: RoomSyncPayload) => {
      const activePlayer = payload.players.find(p => p.id === payload.activePlayerId);
      const host = payload.players.find(p => p.isHost);
      
      setRoom({
        code: payload.roomCode,
        hostId: host?.id || '',
        gameState: payload.gameState,
        players: payload.players,
        activePlayerIndex: payload.players.findIndex(p => p.id === payload.activePlayerId),
        winners: payload.winners,
        currentRound: payload.currentRound,
        turnTransition: payload.turnTransition,
        roundTransition: payload.roundTransition,
        rematch: payload.rematch || null
      });

      // Synchronize activeRoll local state with the server's authoritative state
      if (payload.activePlayerId === userId) {
        if (activePlayer && activePlayer.diceActive && activePlayer.diceActive.length > 0) {
          setActiveRoll(activePlayer.diceActive);
        } else {
          setActiveRoll(null);
        }
      } else {
        setActiveRoll(null);
      }
      
      localStorage.setItem('midnight_last_room_code', payload.roomCode);
    });

    newSocket.on('room:kicked', (payload: { reason: string }) => {
      setRoom(null);
      setError('You were left out of the rematch match.');
      localStorage.removeItem('midnight_last_room_code');
    });

    newSocket.on('roll:start', (payload: { diceCount: number }) => {
      setDiceToRoll(payload.diceCount);
      setActiveRoll(null);
      setRollId(prev => prev + 1);
    });

    newSocket.on('roll:result', (payload: { dice: number[] }) => {
      setActiveRoll(payload.dice);
      setDiceToRoll(null);
    });

    newSocket.on('error', (errMsg: string) => {
      setError(errMsg);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

  const loginUser = useCallback((id: string, name: string) => {
    localStorage.setItem('midnight_user_uuid', id);
    localStorage.setItem('midnight_display_name', name);
    setUserId(id);
    setError(null);
  }, []);

  const logoutUser = useCallback(() => {
    localStorage.removeItem('midnight_user_uuid');
    localStorage.removeItem('midnight_display_name');
    localStorage.removeItem('midnight_last_room_code');
    setUserId('');
    setRoom(null);
    setDiceToRoll(null);
    setActiveRoll(null);
    setError(null);
  }, []);

  const createRoom = useCallback((hostName: string) => {
    if (!socket || !userId) return;
    setError(null);
    socket.emit('room:create', { userId, hostName });
  }, [socket, userId]);

  const joinRoom = useCallback((playerName: string, roomCode: string) => {
    if (!socket || !userId) return;
    setError(null);
    socket.emit('room:join', { userId, roomCode, playerName });
  }, [socket, userId]);

  const startGame = useCallback(() => {
    if (!socket || !room) return;
    setError(null);
    socket.emit('room:start', { roomCode: room.code, userId });
  }, [socket, room, userId]);

  const rollDice = useCallback(() => {
    if (!socket || !room || !userId) return;
    setError(null);
    setActiveRoll(null);
    setDiceToRoll(null); // Clear previous physical roll count
    socket.emit('turn:roll', { roomCode: room.code, userId });
  }, [socket, room, userId]);

  const submitRollResults = useCallback((dice: number[]) => {
    if (!socket || !room || !userId) return;
    setError(null);
    socket.emit('turn:roll:settled', { roomCode: room.code, userId, dice });
  }, [socket, room, userId]);

  const keepDice = useCallback((diceIndexes: number[]) => {
    if (!socket || !room || !userId) return;
    setError(null);
    socket.emit('turn:keep', { roomCode: room.code, userId, diceIndexes });
  }, [socket, room, userId]);

  const leaveRoom = useCallback(() => {
    if (!socket || !room || !userId) return;
    setError(null);
    socket.emit('room:leave', { roomCode: room.code, userId });
    setRoom(null);
    setDiceToRoll(null);
    localStorage.removeItem('midnight_last_room_code');
  }, [socket, room, userId]);

  const initiateRematch = useCallback(() => {
    if (!socket || !room || !userId) return;
    setError(null);
    socket.emit('room:rematch:initiate', { roomCode: room.code, userId });
  }, [socket, room, userId]);

  return {
    room,
    userId,
    error,
    activeRoll,
    diceToRoll,
    rollId,
    clearActiveRoll: () => setActiveRoll(null),
    clearDiceToRoll: () => setDiceToRoll(null),
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
  };
}
export default useGame;
