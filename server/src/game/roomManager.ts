import { Player, Room, GameState } from 'shared/types.js';
import { rollDice, calculateScore, calculateShootoutScore, resolveWinners } from './engine.js';

export class RoomManager {
  private rooms = new Map<string, Room>();
  private userToRoom = new Map<string, string>(); // Maps userId -> roomCode
  private socketToUser = new Map<string, string>(); // Maps socketId -> userId

  // Callback to run when the game is over and needs to be written to DB
  private onGameOverCallback?: (room: Room) => Promise<void>;

  constructor(onGameOver?: (room: Room) => Promise<void>) {
    this.onGameOverCallback = onGameOver;
  }

  /**
   * Generates a unique 4-character room code.
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  /**
   * Resolves a Room by code.
   */
  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  /**
   * Resolves a Room where a player currently resides.
   */
  public getRoomByUserId(userId: string): Room | undefined {
    const code = this.userToRoom.get(userId);
    if (!code) return undefined;
    return this.getRoom(code);
  }

  /**
   * Registers a socket ID connection mapped to a user UUID.
   */
  public registerSocket(socketId: string, userId: string) {
    this.socketToUser.set(socketId, userId);
  }

  /**
   * Removes a socket tracking registration on disconnect.
   * Returns the user ID and room code if the player was in a room.
   */
  public deregisterSocket(socketId: string): { userId?: string; roomCode?: string } {
    const userId = this.socketToUser.get(socketId);
    this.socketToUser.delete(socketId);
    if (!userId) return {};

    const roomCode = this.userToRoom.get(userId);
    // Find player in room and remove their active socket mapping
    if (roomCode) {
      const room = this.rooms.get(roomCode);
      if (room) {
        const player = room.players.find(p => p.id === userId);
        if (player) {
          player.socketId = undefined;
        }
      }
    }
    return { userId, roomCode };
  }

  /**
   * Creates a new game room instance.
   */
  public createRoom(userId: string, hostName: string): Room {
    // If user is already in a room, leave it
    this.leaveRoom(userId);

    const code = this.generateRoomCode();
    const host: Player = {
      id: userId,
      name: hostName,
      isHost: true,
      score: 0,
      isDQ: false,
      hasOne: false,
      hasFour: false,
      diceKept: [],
      diceActive: [],
      rollsCount: 0
    };

    const room: Room = {
      code,
      hostId: userId,
      gameState: 'LOBBY',
      players: [host],
      activePlayerIndex: -1,
      winners: []
    };

    this.rooms.set(code, room);
    this.userToRoom.set(userId, code);
    return room;
  }

  /**
   * Joins an existing room.
   */
  public joinRoom(userId: string, playerName: string, roomCode: string): Room {
    const cleanCode = roomCode.toUpperCase();
    const room = this.rooms.get(cleanCode);

    if (!room) {
      throw new Error('Room not found');
    }
    if (room.gameState !== 'LOBBY') {
      throw new Error('Game has already started in this room');
    }
    if (room.players.length >= 6) {
      throw new Error('Room is full (max 6 players)');
    }

    // Leave any existing room
    this.leaveRoom(userId);

    // If player was already in this room somehow (e.g. reconnecting), update name
    const existingPlayer = room.players.find(p => p.id === userId);
    if (existingPlayer) {
      existingPlayer.name = playerName;
    } else {
      const newPlayer: Player = {
        id: userId,
        name: playerName,
        isHost: false,
        score: 0,
        isDQ: false,
        hasOne: false,
        hasFour: false,
        diceKept: [],
        diceActive: [],
        rollsCount: 0
      };
      room.players.push(newPlayer);
    }

    this.userToRoom.set(userId, cleanCode);
    return room;
  }

  /**
   * Removes a player from a room.
   */
  public leaveRoom(userId: string): string | undefined {
    const code = this.userToRoom.get(userId);
    if (!code) return undefined;

    const room = this.rooms.get(code);
    if (room) {
      room.players = room.players.filter(p => p.id !== userId);
      this.userToRoom.delete(userId);

      // If room is now empty, delete it
      if (room.players.length === 0) {
        this.rooms.delete(code);
      } else if (room.hostId === userId) {
        // Elect a new host if host left
        const newHost = room.players[0];
        room.hostId = newHost.id;
        newHost.isHost = true;
      }
    }
    return code;
  }

