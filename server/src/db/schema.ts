import { pgTable, uuid, varchar, integer, timestamp, boolean, primaryKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: varchar('display_name', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  totalWins: integer('total_wins').default(0).notNull(),
  gamesPlayed: integer('games_played').default(0).notNull(),
});

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomCode: varchar('room_code', { length: 4 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  winnerId: uuid('winner_id').references(() => users.id),
  winningScore: integer('winning_score').default(0).notNull(),
});

export const matchParticipants = pgTable('match_participants', {
  matchId: uuid('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  finalScore: integer('final_score').notNull(),
  isDq: boolean('is_dq').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.matchId, table.userId] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;

export type MatchParticipant = typeof matchParticipants.$inferSelect;
export type NewMatchParticipant = typeof matchParticipants.$inferInsert;
