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

    // Purge existing tables to reset the database and start over cleanly ONLY if explicitly requested via environment variables
    if (process.env.PURGE_DB === 'true' || process.env.RESET_DB === 'true') {
      console.log('[Database] PURGE_DB / RESET_DB flag detected. Purging existing tables for a clean restart...');
      await client.query(`
        DROP TABLE IF EXISTS match_participants CASCADE;
        DROP TABLE IF EXISTS matches CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
      `);
    }

    // 1. Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        display_name VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        total_wins INTEGER DEFAULT 0 NOT NULL,
        games_played INTEGER DEFAULT 0 NOT NULL
      );
    `);

    // Safe DB upgrade: check and add columns/constraints for existing deployments
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_display_name_key'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_display_name_key UNIQUE (display_name);
        END IF;
      END $$;

      ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
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
