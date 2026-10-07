import React, { useState } from 'react';
import { 
  Users, 
  Sparkles, 
  Play, 
  Settings, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  Clock, 
  Share2, 
  Copy, 
  Check,
  Tag,
  BookOpen
} from 'lucide-react';
import { GameRoom } from '../types/game';
import { realtimeClient } from '../lib/socket';

interface TeacherLobbyProps {
  room: GameRoom;
}

export const TeacherLobby: React.FC<TeacherLobbyProps> = ({ room }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const playersList = Object.values(room.players).filter((p) => p.role === 'student');
  const submissionsList = Object.values(room.submissions);
  const submittedCount = submissionsList.length;
  const totalStudents = playersList.length;
  const progressPercent = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStartQuiz = () => {
    if (submittedCount === 0) return;
    realtimeClient.send('START_QUIZ');
  };

  const handleUpdateRevealMode = (mode: 'step_by_step' | 'all_at_once') => {
    realtimeClient.send('UPDATE_SETTINGS', {
      settings: { revealMode: mode },
    });
  };

  const handleUpdateTimer = (seconds: number) => {
    realtimeClient.send('UPDATE_SETTINGS', {
      settings: { timerSeconds: seconds },
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: Big Room PIN for Projector */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 border-2 border-indigo-500/30 p-8 shadow-2xl text-center">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>학생 접속 대기 & 키워드 작성 중</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            선생님 화면 (교실 대형화면 모드)
          </h2>
          <p className="text-slate-300 text-sm sm:text-base">
            학생들은 아래 참여코드를 입력하고 접속하여 <strong>자신의 경험을 나타내는 3~6개의 키워드</strong>를 작성합니다.
          </p>

          {/* Big Code Display */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-3 bg-slate-950/80 border-2 border-amber-500/60 px-8 py-4 rounded-3xl shadow-xl">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
                참여 코드
              </span>
              <span className="font-mono text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 tracking-wider">
                {room.code}
              </span>
            </div>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 shadow-lg transition-all hover:scale-105"
            >
              {copiedLink ? (
                <>
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span>초대 링크 복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 text-amber-400" />
                  <span>학생용 참여 링크 복사</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Controls Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Progress Card */}
        <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  실시간 학생 작성 현황
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {submittedCount} / {totalStudents}명 완료
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  학생들이 제출한 키워드가 실시간으로 교사 화면에 취합됩니다.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">제출 키워드 검토</span>
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">취합 진행률</span>
              <span className="text-amber-400 font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Start Game Action Card */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
              스피드 퀴즈 준비
            </span>
            <h4 className="text-base font-bold text-white mt-1">
              누구의 경험인지 맞히기 게임
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {submittedCount > 0
                ? `${submittedCount}명의 키워드가 취합되었습니다. 퀴즈를 시작하세요!`
                : '학생들이 키워드를 작성하면 퀴즈를 시작할 수 있습니다.'}
            </p>
          </div>

          <button
            onClick={handleStartQuiz}
            disabled={submittedCount === 0}
            className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition-all shadow-xl ${
              submittedCount > 0
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 shadow-amber-500/20 hover:scale-[1.02] cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>스피드 퀴즈 시작하기! ({submittedCount}문제)</span>
          </button>
        </div>
      </div>

      {/* Game Rules & Settings Toggle */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-sm font-bold text-slate-200">
            <Settings className="w-4 h-4 text-amber-400" />
            <span>스피드 퀴즈 규칙 및 힌트 공개 방식 설정</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Reveal mode */}
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              키워드 공개 방식 (긴장감 조율)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateRevealMode('step_by_step')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  room.settings.revealMode === 'step_by_step'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ⏱️ 4초마다 1개씩 순차 공개
              </button>
              <button
                type="button"
                onClick={() => handleUpdateRevealMode('all_at_once')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  room.settings.revealMode === 'all_at_once'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ⚡ 한번에 전체 공개
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              {room.settings.revealMode === 'step_by_step'
                ? '첫 번째 키워드부터 차례로 공개되어 힌트가 늘어나는 스피드 퀴즈의 재미를 더합니다.'
                : '시작과 동시에 3~6개의 키워드가 모두 펼쳐져 빠른 순발력을 겨룹니다.'}
            </p>
          </div>

          {/* Timer Settings */}
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              문제당 제한 시간
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[20, 30, 45].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleUpdateTimer(sec)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    room.settings.timerSeconds === sec
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {sec}초
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              각 문제마다 카운트다운 타이머가 흐르며 학생들은 버저를 누르고 이름을 맞춥니다.
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Student Roster */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>접속한 학생 목록</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {totalStudents}명
            </span>
          </h3>
          <span className="text-xs text-slate-400">
            학생 화면에서 3~6개 키워드를 작성하면 실시간 체크됩니다.
          </span>
        </div>

        {totalStudents === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-3">
            <div className="text-4xl animate-bounce">📱</div>
            <p className="text-sm">
              아직 접속한 학생이 없습니다. 참여코드 <strong className="text-amber-400 font-mono text-base">{room.code}</strong> 로 학생들을 초대해보세요!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {playersList.map((player) => {
              const submission = room.submissions[`sub_${player.id}`];
              const isSubmitted = Boolean(submission);

              return (
                <div
                  key={player.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                    isSubmitted
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/80 shrink-0">
                    {player.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate text-white">
                      {player.name}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] mt-0.5">
                      {isSubmitted ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-emerald-400 font-semibold truncate">
                            {submission.keywords.length}개 완료
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                          <span className="text-amber-400/90 truncate">작성 중...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submissions Preview Modal (For Teacher Eyes Only) */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>제출된 키워드 & 스토리 검토</span>
                <span className="text-xs text-rose-400 font-normal">
                  (프로젝터 화면에 노출되지 않도록 주의하세요)
                </span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                닫기
              </button>
            </div>

            {submissionsList.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                아직 제출된 키워드가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {submissionsList.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-amber-300">
                        #{idx + 1}. {sub.authorName}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {sub.keywords.length}개 키워드
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {sub.keywords.map((kw, kIdx) => (
                        <span
                          key={kIdx}
                          className="px-2.5 py-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-lg"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>

                    {sub.story && (
                      <p className="text-xs text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                        "{sub.story}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
