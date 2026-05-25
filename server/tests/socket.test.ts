import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeSockets } from '../src/socket/connection.js';
import { RoomManager } from '../src/game/roomManager.js';
import { Server, Socket } from 'socket.io';

describe('Socket Coordinator Integration & Authoritative Move Validation', () => {
  let mockIo: Server;
  let roomManager: RoomManager;
  let registeredEvents: Map<string, Function>;
  let mockSocket: any;

  beforeEach(() => {
    registeredEvents = new Map();

    // Mock Socket.io Server instance
    mockIo = {
      on: vi.fn(),
      to: vi.fn().mockReturnValue({
        emit: vi.fn()
      })
    } as any;

    // Mock individual Socket connection
    mockSocket = {
      id: 'socket-A',
      handshake: { auth: { userId: 'user-A' } },
      emit: vi.fn(),
      join: vi.fn(),
      on: vi.fn((event, callback) => {
        registeredEvents.set(event, callback);
      })
    };

    roomManager = new RoomManager();

    // Bind event hooks
    initializeSockets(mockIo, roomManager);

    // Simulate connection listener call
    const connectionCallback = (mockIo.on as any).mock.calls[0][1];
    connectionCallback(mockSocket);
  });

  it('should successfully handle room:create socket event', () => {
    const createCallback = registeredEvents.get('room:create');
    expect(createCallback).toBeDefined();

    createCallback!({ userId: 'user-A', hostName: 'Alice' });

    // Assert room created in RoomManager
    const room = roomManager.getRoomByUserId('user-A');
    expect(room).toBeDefined();
    expect(room?.hostId).toBe('user-A');
    expect(room?.players[0].name).toBe('Alice');

    // Assert socket joined the room code channel
    expect(mockSocket.join).toHaveBeenCalledWith(room?.code);
    
    // Assert socket emitted sync payload back
    expect(mockSocket.emit).toHaveBeenCalledWith('room:sync', expect.objectContaining({
      roomCode: room?.code,
      gameState: 'LOBBY'
    }));
  });

  it('should reject roll requests from non-active players', () => {
    const createCallback = registeredEvents.get('room:create');
    createCallback!({ userId: 'user-A', hostName: 'Alice' });
    const room = roomManager.getRoomByUserId('user-A')!;

    // Join player B
    roomManager.joinRoom('user-B', 'Bob', room.code);

    // Start game
    roomManager.startGame(room.code, 'user-A');

    const rollCallback = registeredEvents.get('turn:roll');
    expect(rollCallback).toBeDefined();

    // Active player is Alice (index 0). Bob attempts to roll -> should emit error
    rollCallback!({ roomCode: room.code, userId: 'user-B' });

    expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.stringContaining('It is not your turn'));
  });

  it('should successfully process active player roll and keep selection sequence', () => {
    const createCallback = registeredEvents.get('room:create');
    createCallback!({ userId: 'user-A', hostName: 'Alice' });
    const room = roomManager.getRoomByUserId('user-A')!;

    roomManager.startGame(room.code, 'user-A');

    const rollCallback = registeredEvents.get('turn:roll');
    const settledCallback = registeredEvents.get('turn:roll:settled');
    const keepCallback = registeredEvents.get('turn:keep');

    // Alice rolls dice (starts physical roll)
    rollCallback!({ roomCode: room.code, userId: 'user-A' });

    const player = room.players[0];
    expect(player.diceActive.length).toBe(0); // active dice cleared when starting a roll
    expect(player.rollsCount).toBe(1);

    // Simulate dice settling from client physical throw
    settledCallback!({ roomCode: room.code, userId: 'user-A', dice: [1, 2, 3, 4, 5, 6] });
    expect(player.diceActive.length).toBe(6);

    // Alice keeps dice indices [0, 1] (e.g. keeping 2 dice)
    keepCallback!({ roomCode: room.code, userId: 'user-A', diceIndexes: [0, 1] });

    expect(player.diceActive.length).toBe(0);
    expect(player.diceKept.length).toBe(2);

    // Alice rolls remaining 4 dice (starts physical roll)
    rollCallback!({ roomCode: room.code, userId: 'user-A' });
    expect(player.diceActive.length).toBe(0); // active dice cleared when starting a roll
    expect(player.rollsCount).toBe(2);

    // Simulate dice settling for the remaining 4 dice
    settledCallback!({ roomCode: room.code, userId: 'user-A', dice: [2, 3, 4, 5] });
    expect(player.diceActive.length).toBe(4);
  });
});
