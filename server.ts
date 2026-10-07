import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory real-time state for instant room management
interface Player {
  id: string;
  name: string;
  avatar: string;
  role: 'student' | 'teacher';
  score: number;
  submitted: boolean;
  joinedAt: number;
}

interface Submission {
  id: string;
  playerId: string;
  authorName: string;
  keywords: string[];
  story?: string;
  isRevealed: boolean;
  revealedKeywordCount: number;
}

interface Buzz {
  id: string;
  submissionId: string;
  playerId: string;
  playerName: string;
  guessName: string;
  isCorrect: boolean;
  points: number;
  timestamp: number;
}

interface GameRoom {
  code: string;
  hostName: string;
  phase: 'lobby' | 'submitting' | 'ready' | 'playing' | 'round_result' | 'leaderboard';
  players: Record<string, Player>;
  submissions: Record<string, Submission>;
  roundOrder: string[];
  currentRoundIndex: number;
  currentSubmissionId?: string;
  revealedKeywordCount: number;
  buzzes: Buzz[];
  settings: {
    revealMode: 'all_at_once' | 'step_by_step';
    stepIntervalSec: number;
    timerSeconds: number;
    minKeywords: number;
    maxKeywords: number;
  };
  createdAt: number;
}

const rooms: Record<string, GameRoom> = {};
const clientRooms = new Map<WebSocket, { roomCode: string; playerId: string }>();

function getOrCreateRoom(code: string, hostName = '선생님'): GameRoom {
  const cleanCode = code.trim().toUpperCase();
  if (!rooms[cleanCode]) {
    rooms[cleanCode] = {
      code: cleanCode,
      hostName,
      phase: 'submitting',
      players: {},
      submissions: {},
      roundOrder: [],
      currentRoundIndex: -1,
      revealedKeywordCount: 0,
      buzzes: [],
      settings: {
        revealMode: 'step_by_step',
        stepIntervalSec: 4,
        timerSeconds: 30,
        minKeywords: 3,
        maxKeywords: 6,
      },
      createdAt: Date.now(),
    };
  }
  return rooms[cleanCode];
}

