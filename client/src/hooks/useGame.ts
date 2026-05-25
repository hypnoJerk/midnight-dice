import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room, RoomSyncPayload } from 'shared/types.js';

export function useGame() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [activeRoll, setActiveRoll] = useState<number[] | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Persistent User Identity Setup
  useEffect(() => {
    let uId = localStorage.getItem('midnight_user_uuid');
    if (!uId) {
      // Procedural fallback UUID generator for environments without crypto.randomUUID
      uId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : 'user-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('midnight_user_uuid', uId);
    }
    setUserId(uId);

    // Initialize real-time WebSocket connection
    const socketUrl = window.location.origin; // Proxied by Nginx
    const newSocket = io(socketUrl, {
      auth: {
        userId: uId,
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
        winners: payload.winners
      });
      
      localStorage.setItem('midnight_last_room_code', payload.roomCode);
    });

    newSocket.on('roll:result', (payload: { dice: number[] }) => {
      setActiveRoll(payload.dice);
    });

    newSocket.on('error', (errMsg: string) => {
      setError(errMsg);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
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
    socket.emit('turn:roll', { roomCode: room.code, userId });
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
    localStorage.removeItem('midnight_last_room_code');
  }, [socket, room, userId]);

  return {
    room,
    userId,
    error,
    activeRoll,
    clearActiveRoll: () => setActiveRoll(null),
    createRoom,
    joinRoom,
    startGame,
    rollDice,
    keepDice,
    leaveRoom,
    isConnected
  };
}
export default useGame;
