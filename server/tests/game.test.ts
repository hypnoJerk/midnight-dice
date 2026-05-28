import { describe, it, expect } from 'vitest';
import { calculateScore, calculateShootoutScore, resolveWinners } from '../src/game/engine.js';
import { Player } from 'shared/types.js';
import { RoomManager } from '../src/game/roomManager.js';

describe('Game Engine Scoring & Qualification Rules', () => {
  describe('calculateScore', () => {
    it('should assert score 24 when qualified with four sixes', () => {
      const result = calculateScore([1, 4, 6, 6, 6, 6]);
      expect(result.isDQ).toBe(false);
      expect(result.score).toBe(24);
      expect(result.hasOne).toBe(true);
      expect(result.hasFour).toBe(true);
    });

    it('should assert disqualification when missing a 1', () => {
      const result = calculateScore([2, 4, 6, 6, 6, 6]);
      expect(result.isDQ).toBe(true);
      expect(result.score).toBe(0);
      expect(result.hasOne).toBe(false);
      expect(result.hasFour).toBe(true);
    });

    it('should assert disqualification when missing a 4', () => {
      const result = calculateScore([1, 3, 5, 5, 5, 5]);
      expect(result.isDQ).toBe(true);
      expect(result.score).toBe(0);
      expect(result.hasOne).toBe(true);
      expect(result.hasFour).toBe(false);
    });

    it('should eliminate exactly one 1 and one 4 when multiple are kept', () => {
      const result = calculateScore([1, 4, 1, 4, 5, 6]);
      expect(result.isDQ).toBe(false);
      // Remaining dice should be 1, 4, 5, 6 -> sum = 16
      expect(result.score).toBe(16);
      expect(result.hasOne).toBe(true);
      expect(result.hasFour).toBe(true);
    });

    it('should return intermediate state when under 6 dice', () => {
      const result = calculateScore([1, 4, 6]);
      expect(result.isDQ).toBe(false);
      expect(result.score).toBe(0);
      expect(result.hasOne).toBe(true);
      expect(result.hasFour).toBe(true);
    });
  });

  describe('calculateShootoutScore', () => {
    it('should sum all six dice directly with no qualification requirement', () => {
      const score = calculateShootoutScore([1, 2, 3, 4, 5, 6]);
      expect(score).toBe(21);
    });

    it('should sum six sixes to 36', () => {
      const score = calculateShootoutScore([6, 6, 6, 6, 6, 6]);
      expect(score).toBe(36);
    });

    it('should throw an error if not given exactly 6 dice', () => {
      expect(() => calculateShootoutScore([1, 2, 3, 4, 5])).toThrow();
    });
  });

  describe('resolveWinners', () => {
    // Helper to mock minimal player object
    const createMockPlayer = (id: string, fields: Partial<Player>): Player => ({
      id,
      name: `Player ${id}`,
      isHost: false,
      score: 0,
      isDQ: false,
      hasOne: false,
      hasFour: false,
      diceKept: [],
      diceActive: [],
      rollsCount: 0,
      roundWins: 0,
      ...fields
    });

    it('should resolve a single clear winner in standard round', () => {
      const p1 = createMockPlayer('1', { score: 20, isDQ: false });
      const p2 = createMockPlayer('2', { score: 24, isDQ: false });
      const p3 = createMockPlayer('3', { score: 0, isDQ: true });

      const result = resolveWinners([p1, p2, p3], false);
      expect(result.winnerIds).toEqual(['2']);
      expect(result.requiresShootout).toBe(false);
    });

    it('should trigger a shootout if there is a score tie', () => {
      const p1 = createMockPlayer('1', { score: 22, isDQ: false });
      const p2 = createMockPlayer('2', { score: 22, isDQ: false });
      const p3 = createMockPlayer('3', { score: 18, isDQ: false });

      const result = resolveWinners([p1, p2, p3], false);
      expect(result.winnerIds).toEqual(['1', '2']);
      expect(result.requiresShootout).toBe(true);
    });

    it('should trigger a shootout if all players are disqualified', () => {
      const p1 = createMockPlayer('1', { score: 0, isDQ: true });
      const p2 = createMockPlayer('2', { score: 0, isDQ: true });

      const result = resolveWinners([p1, p2], false);
      expect(result.winnerIds).toEqual(['1', '2']);
      expect(result.requiresShootout).toBe(true);
    });

    it('should resolve the shootout winner using shootout scores', () => {
      const p1 = createMockPlayer('1', { shootoutScore: 28 });
      const p2 = createMockPlayer('2', { shootoutScore: 25 });
      const p3 = createMockPlayer('3', { shootoutScore: 30 });

      const result = resolveWinners([p1, p2, p3], true);
      expect(result.winnerIds).toEqual(['3']);
      expect(result.requiresShootout).toBe(false);
    });

    it('should trigger another shootout if there is a shootout tie', () => {
      const p1 = createMockPlayer('1', { shootoutScore: 27 });
      const p2 = createMockPlayer('2', { shootoutScore: 27 });

      const result = resolveWinners([p1, p2], true);
      expect(result.winnerIds).toEqual(['1', '2']);
      expect(result.requiresShootout).toBe(true);
    });
  });

  describe('RoomManager Best of 3 Rounds Progression', () => {
    it('should correctly transition through multiple rounds and declare match winner on 2 wins', () => {
      const manager = new RoomManager();

      // Host creates a room
      const room = manager.createRoom('user-host', 'Alice');
      expect(room.currentRound).toBe(1);
      expect(room.players[0].roundWins).toBe(0);

      // Start the match
      manager.startGame(room.code, 'user-host');
      expect(room.gameState).toBe('PLAYING');

      // Simulate turn completion for Alice
      room.players[0].score = 20;
      room.players[0].diceKept = [1, 4, 6, 3, 3, 3];
      room.players[0].isDQ = false;

      room.turnTransition = {
        playerName: 'Alice',
        score: 20,
        isDQ: false
      };

      // Complete transition -> should trigger round transition since it's 1-player and she won!
      manager.completeTurnTransition(room.code);
      expect(room.players[0].roundWins).toBe(1);
      expect(room.gameState).toBe('PLAYING'); // Still playing overall match
      expect(room.roundTransition).toBeDefined();
      expect(room.roundTransition?.roundNumber).toBe(1);

      // Now complete the round transition to round 2
      manager.completeRoundTransition(room.code);
      expect(room.currentRound).toBe(2);
      expect(room.roundTransition).toBeNull();
      expect(room.players[0].score).toBe(0); // Reset for new round
      expect(room.players[0].roundWins).toBe(1); // Keeps round-win count!

      // Simulate Alice winning round 2
      room.players[0].score = 24;
      room.players[0].diceKept = [1, 4, 6, 6, 6, 6];
      room.players[0].isDQ = false;
      room.turnTransition = {
        playerName: 'Alice',
        score: 24,
        isDQ: false
      };

      // Complete transition -> should trigger GAME_OVER since Alice reaches 2 round-wins!
      manager.completeTurnTransition(room.code);
      expect(room.players[0].roundWins).toBe(2);
      expect(room.gameState).toBe('GAME_OVER');
      expect(room.winners).toEqual(['user-host']);
    });

    it('should rotate player turn order so that the winner of the previous round goes first', () => {
      const manager = new RoomManager();

      // Host Alice creates room, Bob joins, Charlie joins
      const room = manager.createRoom('user-alice', 'Alice');
      manager.joinRoom('user-bob', 'Bob', room.code);
      manager.joinRoom('user-charlie', 'Charlie', room.code);

      expect(room.players.map(p => p.id)).toEqual(['user-alice', 'user-bob', 'user-charlie']);

      // Start the match
      manager.startGame(room.code, 'user-alice');

      // Let's make Bob (index 1) win round 1.
      // Alice plays first and gets a score
      room.players[0].score = 15;
      room.players[0].diceKept = [1, 4, 3, 3, 3, 6];
      room.players[0].isDQ = false;
      room.turnTransition = { playerName: 'Alice', score: 15, isDQ: false };
      manager.completeTurnTransition(room.code);

      // Bob plays next and gets a higher score
      room.players[1].score = 22;
      room.players[1].diceKept = [1, 4, 5, 5, 6, 6];
      room.players[1].isDQ = false;
      room.turnTransition = { playerName: 'Bob', score: 22, isDQ: false };
      manager.completeTurnTransition(room.code);

      // Charlie plays last and gets a lower score
      room.players[2].score = 18;
      room.players[2].diceKept = [1, 4, 4, 4, 5, 5];
      room.players[2].isDQ = false;
      room.turnTransition = { playerName: 'Charlie', score: 18, isDQ: false };
      
      // Completing the last turn transition should resolve Bob as winner and set roundTransition
      manager.completeTurnTransition(room.code);

      expect(room.players.find(p => p.id === 'user-bob')?.roundWins).toBe(1);
      expect(room.roundTransition).toBeDefined();
      expect(room.roundTransition?.winnerName).toBe('Bob');
      expect(room.roundTransition?.winnerId).toBe('user-bob');

      // Now complete the round transition to round 2
      manager.completeRoundTransition(room.code);

      // Verify that Bob is now index 0, followed by Charlie, and Alice wraps around to the end
      expect(room.players.map(p => p.id)).toEqual(['user-bob', 'user-charlie', 'user-alice']);
      expect(room.activePlayerIndex).toBe(0);
      expect(room.players[0].score).toBe(0); // Score reset
    });
  });

  describe('RoomManager Stacked Dice & Reroll Rules', () => {
    it('should correctly increment stacked roll counts and reset them on valid rolls', () => {
      const manager = new RoomManager();
      const room = manager.createRoom('user-alice', 'Alice');
      manager.startGame(room.code, 'user-alice');

      // 1. Roll a stacked roll
      manager.submitRollActivePlayer(room.code, 'user-alice', [1, 2, 3, 4, 5, 6], true);
      expect(room.players[0].stackedRerollsCount).toBe(1);
      expect(room.players[0].isCurrentRollStacked).toBe(true);

      // 2. Roll another stacked roll
      manager.submitRollActivePlayer(room.code, 'user-alice', [1, 2, 3, 4, 5, 6], true);
      expect(room.players[0].stackedRerollsCount).toBe(2);
      expect(room.players[0].isCurrentRollStacked).toBe(true);

      // 3. Roll a valid roll -> should reset count
      manager.submitRollActivePlayer(room.code, 'user-alice', [1, 2, 3, 4, 5, 6], false);
      expect(room.players[0].stackedRerollsCount).toBe(0);
      expect(room.players[0].isCurrentRollStacked).toBe(false);
    });

    it('should disqualify the player if they roll stacked dice 3 times in a row', () => {
      const manager = new RoomManager();
      const room = manager.createRoom('user-alice', 'Alice');
      manager.startGame(room.code, 'user-alice');

      // Roll 3 stacked dice rolls in a row
      manager.submitRollActivePlayer(room.code, 'user-alice', [1, 2, 3, 4, 5, 6], true);
      manager.submitRollActivePlayer(room.code, 'user-alice', [1, 2, 3, 4, 5, 6], true);
      manager.submitRollActivePlayer(room.code, 'user-alice', [1, 2, 3, 4, 5, 6], true);

      expect(room.players[0].stackedRerollsCount).toBe(3);
      expect(room.players[0].isDQ).toBe(true);
      expect(room.players[0].score).toBe(0);
      expect(room.players[0].diceActive).toEqual([]);
      expect(room.turnTransition).toBeDefined();
      expect(room.turnTransition?.isDQ).toBe(true);
    });

    it('should reset isCurrentRollStacked once dice are kept', () => {
      const manager = new RoomManager();
      const room = manager.createRoom('user-alice', 'Alice');
      manager.startGame(room.code, 'user-alice');

      // 1. Submit a valid roll (isCurrentRollStacked will be false, but active dice will be populated)
      manager.submitRollActivePlayer(room.code, 'user-alice', [1, 2, 3, 4, 5, 6], false);
      expect(room.players[0].isCurrentRollStacked).toBe(false);

      // 2. Keep some dice
      manager.keepActivePlayer(room.code, 'user-alice', [0, 1]); // keep first two dice
      expect(room.players[0].isCurrentRollStacked).toBe(false);
    });
  });
});
