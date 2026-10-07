import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GameRoom, Player, Submission, Buzz } from '../types/game';

const DEFAULT_SUPABASE_URL = 'https://edvwxnqlixanwslxfppb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_bxyslqCc0GfsETfa3d39gw_PWLtiuBQ';

const STORAGE_URL_KEY = 'keyword_quiz_supabase_url';
const STORAGE_ANON_KEY = 'keyword_quiz_supabase_anon_key';
const STORAGE_ENABLED_KEY = 'keyword_quiz_supabase_enabled';

export function getStoredSupabaseConfig() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_ANON_KEY) || '' : '';
  const storedEnabled = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_ENABLED_KEY) : null;

  const url = storedUrl || envUrl || DEFAULT_SUPABASE_URL;
  const anonKey = storedKey || envKey || DEFAULT_SUPABASE_ANON_KEY;
  const enabled = storedEnabled !== null ? storedEnabled === 'true' : true;

  return {
    url,
    anonKey,
    enabled,
  };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string, enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
    localStorage.setItem(STORAGE_ENABLED_KEY, enabled ? 'true' : 'false');
  }
}

let supabaseInstance: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey || !config.enabled) {
    return null;
  }

  if (supabaseInstance && currentUrl === config.url && currentKey === config.anonKey) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentUrl = config.url;
    currentKey = config.anonKey;
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    const tempClient = createClient(url.trim(), key.trim());
    const { error } = await tempClient.from('game_rooms').select('code').limit(1);
    if (error && error.code !== 'PGRST116') {
      if (error.message.includes('relation "game_rooms" does not exist') || error.code === '42P01') {
        return {
          success: true,
          message: 'Supabase 프로젝트 연결 성공! (단, SQL Editor에서 아래 테이블 생성 스크립트를 1회 실행해주세요)',
        };
      }
      return { success: false, message: `연결 오류: ${error.message}` };
    }
    return { success: true, message: 'Supabase 데이터베이스 및 Realtime 정상 연결 완료!' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `연결 실패: ${errorMsg}` };
  }
}

// Supabase sync helpers
export async function syncRoomToSupabase(room: GameRoom) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('game_rooms').upsert({
      code: room.code,
      host_name: room.hostName,
      phase: room.phase,
      current_round_index: room.currentRoundIndex,
      current_submission_id: room.currentSubmissionId || null,
      revealed_keyword_count: room.revealedKeywordCount,
      settings: room.settings,
    });
  } catch (err) {
    // Graceful fallback if tables not yet created
    console.warn('Supabase room sync notice:', err);
  }
}

export async function syncPlayerToSupabase(roomCode: string, player: Player) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('players').upsert({
      id: player.id,
      room_code: roomCode,
      name: player.name,
      avatar: player.avatar,
      role: player.role,
      score: player.score || 0,
      submitted: player.submitted,
    });
  } catch (err) {
    console.warn('Supabase player sync notice:', err);
  }
}

export async function syncSubmissionToSupabase(roomCode: string, submission: Submission) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('submissions').upsert({
      id: submission.id,
      room_code: roomCode,
      player_id: submission.playerId,
      author_name: submission.authorName,
      keywords: submission.keywords,
      story: submission.story || '',
      is_revealed: submission.isRevealed,
    });
  } catch (err) {
    console.warn('Supabase submission sync notice:', err);
  }
}

export async function syncBuzzToSupabase(roomCode: string, buzz: Buzz) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('buzzes').upsert({
      id: buzz.id,
      room_code: roomCode,
      submission_id: buzz.submissionId,
      player_id: buzz.playerId,
      player_name: buzz.playerName,
      guess_name: buzz.guessName,
      is_correct: buzz.isCorrect,
      points: buzz.points,
    });
  } catch (err) {
    console.warn('Supabase buzz sync notice:', err);
  }
}

export const SUPABASE_SQL_SCHEMA = `-- ============================================
-- 🎓 키워드 경험 맞추기 스피드게임 Supabase 스키마
-- Supabase 대시보드 -> SQL Editor 에서 복사 후 실행하세요!
-- ============================================

-- 1. 게임 방 테이블
create table if not exists public.game_rooms (
  code text primary key,
  host_name text default '선생님',
  phase text default 'submitting',
  current_round_index int default -1,
  current_submission_id text,
  revealed_keyword_count int default 0,
  settings jsonb default '{"revealMode": "step_by_step", "stepIntervalSec": 4, "timerSeconds": 30, "minKeywords": 3, "maxKeywords": 6}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. 참가 학생 테이블
create table if not exists public.players (
  id text primary key,
  room_code text references public.game_rooms(code) on delete cascade,
  name text not null,
  avatar text default '🦊',
  role text default 'student',
  score int default 0,
  submitted boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. 키워드 제출 테이블
create table if not exists public.submissions (
  id text primary key,
  room_code text references public.game_rooms(code) on delete cascade,
  player_id text references public.players(id) on delete cascade,
  author_name text not null,
  keywords text[] not null,
  story text default '',
  is_revealed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. 버저 및 정답 시도 테이블
create table if not exists public.buzzes (
  id text primary key,
  room_code text references public.game_rooms(code) on delete cascade,
  submission_id text,
  player_id text,
  player_name text,
  guess_name text,
  is_correct boolean default false,
  points int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Realtime 복제(Replication) 활성화
alter publication supabase_realtime add table public.game_rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.submissions;
alter publication supabase_realtime add table public.buzzes;

-- 6. Row Level Security 정책 (모든 사용자 읽기/쓰기 허용)
alter table public.game_rooms enable row level security;
alter table public.players enable row level security;
alter table public.submissions enable row level security;
alter table public.buzzes enable row level security;

create policy "Allow all public for game_rooms" on public.game_rooms for all using (true) with check (true);
create policy "Allow all public for players" on public.players for all using (true) with check (true);
create policy "Allow all public for submissions" on public.submissions for all using (true) with check (true);
create policy "Allow all public for buzzes" on public.buzzes for all using (true) with check (true);
`;