  /**
   * Starts the game. Only callable by the room host.
   */
  public startGame(roomCode: string, userId: string): Room {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.hostId !== userId) throw new Error('Only the host can start the game');
    if (room.gameState !== 'LOBBY') throw new Error('Game has already started');
    if (room.players.length < 1) throw new Error('Need at least 1 player to start');

    // Reset player scores and dice states
    for (const player of room.players) {
      player.score = 0;
      player.isDQ = false;
      player.hasOne = false;
      player.hasFour = false;
      player.diceKept = [];
      player.diceActive = [];
      player.rollsCount = 0;
      player.shootoutScore = undefined;
    }

    room.gameState = 'PLAYING';
    room.activePlayerIndex = 0;
    room.winners = [];

    return room;
  }

  /**
   * Handles starting a dice roll for the active player.
   * Returns the count of dice they are authorized to roll.
   */
  public rollActivePlayer(roomCode: string, userId: string): number {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) throw new Error('Room not found');

    const activePlayer = room.players[room.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== userId) {
      throw new Error('It is not your turn to roll');
    }

    if (room.gameState === 'PLAYING') {
      // Standard roll rules
      if (activePlayer.diceActive.length > 0) {
        throw new Error('You must set aside/keep at least one die before rolling again');
      }
      
      const remainingDice = 6 - activePlayer.diceKept.length;
      if (remainingDice <= 0) {
        throw new Error('No dice remaining to roll this turn');
      }

      activePlayer.diceActive = [];
      activePlayer.rollsCount += 1;

      return remainingDice;
    } else if (room.gameState === 'SHOOTOUT') {
      // Shootout roll rules
      if (activePlayer.shootoutScore !== undefined) {
        throw new Error('You have already rolled in this shootout round');
      }

      activePlayer.rollsCount += 1;

      return 6;
    } else {
      throw new Error('Game is not in a rolling state');
    }
  }

  /**
   * Handles submitting the physical dice values rolled by the client.
   */
  public submitRollActivePlayer(roomCode: string, userId: string, diceValues: number[]): Room {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) throw new Error('Room not found');

    const activePlayer = room.players[room.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== userId) {
      throw new Error('It is not your turn');
    }

    if (room.gameState === 'PLAYING') {
      const expectedCount = 6 - activePlayer.diceKept.length;
      if (diceValues.length !== expectedCount) {
        throw new Error(`Invalid dice count submitted. Expected ${expectedCount}, got ${diceValues.length}`);
      }

      activePlayer.diceActive = diceValues;
      return room;
    } else if (room.gameState === 'SHOOTOUT') {
      if (diceValues.length !== 6) {
        throw new Error(`Invalid dice count submitted. Expected 6, got ${diceValues.length}`);
      }

      activePlayer.shootoutScore = calculateShootoutScore(diceValues);

      // Defer shootout turn advancement to show transition screen
      room.turnTransition = {
        playerName: activePlayer.name,
        score: activePlayer.shootoutScore,
        isDQ: false,
        isShootout: true
      };

      return room;
    } else {
      throw new Error('Game is not in a rolling state');
    }
  }

  /**
   * Handles locking/keeping specific dice indices for the active player.
   */
  public keepActivePlayer(roomCode: string, userId: string, diceIndexes: number[]): Room {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.gameState !== 'PLAYING') throw new Error('Not in standard playing phase');

    const activePlayer = room.players[room.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== userId) {
      throw new Error('It is not your turn to keep dice');
    }

    if (diceIndexes.length === 0) {
      throw new Error('Mandatory action: You must keep at least one die');
    }

    // Validate index constraints
    const uniqueIndexes = Array.from(new Set(diceIndexes));
    if (uniqueIndexes.length !== diceIndexes.length) {
      throw new Error('Duplicate indices selected');
    }

    for (const index of diceIndexes) {
      if (index < 0 || index >= activePlayer.diceActive.length) {
        throw new Error('Invalid die index selected');
      }
    }

    // Transfer selected dice to keep zone
    const keptValues = diceIndexes.map(idx => activePlayer.diceActive[idx]);
    activePlayer.diceKept.push(...keptValues);

    // Calculate temporary qualification status
    const scoringResult = calculateScore(activePlayer.diceKept);
    activePlayer.hasOne = scoringResult.hasOne;
    activePlayer.hasFour = scoringResult.hasFour;

    // Clear active roll array
    activePlayer.diceActive = [];

    // Check if the player's turn is complete (all 6 dice set aside)
    if (activePlayer.diceKept.length === 6) {
      activePlayer.score = scoringResult.score;
      activePlayer.isDQ = scoringResult.isDQ;

      // Defer turn advancement to show transition screen
      room.turnTransition = {
        playerName: activePlayer.name,
        score: activePlayer.score,
        isDQ: activePlayer.isDQ
      };
    }

    return room;
  }

  /**
   * Completes the turn transition, advances the turn, and clears the transition state.
   */
  public completeTurnTransition(roomCode: string): Room | undefined {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return undefined;
    
    // Only advance if a transition is actually active
    if (room.turnTransition) {
      const isShootout = room.turnTransition.isShootout;
      room.turnTransition = null;
      if (isShootout) {
        this.advanceShootoutTurn(room);
      } else {
        this.advanceStandardTurn(room);
      }
    }
    return room;
  }

  /**
   * Advances the turn in standard play.
   */
  private advanceStandardTurn(room: Room) {
    room.activePlayerIndex += 1;

    // Check if all players have completed their turn
    if (room.activePlayerIndex >= room.players.length) {
      const evaluation = resolveWinners(room.players, false);

      if (evaluation.requiresShootout) {
        // Enter Shootout mode!
        room.gameState = 'SHOOTOUT';
        
        // Find players who qualified for the shootout (the tied leaders)
        const shootoutIds = new Set(evaluation.winnerIds);
        
        // Reset shootout scores for the tied players
        for (const player of room.players) {
          if (shootoutIds.has(player.id)) {
            player.shootoutScore = undefined;
          } else {
            // Non-tied players are excluded from shootout
            player.shootoutScore = -1; 
          }
        }

        // Set active index to the first shootout participant
        room.activePlayerIndex = room.players.findIndex(p => shootoutIds.has(p.id));
      } else {
        // Complete game over
        room.gameState = 'GAME_OVER';
        room.activePlayerIndex = -1;
        room.winners = evaluation.winnerIds;

        // Trigger DB persist hook
        if (this.onGameOverCallback) {
          this.onGameOverCallback(room).catch(console.error);
        }
      }
    }
  }

  /**
   * Advances the turn in shootout play.
   */
  private advanceShootoutTurn(room: Room) {
    // Find next shootout player who hasn't rolled yet
    let nextIndex = room.activePlayerIndex + 1;
    let foundNext = false;

    while (nextIndex < room.players.length) {
      const p = room.players[nextIndex];
      // A shootout score of undefined means they are in the shootout and haven't rolled yet
      if (p.shootoutScore === undefined) {
        room.activePlayerIndex = nextIndex;
        foundNext = true;
        break;
      }
      nextIndex++;
    }

    if (!foundNext) {
      // All active shootout players have rolled! Evaluate results.
      const shootoutPlayers = room.players.filter(p => p.shootoutScore !== undefined && p.shootoutScore >= 0);
      const evaluation = resolveWinners(shootoutPlayers, true);

      if (evaluation.requiresShootout) {
        // Still tied! Reset shootout scores for the newly tied leaders and run shootout again
        const tiedIds = new Set(evaluation.winnerIds);
        for (const player of room.players) {
          if (tiedIds.has(player.id)) {
            player.shootoutScore = undefined;
          } else {
            player.shootoutScore = -1; // Eliminated
          }
        }

        room.activePlayerIndex = room.players.findIndex(p => tiedIds.has(p.id));
      } else {
        // Shootout tie is broken! Game Over.
        room.gameState = 'GAME_OVER';
        room.activePlayerIndex = -1;
        room.winners = evaluation.winnerIds;

        // Trigger DB persist hook
        if (this.onGameOverCallback) {
          this.onGameOverCallback(room).catch(console.error);
        }
      }
    }
  }
}