function broadcastRoomState(roomCode: string) {
  const room = rooms[roomCode];
  if (!room) return;

  const payload = JSON.stringify({
    type: 'ROOM_STATE',
    room,
  });

  for (const [ws, info] of clientRooms.entries()) {
    if (info.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const { type, roomCode, payload } = msg;

      if (!roomCode) return;
      const cleanCode = roomCode.trim().toUpperCase();
      const room = getOrCreateRoom(cleanCode, payload?.hostName);

      switch (type) {
        case 'JOIN_ROOM': {
          const { player } = payload;
          clientRooms.set(ws, { roomCode: cleanCode, playerId: player.id });
          room.players[player.id] = {
            ...player,
            score: room.players[player.id]?.score || 0,
            submitted: Boolean(room.submissions[player.id]),
          };
          broadcastRoomState(cleanCode);
          break;
        }

        case 'UPDATE_SETTINGS': {
          if (payload.settings) {
            room.settings = { ...room.settings, ...payload.settings };
            broadcastRoomState(cleanCode);
          }
          break;
        }

        case 'SUBMIT_KEYWORDS': {
          const { playerId, authorName, keywords, story } = payload;
          if (room.players[playerId]) {
            room.players[playerId].submitted = true;
          }
          const submissionId = `sub_${playerId}`;
          room.submissions[submissionId] = {
            id: submissionId,
            playerId,
            authorName,
            keywords: keywords.slice(0, 6),
            story: story || '',
            isRevealed: false,
            revealedKeywordCount: 0,
          };
          broadcastRoomState(cleanCode);
          break;
        }

        case 'START_QUIZ': {
          const submissionIds = Object.keys(room.submissions);
          // Shuffle submissions for the game
          const shuffled = [...submissionIds].sort(() => Math.random() - 0.5);
          room.roundOrder = shuffled;
          room.currentRoundIndex = 0;
          if (shuffled.length > 0) {
            const firstId = shuffled[0];
            room.currentSubmissionId = firstId;
            const currentSub = room.submissions[firstId];
            room.revealedKeywordCount = room.settings.revealMode === 'all_at_once' ? currentSub.keywords.length : 1;
            room.phase = 'playing';
            room.buzzes = [];
          } else {
            room.phase = 'submitting';
          }
          broadcastRoomState(cleanCode);
          break;
        }

        case 'REVEAL_NEXT_KEYWORD': {
          if (room.currentSubmissionId && room.submissions[room.currentSubmissionId]) {
            const sub = room.submissions[room.currentSubmissionId];
            if (room.revealedKeywordCount < sub.keywords.length) {
              room.revealedKeywordCount += 1;
              broadcastRoomState(cleanCode);
            }
          }
          break;
        }

        case 'BUZZ_GUESS': {
          const { playerId, guessName } = payload;
          if (room.phase !== 'playing' || !room.currentSubmissionId) return;

          const currentSub = room.submissions[room.currentSubmissionId];
          if (!currentSub) return;

          // Check if user already guessed for this round
          const alreadyGuessed = room.buzzes.some(
            (b) => b.submissionId === currentSub.id && b.playerId === playerId
          );
          if (alreadyGuessed) return;

          const isAuthor = currentSub.playerId === playerId;
          // The author cannot guess themselves
          if (isAuthor) return;

          const isCorrect = guessName.trim().toLowerCase() === currentSub.authorName.trim().toLowerCase();
          const points = isCorrect ? Math.max(100 - room.buzzes.filter(b => b.isCorrect).length * 20, 40) : 0;

          if (isCorrect && room.players[playerId]) {
            room.players[playerId].score = (room.players[playerId].score || 0) + points;
          }

          const buzzItem: Buzz = {
            id: `buzz_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            submissionId: currentSub.id,
            playerId,
            playerName: room.players[playerId]?.name || '익명',
            guessName,
            isCorrect,
            points,
            timestamp: Date.now(),
          };

          room.buzzes.push(buzzItem);
          broadcastRoomState(cleanCode);
          break;
        }

        case 'REVEAL_ROUND_ANSWER': {
          if (room.currentSubmissionId && room.submissions[room.currentSubmissionId]) {
            const sub = room.submissions[room.currentSubmissionId];
            sub.isRevealed = true;
            room.revealedKeywordCount = sub.keywords.length;
            room.phase = 'round_result';

            // Author gets participation points
            if (room.players[sub.playerId]) {
              room.players[sub.playerId].score = (room.players[sub.playerId].score || 0) + 30;
            }
            broadcastRoomState(cleanCode);
          }
          break;
        }

        case 'NEXT_ROUND': {
          const nextIndex = room.currentRoundIndex + 1;
          if (nextIndex < room.roundOrder.length) {
            room.currentRoundIndex = nextIndex;
            const nextSubId = room.roundOrder[nextIndex];
            room.currentSubmissionId = nextSubId;
            const sub = room.submissions[nextSubId];
            room.revealedKeywordCount = room.settings.revealMode === 'all_at_once' ? sub.keywords.length : 1;
            room.phase = 'playing';
            room.buzzes = [];
          } else {
            room.phase = 'leaderboard';
          }
          broadcastRoomState(cleanCode);
          break;
        }

        case 'RESET_GAME': {
          room.phase = 'submitting';
          room.currentRoundIndex = -1;
          room.currentSubmissionId = undefined;
          room.roundOrder = [];
          room.buzzes = [];
          for (const pid of Object.keys(room.players)) {
            room.players[pid].score = 0;
          }
          broadcastRoomState(cleanCode);
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    const info = clientRooms.get(ws);
    if (info) {
      clientRooms.delete(ws);
      const room = rooms[info.roomCode];
      if (room && room.players[info.playerId]) {
        // keep player in state for scores, but could mark inactive if desired
      }
    }
  });
});

// REST endpoints for health check and state snapshot
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Keyword Speed Game server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
