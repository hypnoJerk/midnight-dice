import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordMatch } from '../src/db/queries.js';
import { db } from '../src/db/index.js';

// Setup Drizzle mock structure
vi.mock('../src/db/index.js', () => {
  const mockTx = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => Promise.resolve([{ id: 'mocked-match-uuid' }])),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => Promise.resolve([])),
  };

  return {
    db: {
      transaction: vi.fn((callback) => callback(mockTx)),
    },
  };
});

describe('Database ORM Transaction Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transactionally log match details and update statistics for winners and players', async () => {
    const participants = [
      { userId: 'user-1', finalScore: 24, isDq: false },
      { userId: 'user-2', finalScore: 18, isDq: false },
      { userId: 'user-3', finalScore: 0, isDq: true },
    ];

    const matchId = await recordMatch('ABCD', 'user-1', 24, participants);

    expect(db.transaction).toHaveBeenCalled();
    expect(matchId).toBe('mocked-match-uuid');
  });
});
