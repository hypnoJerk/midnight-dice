import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './game/roomManager.js';
import { initializeSockets } from './socket/connection.js';
import { getLeaderboard, getRecentMatches, recordMatch, upsertUser, getUserByUsername, createUser } from './db/queries.js';
import { hashPassword, verifyPassword } from './db/auth.js';

// Resolve directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv from CWD first, then fallback to root workspace directory if needed (e.g. for local runs)
dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// Database-linked Game Over Trigger
// ----------------------------------------------------
const roomManager = new RoomManager(async (room) => {
  console.log(`[Game Over] Room ${room.code} completed. Saving match results...`);
  
  try {
    const winnerId = room.winners.length === 1 ? room.winners[0] : null;
    const winningScore = room.players.find(p => p.id === winnerId)?.score 
                      || room.players.find(p => p.id === winnerId)?.shootoutScore 
                      || 0;
                      
    const participants = room.players.map(p => ({
      userId: p.id,
      finalScore: p.shootoutScore !== undefined && p.shootoutScore >= 0 ? p.shootoutScore : p.score,
      isDq: p.isDQ
    }));

    const matchId = await recordMatch(room.code, winnerId, winningScore, participants);
    console.log(`[Database] Logged match ID ${matchId} successfully.`);
  } catch (error) {
    console.error('[Database Error] Failed to persist completed match state:', error);
  }
});

// ----------------------------------------------------
// Socket.io Event Handling
// ----------------------------------------------------
initializeSockets(io, roomManager);

// ----------------------------------------------------
// REST API Endpoints
// ----------------------------------------------------

// 1. Fetch Global High-Score Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch leaderboard' });
  }
});

// 2. Fetch Recent Match Histories
app.get('/api/matches', async (req, res) => {
  try {
    const matches = await getRecentMatches();
    res.json(matches);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch match records' });
  }
});

// 3. Register New Player with Password
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  try {
    const cleanUsername = username.trim().toUpperCase();
    if (!cleanUsername) {
      return res.status(400).json({ error: 'Invalid username' });
    }

    const existingUser = await getUserByUsername(cleanUsername);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = hashPassword(password);
    const user = await createUser(cleanUsername, passwordHash);
    res.status(200).json({ id: user.id, displayName: user.displayName });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user account' });
  }
});

// 4. Authenticate & Login Player
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  try {
    const cleanUsername = username.trim().toUpperCase();
    const user = await getUserByUsername(cleanUsername);
    if (!user) {
      return res.status(404).json({ error: 'Username does not exist' });
    }

    const isPasswordValid = verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid login' });
    }

    res.status(200).json({ id: user.id, displayName: user.displayName });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to authenticate player' });
  }
});

// Keep a legacy register endpoint for backward compatibility
app.post('/api/users/register', async (req, res) => {
  const { userId, displayName } = req.body;
  if (!userId || !displayName) {
    return res.status(400).json({ error: 'Missing userId or displayName' });
  }

  try {
    const user = await upsertUser(userId, displayName);
    res.status(200).json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to register identity' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

import { initializeDatabase } from './db/init.js';

const PORT = process.env.PORT || 3001;

initializeDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Authoritative game server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Startup Error] Failed to boot server due to database migration failure:', err);
    process.exit(1);
  });
