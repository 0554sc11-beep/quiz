import React from 'react';

const AVATARS = [
  '🦊', '🐱', '🐶', '🐼', '🐯', '🦁', '🐨', '🐰', 
  '🦄', '🐙', '🚀', '⭐', '🌈', '🎨', '⚽', '🎮',
  '🎸', '⚡', '🍉', '🍩', '🍀', '🦖', '👑', '🔥'
];

interface AvatarPickerProps {
  selected: string;
  onSelect: (avatar: string) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ selected, onSelect }) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        나의 캐릭터 아바타 선택
      </label>
      <div className="grid grid-cols-8 gap-2 p-3 bg-slate-900/80 border border-slate-800 rounded-2xl max-h-40 overflow-y-auto">
        {AVATARS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className={`w-10 h-10 flex items-center justify-center text-xl rounded-xl transition-all duration-150 ${
              selected === emoji
                ? 'bg-indigo-600 scale-110 shadow-lg shadow-indigo-500/30 ring-2 ring-white'
                : 'bg-slate-800/60 hover:bg-slate-700/80 hover:scale-105'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
