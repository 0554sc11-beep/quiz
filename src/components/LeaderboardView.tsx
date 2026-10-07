import React from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Medal, 
  RotateCcw, 
  Sparkles, 
  BookMarked, 
  Printer, 
  Share2 
} from 'lucide-react';
import { GameRoom } from '../types/game';
import { realtimeClient } from '../lib/socket';

interface LeaderboardViewProps {
  room: GameRoom;
  role: 'teacher' | 'student';
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ room, role }) => {
  React.useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
    });
  }, []);

  const playersList = Object.values(room.players)
    .filter((p) => p.role === 'student')
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const submissionsList = Object.values(room.submissions);

  const handleResetGame = () => {
    realtimeClient.send('RESET_GAME');
  };

  const handlePrint = () => {
    window.print();
  };

  const firstPlace = playersList[0];
  const secondPlace = playersList[1];
  const thirdPlace = playersList[2];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10 animate-in fade-in duration-300">
      {/* Top Victory Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>게임 종료 • 최종 결과 발표</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          키워드 경험 맞추기 명예의 전당 🏆
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          친구들의 특별한 경험을 가장 빠르게 맞힌 순발력 챔피언들과 우리 반의 소중한 경험 모음입니다!
        </p>
      </div>

      {/* Podium (Top 3) */}
      <div className="flex flex-col sm:flex-row items-end justify-center gap-4 pt-6 max-w-2xl mx-auto">
        {/* 2nd Place */}
        {secondPlace && (
          <div className="w-full sm:w-1/3 flex flex-col items-center order-2 sm:order-1">
            <div className="text-4xl mb-2">{secondPlace.avatar}</div>
            <div className="text-sm font-bold text-slate-200 truncate max-w-[120px]">
              {secondPlace.name}
            </div>
            <div className="text-xs font-mono font-bold text-amber-300 mb-2">
              {secondPlace.score}점
            </div>
            <div className="w-full h-32 bg-gradient-to-t from-slate-800 to-slate-700/80 rounded-t-3xl border-t-2 border-slate-400 flex flex-col items-center justify-center p-3 shadow-lg">
              <span className="text-3xl font-black text-slate-300">2위</span>
              <span className="text-xs text-slate-400 font-semibold">은메달 🥈</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {firstPlace && (
          <div className="w-full sm:w-1/3 flex flex-col items-center order-1 sm:order-2">
            <div className="relative mb-2">
              <div className="text-5xl">{firstPlace.avatar}</div>
              <span className="absolute -top-3 -right-2 text-2xl">👑</span>
            </div>
            <div className="text-base font-black text-white truncate max-w-[140px]">
              {firstPlace.name}
            </div>
            <div className="text-sm font-mono font-black text-amber-400 mb-2">
              {firstPlace.score}점
            </div>
            <div className="w-full h-44 bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 rounded-t-3xl border-t-2 border-yellow-200 flex flex-col items-center justify-center p-3 shadow-2xl text-slate-950">
              <span className="text-4xl font-black">1위</span>
              <span className="text-xs font-black uppercase tracking-wider">금메달 🥇</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {thirdPlace && (
          <div className="w-full sm:w-1/3 flex flex-col items-center order-3 sm:order-3">
            <div className="text-4xl mb-2">{thirdPlace.avatar}</div>
            <div className="text-sm font-bold text-slate-200 truncate max-w-[120px]">
              {thirdPlace.name}
            </div>
            <div className="text-xs font-mono font-bold text-amber-300 mb-2">
              {thirdPlace.score}점
            </div>
            <div className="w-full h-24 bg-gradient-to-t from-amber-900/60 to-amber-800/80 rounded-t-3xl border-t-2 border-amber-600 flex flex-col items-center justify-center p-3 shadow-lg">
              <span className="text-2xl font-black text-amber-200">3위</span>
              <span className="text-xs text-amber-300/80 font-semibold">동메달 🥉</span>
            </div>
          </div>
        )}
      </div>

      {/* Full Scoreboard */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl max-w-2xl mx-auto space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Medal className="w-4 h-4 text-amber-400" />
          <span>전체 참가자 순위표</span>
        </h3>

        <div className="divide-y divide-slate-800/60">
          {playersList.map((player, idx) => (
            <div
              key={player.id}
              className="py-3 flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 font-mono font-bold text-slate-400 text-center">
                  #{idx + 1}
                </span>
                <span className="text-xl">{player.avatar}</span>
                <span className="font-bold text-white">{player.name}</span>
              </div>
              <span className="font-mono font-black text-amber-400">
                {player.score || 0}점
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Classroom Experience Gallery: All Submissions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-indigo-400" />
              <span>우리 반 경험 키워드 모음집 (Experience Wall)</span>
            </h3>
            <p className="text-xs text-slate-400">
              친구들이 나눈 소중한 경험과 3~6개 키워드를 모아보았습니다.
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors self-start sm:self-auto"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>학급 추억 인쇄하기</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissionsList.map((sub, i) => (
            <div
              key={sub.id}
              className="p-5 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-3 shadow-md hover:border-indigo-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-white flex items-center gap-2">
                  <span className="text-xl">
                    {room.players[sub.playerId]?.avatar || '🦊'}
                  </span>
                  <span>{sub.authorName}</span>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 font-mono">
                  {sub.keywords.length}개 키워드
                </span>
              </div>

              {/* Keyword Badges */}
              <div className="flex flex-wrap gap-1.5">
                {sub.keywords.map((kw, kwIdx) => (
                  <span
                    key={kwIdx}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold"
                  >
                    #{kw}
                  </span>
                ))}
              </div>

              {/* Story */}
              {sub.story && (
                <p className="text-xs text-slate-300 italic bg-slate-900/60 p-3 rounded-xl border border-slate-800/60 leading-relaxed">
                  "{sub.story}"
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Control: Restart Game */}
      {role === 'teacher' && (
        <div className="text-center pt-4">
          <button
            onClick={handleResetGame}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-base shadow-xl shadow-indigo-600/30 transition-all hover:scale-105"
          >
            <RotateCcw className="w-5 h-5" />
            <span>새 게임 다시 시작하기</span>
          </button>
        </div>
      )}
    </div>
  );
};
