import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';

interface WallpaperNoticeProps {
  onOpenSettings?: () => void;
}

export const WallpaperNotice: React.FC<WallpaperNoticeProps> = ({ onOpenSettings }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setIsHidden(true);
    }, 280);
  };

  if (isHidden) {
    return null;
  }

  return (
    <div
      className={`pointer-events-auto w-[320px] overflow-hidden rounded-3xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] shadow-2xl backdrop-blur-xl transition-[transform,opacity] duration-300 ${
        isClosing ? 'translate-x-[120%] opacity-0' : 'translate-x-0 opacity-100'
      } animate-[fadeIn_0.5s_ease-out]`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      {/* Header with gradient background */}
      <div className="relative h-[140px] overflow-hidden bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 h-32 w-32 rounded-full bg-blue-400 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-4 right-4 h-32 w-32 rounded-full bg-purple-400 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <IconButton
          onClick={handleClose}
          aria-label="Close wallpaper notice"
          className="absolute right-3 top-3 bg-[color:var(--ui-surface-strong)]/70 backdrop-blur"
        >
          <X size={14} />
        </IconButton>
        
        
      </div>

      {/* Content section */}
      <div className="border-t border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-6 py-6">
        <h3 className="text-base font-semibold text-[color:var(--ui-text)] mb-2">
          Personalize Your Space
        </h3>
        <p className="text-sm text-[color:var(--ui-text-muted)] leading-relaxed mb-5">
          Make Nook yours with a custom wallpaper that reflects your style
        </p>
        
        <button
          type="button"
          onClick={onOpenSettings}
          className="group w-full rounded-xl bg-[color:var(--ui-accent)] px-5 py-3 text-sm font-semibold text-[color:var(--ui-accent-contrast)] shadow-sm transition hover:brightness-95 active:scale-[0.98]"
        >
          <span className="relative flex items-center justify-center gap-2">
            Open Settings
            <svg 
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
};

// Add keyframes for custom animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
`;
document.head.appendChild(style);
