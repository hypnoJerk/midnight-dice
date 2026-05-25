import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './game/roomManager.js';
import { initializeSockets } from './socket/connection.js';
import { getLeaderboard, getRecentMatches, recordMatch, upsertUser } from './db/queries.js';

dotenv.config();

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

// 3. Register Player / Caches displays name with persistent UUID
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
