import { describe, it, expect } from 'vitest';
import { calculateScore, calculateShootoutScore, resolveWinners } from '../src/game/engine.js';
import { Player } from 'shared/types.js';

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
});
