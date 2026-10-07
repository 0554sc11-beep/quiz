import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  HelpCircle, 
  Clock, 
  Award, 
  ChevronRight, 
  Pause, 
  Play, 
  Eye, 
  Volume2, 
  Flame,
  CheckCircle2,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { GameRoom } from '../types/game';
import { realtimeClient } from '../lib/socket';
import { soundManager } from '../lib/audio';

interface TeacherGameScreenProps {
  room: GameRoom;
}

export const TeacherGameScreen: React.FC<TeacherGameScreenProps> = ({ room }) => {
  const currentSub = room.currentSubmissionId ? room.submissions[room.currentSubmissionId] : null;
  const isRoundResult = room.phase === 'round_result';

  // Timer state
  const [timeLeft, setTimeLeft] = useState(room.settings.timerSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger confetti and fanfare on answer reveal
  useEffect(() => {
    if (isRoundResult) {
      soundManager.playFanfare();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [isRoundResult]);

  // Reset timer on new round
  useEffect(() => {
    setTimeLeft(room.settings.timerSeconds);
    setIsPaused(false);
  }, [room.currentRoundIndex, room.settings.timerSeconds]);

  // Step-by-step automatic keyword reveal timer
  useEffect(() => {
    if (room.phase !== 'playing' || !currentSub || isPaused) return;

    if (room.settings.revealMode === 'step_by_step') {
      const stepTimer = setInterval(() => {
        if (room.revealedKeywordCount < currentSub.keywords.length) {
          realtimeClient.send('REVEAL_NEXT_KEYWORD');
          soundManager.playKeywordFlip();
        }
      }, room.settings.stepIntervalSec * 1000);

      return () => clearInterval(stepTimer);
    }
  }, [room.phase, room.settings.revealMode, room.revealedKeywordCount, currentSub, isPaused]);

  // Main countdown timer
  useEffect(() => {
    if (room.phase !== 'playing' || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time expired -> auto reveal answer
          realtimeClient.send('REVEAL_ROUND_ANSWER');
          return 0;
        }
        if (prev <= 5) {
          soundManager.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room.phase, isPaused]);

  const handleRevealNextHint = () => {
    if (!currentSub) return;
    if (room.revealedKeywordCount < currentSub.keywords.length) {
      realtimeClient.send('REVEAL_NEXT_KEYWORD');
      soundManager.playKeywordFlip();
    }
  };

  const handleRevealAnswer = () => {
    realtimeClient.send('REVEAL_ROUND_ANSWER');
  };

  const handleNextRound = () => {
    realtimeClient.send('NEXT_ROUND');
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  if (!currentSub) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-slate-400">
        문제를 불러오는 중입니다...
      </div>
    );
  }

  const currentRoundNum = room.currentRoundIndex + 1;
  const totalRounds = room.roundOrder.length;
  const timerPercent = (timeLeft / room.settings.timerSeconds) * 100;
  const correctBuzz = room.buzzes.find((b) => b.isCorrect);

  // Author details
  const authorPlayer = room.players[currentSub.playerId];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Status Bar: Round and Timer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl text-white font-black text-sm tracking-wide shadow-md">
            라운드 {currentRoundNum} / {totalRounds}
          </div>
          <span className="text-slate-400 text-xs hidden sm:inline">
            학생들이 키워드를 보고 누구의 경험인지 맞히는 중입니다!
          </span>
        </div>

        {/* Big Countdown Timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Clock className={`w-5 h-5 ${timeLeft <= 5 ? 'text-rose-500 animate-ping' : 'text-amber-400'}`} />
            <span className={`font-mono text-3xl font-black ${
              timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
            }`}>
              {timeLeft}초
            </span>
          </div>

          <button
            onClick={togglePause}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title={isPaused ? '재개' : '일시정지'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400 fill-current" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Central Stage: Keywords Display */}
      <div className="relative overflow-hidden bg-slate-900/95 border-2 border-indigo-500/40 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>경험 공유 스피드 퀴즈</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            다음 <span className="text-amber-400">{currentSub.keywords.length}개의 키워드</span>는 누구의 경험일까요?
          </h2>
          <p className="text-slate-400 text-sm">
            {room.settings.revealMode === 'step_by_step'
              ? `힌트 키워드가 순차적으로 열립니다 (${room.revealedKeywordCount} / ${currentSub.keywords.length}개 공개됨)`
              : '전체 키워드가 공개되었습니다. 가장 먼저 맞히는 친구는 누구일까요?'}
          </p>
        </div>

        {/* Keyword Cards Grid */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-4">
          {currentSub.keywords.map((keyword, index) => {
            const isRevealed = index < room.revealedKeywordCount || isRoundResult;

            return (
              <div
                key={index}
                className={`relative group transition-all duration-300 transform ${
                  isRevealed
                    ? 'scale-100 rotate-0'
                    : 'scale-95 opacity-60'
                }`}
              >
                {isRevealed ? (
                  <div className="px-6 sm:px-8 py-4 sm:py-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border-2 border-indigo-400 shadow-xl shadow-indigo-500/20 text-white flex items-center gap-2.5 animate-in zoom-in duration-200">
                    <span className="text-indigo-400 font-black text-lg">#</span>
                    <span className="text-xl sm:text-3xl font-black tracking-tight text-white">
                      {keyword}
                    </span>
                  </div>
                ) : (
                  <div className="px-6 sm:px-8 py-4 sm:py-5 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700/80 text-slate-500 flex items-center gap-2 shadow-inner">
                    <HelpCircle className="w-5 h-5 text-slate-600" />
                    <span className="text-base sm:text-xl font-bold tracking-wider">
                      힌트 {index + 1} 대기 중...
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Guessing Buzzers Feed */}
        <div className="pt-4 border-t border-slate-800/80 max-w-2xl mx-auto">
          <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
            실시간 학생 버저 & 답변 현황 ({room.buzzes.length}명 도전)
          </div>

          {room.buzzes.length === 0 ? (
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/60 text-slate-500 text-xs">
              ⚡ 아직 정답을 외친 친구가 없습니다. 학생 화면에서 버저를 누르면 여기에 표시됩니다!
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2 max-h-36 overflow-y-auto p-1">
              {room.buzzes.map((buzz) => (
                <div
                  key={buzz.id}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 animate-in zoom-in duration-150 ${
                    buzz.isCorrect
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-2 ring-emerald-500/40'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {buzz.isCorrect ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span className="text-white font-bold">{buzz.playerName}:</span>
                  <span className="underline decoration-dotted">{buzz.guessName}</span>
                  {buzz.isCorrect && (
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px]">
                      +{buzz.points}점
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Host Control Deck */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          {room.revealedKeywordCount < currentSub.keywords.length && !isRoundResult && (
            <button
              onClick={handleRevealNextHint}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              다음 힌트 키워드 열기 (+1)
            </button>
          )}

          {!isRoundResult ? (
            <button
              onClick={handleRevealAnswer}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all hover:scale-105"
            >
              🎉 지금 바로 정답 공개하기!
            </button>
          ) : (
            <button
              onClick={handleNextRound}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 flex items-center gap-2"
            >
              <span>다음 문제로 이동</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Dramatic Answer Reveal Popup Modal */}
      {isRoundResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="relative max-w-2xl w-full bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 border-2 border-amber-400 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-sm font-black uppercase tracking-wider animate-bounce">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>정답 대공개!</span>
            </div>

            {/* Author Spotlight */}
            <div className="space-y-3">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-5xl shadow-2xl ring-4 ring-amber-400/50">
                {authorPlayer?.avatar || '🦊'}
              </div>
              <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                주인공은 <span className="text-amber-400">{currentSub.authorName}</span> 학생!
              </h3>
              <p className="text-indigo-200 text-sm">
                경험을 멋지게 공유해준 {currentSub.authorName} 학생에게 +30점 보너스가 지급되었습니다! 🎉
              </p>
            </div>

            {/* Behind-the-scenes Story */}
            {currentSub.story ? (
              <div className="p-5 bg-slate-900/90 border border-indigo-500/30 rounded-2xl text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <MessageSquare className="w-4 h-4" />
                  <span>{currentSub.authorName} 학생의 경험 이야기</span>
                </div>
                <p className="text-slate-200 text-sm sm:text-base leading-relaxed italic">
                  "{currentSub.story}"
                </p>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/60 rounded-2xl text-xs text-slate-400">
                (학생이 키워드를 통해 특별한 경험을 나눴습니다!)
              </div>
            )}

            {/* Fastest Guesser Award */}
            {correctBuzz && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-2 text-emerald-300 text-xs sm:text-sm font-bold">
                <Award className="w-4 h-4 text-amber-400" />
                <span>
                  가장 빠른 정답자: <strong>{correctBuzz.playerName}</strong> (+{correctBuzz.points}점 획득! 🥇)
                </span>
              </div>
            )}

            {/* Action */}
            <button
              onClick={handleNextRound}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-base shadow-xl shadow-amber-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <span>
                {currentRoundNum >= totalRounds ? '최종 순위 & 경험 갤러리 보기 🏆' : '다음 라운드로 넘어가기 ➡️'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
