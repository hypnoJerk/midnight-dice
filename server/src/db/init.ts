import { pool } from './index.js';

/**
 * Authoritatively initializes the PostgreSQL database tables if they do not exist.
 * Ensures the database schema is perfectly in sync with Drizzle ORM models on startup.
 */
export async function initializeDatabase(): Promise<void> {
  console.log('[Database] Verifying database schema...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        display_name VARCHAR(255) NOT NULL,
        total_wins INTEGER DEFAULT 0 NOT NULL,
        games_played INTEGER DEFAULT 0 NOT NULL
      );
    `);

    // 2. Create matches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_code VARCHAR(4) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        winner_id UUID REFERENCES users(id),
        winning_score INTEGER DEFAULT 0 NOT NULL
      );
    `);

    // 3. Create match_participants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS match_participants (
        match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        final_score INTEGER NOT NULL,
        is_dq BOOLEAN NOT NULL,
        PRIMARY KEY (match_id, user_id)
      );
    `);

    await client.query('COMMIT');
    console.log('[Database] All schemas verified and migrated successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Database Error] Failed to initialize schemas:', error);
    throw error;
  } finally {
    client.release();
  }
}
