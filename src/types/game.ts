export interface Player {
  id: string;
  name: string;
  avatar: string;
  role: 'student' | 'teacher';
  score: number;
  submitted: boolean;
  joinedAt: number;
}

export interface Submission {
  id: string;
  playerId: string;
  authorName: string;
  keywords: string[]; // 3 ~ 6 keywords
  story?: string;
  isRevealed: boolean;
  revealedKeywordCount: number;
}

export interface Buzz {
  id: string;
  submissionId: string;
  playerId: string;
  playerName: string;
  guessName: string;
  isCorrect: boolean;
  points: number;
  timestamp: number;
}

export type GamePhase =
  | 'submitting'   // Students entering 3~6 keywords
  | 'playing'      // Active round guessing
  | 'round_result' // Revealed who it is & story
  | 'leaderboard'; // Final podium & experience gallery

export interface GameSettings {
  revealMode: 'step_by_step' | 'all_at_once';
  stepIntervalSec: number;
  timerSeconds: number;
  minKeywords: number;
  maxKeywords: number;
}

export interface GameRoom {
  code: string;
  hostName: string;
  phase: GamePhase;
  players: Record<string, Player>;
  submissions: Record<string, Submission>;
  roundOrder: string[];
  currentRoundIndex: number;
  currentSubmissionId?: string;
  revealedKeywordCount: number;
  buzzes: Buzz[];
  settings: GameSettings;
  createdAt: number;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}
