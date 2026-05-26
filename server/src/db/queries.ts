import { eq, sql, desc } from 'drizzle-orm';
import { db } from './index.js';
import { users, matches, matchParticipants, User } from './schema.js';

/**
 * Upserts a player identity. Caches their chosen display name.
 */
export async function upsertUser(id: string, displayName: string): Promise<User> {
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({ displayName })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(users)
    .values({
      id,
      displayName,
      password: 'legacy_unauthenticated',
      totalWins: 0,
      gamesPlayed: 0
    })
    .returning();
  return inserted;
}

/**
 * Logs a complete match transactionally. 
 * Increments games_played for all, and total_wins for the victor.
 */
export async function recordMatch(
  roomCode: string,
  winnerId: string | null,
  winningScore: number,
  participants: { userId: string; finalScore: number; isDq: boolean }[]
): Promise<string> {
  return await db.transaction(async (tx) => {
    // 1. Log the main match entry
    const [match] = await tx
      .insert(matches)
      .values({
        roomCode,
        winnerId,
        winningScore
      })
      .returning();

    // 2. Log all participants
    await tx.insert(matchParticipants).values(
      participants.map(p => ({
        matchId: match.id,
        userId: p.userId,
        finalScore: p.finalScore,
        isDq: p.isDq
      }))
    );

    // 3. Update statistics for each player
    for (const p of participants) {
      await tx
        .update(users)
        .set({ gamesPlayed: sql`${users.gamesPlayed} + 1` })
        .where(eq(users.id, p.userId));
    }

    if (winnerId) {
      await tx
        .update(users)
        .set({ totalWins: sql`${users.totalWins} + 1` })
        .where(eq(users.id, winnerId));
    }

    return match.id;
  });
}

/**
 * Retrieves the global high-score leaderboard ordered by total wins.
 */
export async function getLeaderboard(limit = 10): Promise<User[]> {
  return await db
    .select()
    .from(users)
    .orderBy(desc(users.totalWins))
    .limit(limit);
}

/**
 * Retrieves a list of recent matches, complete with winner display name.
 */
export async function getRecentMatches(limit = 10) {
  return await db
    .select({
      id: matches.id,
      roomCode: matches.roomCode,
      createdAt: matches.createdAt,
      winningScore: matches.winningScore,
      winnerName: users.displayName
    })
    .from(matches)
    .leftJoin(users, eq(matches.winnerId, users.id))
    .orderBy(desc(matches.createdAt))
    .limit(limit);
}

/**
 * Retrieves a user record by their unique username (displayName).
 */
export async function getUserByUsername(username: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.displayName, username))
    .limit(1);
  return user;
}

/**
 * Creates a new user record with a unique username and a hashed password.
 */
export async function createUser(username: string, passwordHash: string): Promise<User> {
  const [inserted] = await db
    .insert(users)
    .values({
      displayName: username,
      password: passwordHash,
      totalWins: 0,
      gamesPlayed: 0
    })
    .returning();
  return inserted;
}
