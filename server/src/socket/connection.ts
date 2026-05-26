import { Server, Socket } from 'socket.io';
import { RoomManager } from '../game/roomManager.js';
import { Room } from 'shared/types.js';

/**
 * Builds the standard sync state payload to broadcast.
 */
export function buildSyncPayload(room: Room) {
  return {
    roomCode: room.code,
    players: room.players,
    gameState: room.gameState,
    activePlayerId: (room.activePlayerIndex >= 0 && room.activePlayerIndex < room.players.length)
      ? room.players[room.activePlayerIndex].id
      : null,
    winners: room.winners,
    currentRound: room.currentRound || 1,
    turnTransition: room.turnTransition || null,
    roundTransition: room.roundTransition || null
  };
}

export function initializeSockets(io: Server, roomManager: RoomManager) {
  io.on('connection', (socket: Socket) => {
    // Reconnection handshake: allows a reconnecting user to bind their new socket
    const { userId, roomCode } = socket.handshake.auth as { userId?: string; roomCode?: string };
    
    if (userId) {
      roomManager.registerSocket(socket.id, userId);
      
      // If reconnecting to an active room
      if (roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (room) {
          const player = room.players.find(p => p.id === userId);
          if (player) {
            player.socketId = socket.id;
            socket.join(roomCode.toUpperCase());
            io.to(roomCode.toUpperCase()).emit('room:sync', buildSyncPayload(room));
          }
        }
      }
    }

    // 1. Create Room
    socket.on('room:create', ({ userId, hostName }: { userId: string; hostName: string }) => {
      try {
        if (!userId || !hostName) {
          return socket.emit('error', 'Missing userId or hostName');
        }

        const room = roomManager.createRoom(userId, hostName);
        const player = room.players.find(p => p.id === userId);
        if (player) {
          player.socketId = socket.id;
        }

        roomManager.registerSocket(socket.id, userId);
        socket.join(room.code);

        socket.emit('room:sync', buildSyncPayload(room));
      } catch (err: any) {
        socket.emit('error', err.message || 'Failed to create room');
      }
    });

    // 2. Join Room
    socket.on('room:join', ({ userId, roomCode, playerName }: { userId: string; roomCode: string; playerName: string }) => {
      try {
        if (!userId || !roomCode || !playerName) {
          return socket.emit('error', 'Missing fields to join room');
        }

        const cleanCode = roomCode.toUpperCase();
        const room = roomManager.joinRoom(userId, playerName, cleanCode);
        const player = room.players.find(p => p.id === userId);
        if (player) {
          player.socketId = socket.id;
        }

        roomManager.registerSocket(socket.id, userId);
        socket.join(cleanCode);

        // Sync room state for everyone
        io.to(cleanCode).emit('room:sync', buildSyncPayload(room));
      } catch (err: any) {
        socket.emit('error', err.message || 'Failed to join room');
      }
    });

    // 3. Start Game
    socket.on('game:start', () => {
      try {
        const userId = socket.handshake.auth.userId || Array.from(io.sockets.sockets.values())
          .find(s => s.id === socket.id)?.handshake.auth.userId;
          
        const room = roomManager.getRoomByUserId(roomManager.deregisterSocket(socket.id).userId || '');
        if (!room) {
          // Re-register socket mappings
          const uId = Array.from(roomManager['socketToUser'].entries()).find(([_, v]) => v)?.find(([k]) => k === socket.id)?.[1];
          if (uId) roomManager.registerSocket(socket.id, uId);
          return socket.emit('error', 'Room not found');
        }
        
        // Find actual user mapping
        const uId = room.players.find(p => p.socketId === socket.id)?.id;
        if (!uId) return socket.emit('error', 'Player not found');

        const updatedRoom = roomManager.startGame(room.code, uId);
        io.to(room.code).emit('room:sync', buildSyncPayload(updatedRoom));
      } catch (err: any) {
        socket.emit('error', err.message || 'Failed to start game');
      }
    });

    // Custom Start helper mapping directly via roomCode and userId payloads for clean client hookup
    socket.on('room:start', ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      try {
        const room = roomManager.startGame(roomCode, userId);
        io.to(roomCode.toUpperCase()).emit('room:sync', buildSyncPayload(room));
      } catch (err: any) {
        socket.emit('error', err.message || 'Failed to start game');
      }
    });

    // 4. Turn Roll (Starts the physical roll)
    socket.on('turn:roll', ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      try {
        const diceCount = roomManager.rollActivePlayer(roomCode, userId);
        const room = roomManager.getRoom(roomCode);
        
        if (room) {
          // Tell the active player's client to start the physical roll of `diceCount` dice
          socket.emit('roll:start', { diceCount });
          // Broadcast updated room state (rolls count updated, active dice cleared) to all
          io.to(roomCode.toUpperCase()).emit('room:sync', buildSyncPayload(room));
        }
      } catch (err: any) {
        socket.emit('error', err.message || 'Failed to roll dice');
      }
    });

    // 4b. Turn Roll Settled (Submits physical results after physics settles)
    socket.on('turn:roll:settled', ({ roomCode, userId, dice }: { roomCode: string; userId: string; dice: number[] }) => {
      try {
        const room = roomManager.submitRollActivePlayer(roomCode, userId, dice);
        
        // Send confirmed rolled dice faces directly to active player
        socket.emit('roll:result', { dice });
        // Broadcast updated room state (with diceActive populated) to all
        io.to(roomCode.toUpperCase()).emit('room:sync', buildSyncPayload(room));

        if (room.turnTransition) {
          setTimeout(() => {
            try {
              const updatedRoom = roomManager.completeTurnTransition(roomCode);
              if (updatedRoom) {
                io.to(roomCode.toUpperCase()).emit('room:sync', buildSyncPayload(updatedRoom));

                if (updatedRoom.roundTransition) {
                  setTimeout(() => {
                    try {
                      const finalRoom = roomManager.completeRoundTransition(roomCode);
                      if (finalRoom) {
                        io.to(roomCode.toUpperCase()).emit('room:sync', buildSyncPayload(finalRoom));
                      }
                    } catch (e) {
                      console.error('Error completing round transition:', e);
                    }
                  }, 5000);
                }
              }
            } catch (e) {
              console.error('Error advancing transition:', e);
            }
          }, 3000);
        }
      } catch (err: any) {
        socket.emit('error', err.message || 'Failed to submit roll results');
      }
    });

    // 5. Turn Keep
    socket.on('turn:keep', ({ roomCode, userId, diceIndexes }: { roomCode: string; userId: string; diceIndexes: number[] }) => {
      try {
        const room = roomManager.keepActivePlayer(roomCode, userId, diceIndexes);
        io.to(roomCode.toUpperCase()).emit('room:sync', buildSyncPayload(room));

        if (room.turnTransition) {
          setTimeout(() => {
            try {
              const updatedRoom = roomManager.completeTurnTransition(roomCode);
              if (updatedRoom) {
                io.to(roomCode.toUpperCase()).emit('room:sync', buildSyncPayload(updatedRoom));

                if (updatedRoom.roundTransition) {
                  setTimeout(() => {
                    try {
                      const finalRoom = roomManager.completeRoundTransition(roomCode);
                      if (finalRoom) {
                        io.to(roomCode.toUpperCase()).emit('room:sync', buildSyncPayload(finalRoom));
                      }
                    } catch (e) {
                      console.error('Error completing round transition:', e);
                    }
                  }, 5000);
                }
              }
            } catch (e) {
              console.error('Error advancing transition:', e);
            }
          }, 3000);
        }
      } catch (err: any) {
        socket.emit('error', err.message || 'Failed to keep dice');
      }
    });

    // 6. Handle Disconnection
    socket.on('disconnect', () => {
      const { userId, roomCode } = roomManager.deregisterSocket(socket.id);
      
      if (userId && roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (room) {
          // Send updated synchronization state to demonstrate disconnected status
          io.to(roomCode).emit('room:sync', buildSyncPayload(room));
        }
      }
    });
  });
}
