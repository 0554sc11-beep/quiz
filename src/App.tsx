import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Users, 
  Tv, 
  ArrowRight, 
  LogIn, 
  PlusCircle, 
  HelpCircle,
  Database,
  Flame,
  UserCheck
} from 'lucide-react';
import { GameRoom, Player } from './types/game';
import { realtimeClient } from './lib/socket';
import { Header } from './components/Header';
import { AvatarPicker } from './components/AvatarPicker';
import { TeacherLobby } from './components/TeacherLobby';
import { TeacherGameScreen } from './components/TeacherGameScreen';
import { StudentView } from './components/StudentView';
import { LeaderboardView } from './components/LeaderboardView';
import { SupabaseModal } from './components/SupabaseModal';
import { getStoredSupabaseConfig } from './lib/supabase';

function generateRandomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Student join form
  const [studentRoomCode, setStudentRoomCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentAvatar, setStudentAvatar] = useState('🦊');

  // Teacher create form
  const [teacherName, setTeacherName] = useState('선생님');
  const [teacherRoomCode, setTeacherRoomCode] = useState(generateRandomCode());

  // Check URL query parameters for ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setStudentRoomCode(roomParam.toUpperCase());
      setActiveTab('student');
    }
  }, []);

  // Subscribe to real-time room updates
  useEffect(() => {
    const unsubscribe = realtimeClient.subscribe((updatedRoom) => {
      setRoom(updatedRoom);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Handle Teacher Create Room
  const handleTeacherCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = (teacherRoomCode || generateRandomCode()).trim().toUpperCase();
    const teacherPlayer: Player = {
      id: `teacher_${Date.now()}`,
      name: teacherName.trim() || '선생님',
      avatar: '🎓',
      role: 'teacher',
      score: 0,
      submitted: false,
      joinedAt: Date.now(),
    };

    setCurrentPlayer(teacherPlayer);
    realtimeClient.connect(cleanCode, teacherPlayer);
  };

  // Handle Student Join Room
  const handleStudentJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentRoomCode.trim() || !studentName.trim()) return;

    const cleanCode = studentRoomCode.trim().toUpperCase();
    const studentPlayer: Player = {
      id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: studentName.trim(),
      avatar: studentAvatar,
      role: 'student',
      score: 0,
      submitted: false,
      joinedAt: Date.now(),
    };

    setCurrentPlayer(studentPlayer);
    realtimeClient.connect(cleanCode, studentPlayer);
  };

  // Quick Demo: inject sample students for testing if teacher wants immediate demonstration
  const handleLoadSampleData = () => {
    if (!room || currentPlayer?.role !== 'teacher') return;

    const samples = [
      {
        id: `mock_1`,
        name: '김민준',
        avatar: '🦁',
        keywords: ['한라산등반', '백록담', '성판악', '비바람', '컵라면'],
        story: '중학교 2학년 때 아빠랑 비바람 뚫고 성판악 코스로 정상에 올라가서 먹은 컵라면 맛을 아직도 못 잊어요!',
      },
      {
        id: `mock_2`,
        name: '이서연',
        avatar: '🐱',
        keywords: ['길고양이구조', '치즈태비', '동물병원', '집사1일차', '간식조공'],
        story: '비 오는 날 아파트 화단 박스 안에서 떨고 있던 아기 고양이를 구조해서 지금은 저희 집 대장님이 되었습니다.',
      },
      {
        id: `mock_3`,
        name: '박준혁',
        avatar: '🐙',
        keywords: ['스쿠버다이빙', '바다거북이', '오키나와', '여권분실', '파출소'],
        story: '바다거북이를 바로 눈앞에서 보고 신났는데, 호텔 돌아오는 길에 가방을 잃어버려서 파출소에 갔던 아찔한 기억이 있어요!',
      },
      {
        id: `mock_4`,
        name: '정하은',
        avatar: '🎨',
        keywords: ['피아노콩쿠르', '쇼팽녹턴', '손가락쥐', '드레스', '최우수상'],
        story: '콩쿠르 무대에서 너무 긴장해서 손가락에 쥐가 났는데, 포기하지 않고 끝까지 연주해서 기적처럼 최우수상을 받았습니다.',
      },
    ];

    samples.forEach((sample) => {
      // Send join
      realtimeClient.send('JOIN_ROOM', {
        player: {
          id: sample.id,
          name: sample.name,
          avatar: sample.avatar,
          role: 'student',
          score: 0,
          submitted: true,
          joinedAt: Date.now(),
        },
      });

      // Send submission
      realtimeClient.send('SUBMIT_KEYWORDS', {
        playerId: sample.id,
        authorName: sample.name,
        keywords: sample.keywords,
        story: sample.story,
      });
    });
  };

  const handleLeaveRoom = () => {
    realtimeClient.disconnect();
    setRoom(null);
    setCurrentPlayer(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Header
        roomCode={room?.code}
        role={currentPlayer?.role}
        userName={currentPlayer?.name}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onLeaveRoom={room ? handleLeaveRoom : undefined}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {!room || !currentPlayer ? (
          /* ================= LANDING / JOIN SCREEN ================= */
          <div className="flex-1 flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-xl space-y-8 animate-in fade-in duration-300">
              {/* Hero Banner */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold tracking-wider uppercase">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>실시간 학급 소통 & 스피드 퀴즈</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  나의 경험 키워드로 <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-indigo-400">
                    나를 맞춰봐!
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto">
                  3~6개의 키워드로 나만의 재미있는 경험을 공유하고, 실시간으로 누구의 경험인지 맞히는 스피드게임!
                </p>
              </div>

              {/* Mode Selector Tabs */}
              <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-2xl flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('student')}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'student'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>학생 참여하기</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('teacher')}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'teacher'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tv className="w-4 h-4" />
                  <span>교사(방 만들기)</span>
                </button>
              </div>

              {/* Student Join Form */}
              {activeTab === 'student' ? (
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <LogIn className="w-5 h-5 text-indigo-400" />
                      <span>학생 게임 참가</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      선생님 화면의 참여코드와 내 이름을 입력해주세요.
                    </p>
                  </div>

                  <form onSubmit={handleStudentJoinRoom} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        참여 코드 (4자리 PIN)
                      </label>
                      <input
                        type="text"
                        placeholder="예: 7891"
                        maxLength={6}
                        value={studentRoomCode}
                        onChange={(e) => setStudentRoomCode(e.target.value.toUpperCase())}
                        required
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-amber-400 font-mono text-xl font-bold uppercase tracking-widest placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        학생 이름 또는 닉네임
                      </label>
                      <input
                        type="text"
                        placeholder="예: 김민준"
                        maxLength={12}
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>

                    <AvatarPicker
                      selected={studentAvatar}
                      onSelect={(emoji) => setStudentAvatar(emoji)}
                    />

                    <button
                      type="submit"
                      disabled={!studentRoomCode.trim() || !studentName.trim()}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-base shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>게임 방 입장하기</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              ) : (
                /* Teacher Create Form */
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-purple-400" />
                      <span>교사 게임 룸 개설</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      교실 빔프로젝터 또는 전자칠판에 띄울 퀴즈 방을 만듭니다.
                    </p>
                  </div>

                  <form onSubmit={handleTeacherCreateRoom} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        진행자 호칭 / 이름
                      </label>
                      <input
                        type="text"
                        placeholder="선생님"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        방 참여 코드 (자동 생성됨)
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={teacherRoomCode}
                        onChange={(e) => setTeacherRoomCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-amber-400 font-mono text-xl font-bold uppercase tracking-widest placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                      />
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-300">💡 게임 진행 순서 안내:</p>
                      <p>1. 방 개설 후 빔프로젝터에 화면을 띄우고 참여코드를 공유합니다.</p>
                      <p>2. 학생들이 각자 스마트폰/태블릿으로 3~6개 경험 키워드를 제출합니다.</p>
                      <p>3. 실시간으로 취합되면 퀴즈를 시작하여 누구의 경험인지 맞힙니다!</p>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-purple-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <span>새 게임 방 만들기</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================= ACTIVE GAME ROOM ================= */
          <div className="flex-1 pb-16">
            {/* Quick Demo Toolbar for Teacher: If teacher is in submitting phase with 0 students, give demo trigger */}
            {currentPlayer.role === 'teacher' && room.phase === 'submitting' && (
              <div className="max-w-6xl mx-auto px-4 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>빠른 시연이 필요하신가요? 가상 학생 4명의 샘플 키워드를 즉시 투입할 수 있습니다.</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-bold rounded-xl transition-all hover:scale-105"
                  >
                    ⚡ 샘플 학생 4명 키워드 자동 채우기
                  </button>
                </div>
              </div>
            )}

            {/* ROUTING BY ROLE & PHASE */}
            {currentPlayer.role === 'teacher' ? (
              room.phase === 'submitting' ? (
                <TeacherLobby room={room} />
              ) : room.phase === 'playing' || room.phase === 'round_result' ? (
                <TeacherGameScreen room={room} />
              ) : (
                <LeaderboardView room={room} role="teacher" />
              )
            ) : room.phase === 'leaderboard' ? (
              <LeaderboardView room={room} role="student" />
            ) : (
              <StudentView room={room} player={currentPlayer} />
            )}
          </div>
        )}
      </main>

      {/* Supabase Connection Setup Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigChanged={() => {
          // Reconnect with new Supabase settings
          if (room && currentPlayer) {
            realtimeClient.connect(room.code, currentPlayer);
          }
        }}
      />
    </div>
  );
}
