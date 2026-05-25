export type GameState = 'LOBBY' | 'PLAYING' | 'SHOOTOUT' | 'GAME_OVER';

export interface Player {
  id: string;                // The persistent User UUID (cached in client localStorage)
  name: string;              // Player's display name
  socketId?: string;         // Transient Socket ID (used for connection tracking)
  isHost: boolean;
  
  // Game state fields
  score: number;             // Total of the remaining 4 dice (max 24)
  isDQ: boolean;             // Disqualified/Bust if 1 and 4 not kept by end of turn
  hasOne: boolean;           // Has locked a 1
  hasFour: boolean;          // Has locked a 4
  diceKept: number[];        // The array of kept dice (max 6)
  diceActive: number[];      // The array of dice from the current roll (unsaved)
  rollsCount: number;        // Number of rolls taken in the current turn
  shootoutScore?: number;    // Score during a tie-breaker (sum of all 6 dice)
}

export interface Room {
  code: string;              // 4-character alphanumeric code
  hostId: string;
  gameState: GameState;
  players: Player[];
  activePlayerIndex: number; // Index of the player currently rolling
  winners: string[];         // ID(s) of winner(s) at the end of the round or shootout
}

// WebSocket Event Payloads
export interface RoomCreatePayload {
  userId: string;            // Persistent User UUID
  hostName: string;          // Player's display name
}

export interface RoomJoinPayload {
  userId: string;            // Persistent User UUID
  roomCode: string;          // 4-character alphanumeric code
  playerName: string;        // Player's display name
}

export interface RoomSyncPayload {
  roomCode: string;
  players: Player[];
  gameState: GameState;
  activePlayerId: string | null;
  winners: string[];
}

export interface GameStartPayload {
  activePlayerId: string;
}

export interface TurnRollPayload {
  diceToRoll: number;
}

export interface RollResultPayload {
  dice: number[];            // The randomized dice face values
  isBustPossible?: boolean;
}

export interface TurnKeepPayload {
  diceIndexes: number[];     // Indices from the diceActive array to lock
}

export interface TurnEndPayload {
  playerId: string;
  finalScore: number;
  isDQ: boolean;
  shootoutScore?: number;
}

export * from './engine.js';
