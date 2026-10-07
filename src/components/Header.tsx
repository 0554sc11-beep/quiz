import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Database, 
  Copy, 
  Check, 
  LogOut,
  Tv
} from 'lucide-react';
import { soundManager } from '../lib/audio';
import { getStoredSupabaseConfig } from '../lib/supabase';

interface HeaderProps {
  roomCode?: string;
  role?: 'teacher' | 'student';
  userName?: string;
  onOpenSupabaseModal: () => void;
  onLeaveRoom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  role,
  userName,
  onOpenSupabaseModal,
  onLeaveRoom,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState(getStoredSupabaseConfig());

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    soundManager.setMuted(next);
    setIsMuted(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const copyRoomCode = () => {
    if (!roomCode) return;
    const joinUrl = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Game Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>키워드 경험 맞추기</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-indigo-400">
                  스피드게임
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              3~6개 키워드로 경험을 공유하고 누구인지 맞히는 실시간 퀴즈
            </p>
          </div>
        </div>

        {/* Center: Room Code pill if in room */}
        {roomCode && (
          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomCode}
              title="클릭하여 입장 링크 복사"
              className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-full transition-all group"
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                참여코드
              </span>
              <span className="font-mono font-black text-amber-400 text-sm tracking-wider">
                {roomCode}
              </span>
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
              )}
            </button>
            {role && (
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold hidden md:inline-block border ${
                role === 'teacher'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {role === 'teacher' ? '교사(호스트)' : `${userName || '학생'} 참여 중`}
              </span>
            )}
          </div>
        )}

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          {/* Supabase Status Button */}
          <button
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              supabaseConfig.enabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Supabase 백엔드 연동 상태"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">
              {supabaseConfig.enabled ? 'Supabase 연동됨' : 'Supabase 설정'}
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label="효과음 켜기/끄기"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
            title={isMuted ? '소리 켜기' : '소리 끄기'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Fullscreen Toggle (Great for Teacher Projector) */}
          <button
            onClick={toggleFullscreen}
            aria-label="전체화면 토글"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors hidden sm:block"
            title="빔프로젝터 전체화면 모드"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Leave Room Button */}
          {roomCode && onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
              title="방 나가기"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
