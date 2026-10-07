import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  Send, 
  CheckCircle, 
  Clock, 
  Zap, 
  HelpCircle, 
  Sparkles, 
  Lock, 
  Flame, 
  Lightbulb, 
  UserCheck,
  Award
} from 'lucide-react';
import { GameRoom, Player } from '../types/game';
import { realtimeClient } from '../lib/socket';
import { soundManager } from '../lib/audio';

interface StudentViewProps {
  room: GameRoom;
  player: Player;
}

const INSPIRATION_IDEAS = [
  '#첫비행기', '#길고양이구조', '#한라산등반', '#피아노콩쿠르', 
  '#여권분실', '#오징어게임', '#자전거국토종주', '#롤플래티넘', 
  '#농구대회우승', '#붕어빵10개', '#반려견입양', '#캠핑폭우'
];

export const StudentView: React.FC<StudentViewProps> = ({ room, player }) => {
  const [currentInput, setCurrentInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [story, setStory] = useState('');
  const [selectedGuess, setSelectedGuess] = useState('');
  const [isBuzzingOpen, setIsBuzzingOpen] = useState(false);

  const submissionKey = `sub_${player.id}`;
  const existingSubmission = room.submissions[submissionKey];
  const isSubmitted = Boolean(existingSubmission);

  // Phase checking
  const isSubmittingPhase = room.phase === 'submitting';
  const isPlayingPhase = room.phase === 'playing';
  const isRoundResultPhase = room.phase === 'round_result';

  // Current quiz info
  const currentSub = room.currentSubmissionId ? room.submissions[room.currentSubmissionId] : null;
  const isMySubmission = currentSub?.playerId === player.id;
  const myBuzz = currentSub ? room.buzzes.find((b) => b.submissionId === currentSub.id && b.playerId === player.id) : null;

  // Add keyword
  const handleAddKeyword = () => {
    const clean = currentInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (keywords.includes(clean)) return;
    if (keywords.length >= 6) return;

    setKeywords([...keywords, clean]);
    setCurrentInput('');
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleInspirationClick = (idea: string) => {
    const clean = idea.replace(/^#/, '');
    if (keywords.length < 6 && !keywords.includes(clean)) {
      setKeywords([...keywords, clean]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keywords.length < 3 || keywords.length > 6) return;

    realtimeClient.send('SUBMIT_KEYWORDS', {
      playerId: player.id,
      authorName: player.name,
      keywords,
      story,
    });
  };

  const handleSendGuess = (guessName: string) => {
    if (!isPlayingPhase || !currentSub || isMySubmission || myBuzz) return;

    soundManager.playBuzzer();
    realtimeClient.send('BUZZ_GUESS', {
      playerId: player.id,
      guessName,
    });
    setIsBuzzingOpen(false);
  };

  // Other students who could be the answer
  const studentCandidates = Object.values(room.players)
    .filter((p) => p.role === 'student')
    .map((p) => p.name);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Student Profile Card with Current Score */}
      <div className="flex items-center justify-between p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="text-3xl w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-600/20 border border-indigo-500/30">
            {player.avatar}
          </div>
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>{player.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                참가자
              </span>
            </div>
            <span className="text-xs text-slate-400">
              방 코드: <strong className="text-amber-400 font-mono">{room.code}</strong>
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            나의 점수
          </span>
          <span className="text-xl font-black text-amber-400 font-mono">
            {room.players[player.id]?.score || 0}점
          </span>
        </div>
      </div>

      {/* PHASE 1: KEYWORD SUBMISSION */}
      {isSubmittingPhase && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>경험 키워드 입력 (3~6개)</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  나의 특별한 경험을 키워드로 표현해주세요!
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  친구들이 키워드를 보고 누구의 경험인지 맞히는 스피드 퀴즈가 진행됩니다.
                </p>
              </div>

              {/* Tag Input */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                      #
                    </span>
                    <input
                      type="text"
                      placeholder="키워드 입력 (예: 한라산등반, 길고양이)"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      className="w-full pl-8 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    disabled={keywords.length >= 6 || !currentInput.trim()}
                    className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    추가
                  </button>
                </div>

                {/* Keyword Count Indicator */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    최소 3개 ~ 최대 6개 등록 (현재: <strong className="text-white">{keywords.length}개</strong>)
                  </span>
                  {keywords.length >= 3 && keywords.length <= 6 ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> 제출 가능
                    </span>
                  ) : (
                    <span className="text-amber-400 font-medium">
                      {keywords.length < 3 ? `${3 - keywords.length}개 더 필요해요!` : '최대 6개까지 가능'}
                    </span>
                  )}
                </div>

                {/* Keyword Chips */}
                <div className="flex flex-wrap gap-2 min-h-12 p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                  {keywords.length === 0 ? (
                    <span className="text-xs text-slate-600 italic py-1">
                      아직 추가된 키워드가 없습니다. 위 입력창에 작성 후 추가 버튼을 눌러주세요.
                    </span>
                  ) : (
                    keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/30 to-violet-600/30 border border-indigo-500/40 text-indigo-200 text-sm font-semibold shadow-sm animate-in zoom-in-50 duration-150"
                      >
                        <span>#{kw}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(idx)}
                          className="p-0.5 text-indigo-400 hover:text-white rounded-md hover:bg-indigo-500/30"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Ideas chip inspiration */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>클릭하여 키워드 추천 추가해보기:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {INSPIRATION_IDEAS.slice(0, 8).map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => handleInspirationClick(idea)}
                        disabled={keywords.length >= 6}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Story */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  경험 한 줄 비하인드 스토리 (선택)
                </label>
                <textarea
                  rows={2}
                  placeholder="정답이 공개된 후 친구들에게 보여줄 짧은 경험 이야기를 적어보세요!"
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={keywords.length < 3 || keywords.length > 6}
                className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-xl ${
                  keywords.length >= 3 && keywords.length <= 6
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/20 hover:scale-[1.02] cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>키워드 제출하기 ({keywords.length}/6개)</span>
              </button>
            </form>
          ) : (
            /* Already Submitted Waiting Screen */
            <div className="py-8 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white">키워드 제출 완료! 🎉</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  선생님과 다른 친구들의 작성이 끝나면 스피드 퀴즈가 시작됩니다.
                </p>
              </div>

              {/* Submitted Keywords Preview */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2 text-left">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  내가 제출한 경험 키워드:
                </span>
                <div className="flex flex-wrap gap-2">
                  {existingSubmission.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
                {existingSubmission.story && (
                  <p className="text-xs text-slate-400 italic pt-1 border-t border-slate-800">
                    "{existingSubmission.story}"
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-amber-400 font-semibold bg-amber-500/10 py-2.5 rounded-xl border border-amber-500/20">
                <Clock className="w-4 h-4 animate-spin" />
                <span>선생님이 퀴즈를 시작하기를 기다리고 있습니다...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PHASE 2: PLAYING / SPEED QUIZ */}
      {isPlayingPhase && currentSub && (
        <div className="bg-slate-900/95 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40">
              라운드 {room.currentRoundIndex + 1}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              공개된 키워드: {room.revealedKeywordCount} / {currentSub.keywords.length}개
            </span>
          </div>

          {/* Current Revealed Keywords */}
          <div className="space-y-3 text-center">
            <h3 className="text-lg sm:text-xl font-black text-white">
              누구의 경험 키워드일까요?
            </h3>

            <div className="flex flex-wrap items-center justify-center gap-2.5 py-3">
              {currentSub.keywords.slice(0, room.revealedKeywordCount).map((kw, i) => (
                <div
                  key={i}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-base shadow-md animate-in zoom-in duration-200"
                >
                  #{kw}
                </div>
              ))}
              {room.revealedKeywordCount < currentSub.keywords.length && (
                <div className="px-4 py-2.5 rounded-xl bg-slate-950 border border-dashed border-slate-700 text-slate-500 text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>힌트 추가 대기 중...</span>
                </div>
              )}
            </div>
          </div>

          {/* Special Author Notice: If this is MY submission! */}
          {isMySubmission ? (
            <div className="p-6 bg-gradient-to-br from-amber-500/20 via-indigo-950 to-slate-900 border-2 border-amber-400/50 rounded-2xl text-center space-y-3 shadow-xl">
              <div className="text-4xl animate-bounce">🤫</div>
              <h4 className="text-lg font-black text-amber-300">
                쉿! 내가 작성한 경험 키워드예요!
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                친구들이 과연 나를 알아맞힐 수 있을까요? <br />
                정답이 공개되면 나에게도 <strong>+30점 보너스 점수</strong>가 지급됩니다!
              </p>
            </div>
          ) : myBuzz ? (
            /* Student has already buzzed/guessed for this round */
            <div
              className={`p-6 rounded-2xl border text-center space-y-2 ${
                myBuzz.isCorrect
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="text-3xl">
                {myBuzz.isCorrect ? '🎉' : '😅'}
              </div>
              <h4 className="text-base font-bold text-white">
                내가 외친 정답: <span className="underline font-black">{myBuzz.guessName}</span>
              </h4>
              <p className="text-xs">
                {myBuzz.isCorrect
                  ? `정답입니다! +${myBuzz.points}점을 획득했습니다! 🥇`
                  : '아쉬워요! 다른 친구의 경험이에요. 다음 기회를 노려보세요!'}
              </p>
            </div>
          ) : (
            /* Active Guessing / Buzzer for classmates */
            <div className="space-y-4">
              {!isBuzzingOpen ? (
                <button
                  type="button"
                  onClick={() => setIsBuzzingOpen(true)}
                  className="w-full py-6 rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xl shadow-2xl shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Zap className="w-7 h-7 fill-current text-slate-950" />
                  <span>⚡ 저요! 정답 맞추기</span>
                </button>
              ) : (
                /* Candidate picker */
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">
                      누구의 경험인지 친구 이름을 선택하세요:
                    </span>
                    <button
                      onClick={() => setIsBuzzingOpen(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      취소
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {studentCandidates
                      .filter((name) => name !== player.name)
                      .map((candidateName) => (
                        <button
                          key={candidateName}
                          type="button"
                          onClick={() => handleSendGuess(candidateName)}
                          className="p-3 text-sm font-bold bg-slate-800 hover:bg-indigo-600 text-white rounded-xl border border-slate-700 transition-all hover:scale-105 active:scale-95 text-center truncate"
                        >
                          {candidateName}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PHASE 3: ROUND RESULT REVEAL */}
      {isRoundResultPhase && currentSub && (
        <div className="bg-slate-900/95 border-2 border-amber-400/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-4xl shadow-xl">
            {room.players[currentSub.playerId]?.avatar || '🦊'}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              정답 공개!
            </span>
            <h3 className="text-2xl font-black text-white">
              주인공은 <span className="text-amber-400">{currentSub.authorName}</span> 학생!
            </h3>
          </div>

          {currentSub.story && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-300 italic text-left">
              "{currentSub.story}"
            </div>
          )}

          <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-400">
            선생님이 다음 문제로 넘어가면 자동으로 화면이 갱신됩니다.
          </div>
        </div>
      )}
    </div>
  );
};
