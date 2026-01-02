import React, { useEffect, useRef, useState } from 'react';
import { LuX } from 'react-icons/lu';
import { IconButton } from '@/components/ui/IconButton';

interface WallpaperNoticeProps {
  onOpenSettings?: () => void;
  isEnabled?: boolean;
}

export const WallpaperNotice: React.FC<WallpaperNoticeProps> = ({
  onOpenSettings,
  isEnabled = true
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const showTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      setIsMounted(false);
      setIsEntering(false);
      setIsClosing(false);
      setIsHidden(false);
      return undefined;
    }

    showTimerRef.current = window.setTimeout(() => {
      setIsMounted(true);

      // Wait one frame so the initial transform is painted
      rafRef.current = requestAnimationFrame(() => {
        setIsEntering(true);
      });
    }, 2000);

    return () => {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
      }
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isEnabled]);

  const handleClose = () => {
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setIsHidden(true);
    }, 280);
  };

  const handleOpenSettings = () => {
    onOpenSettings?.();
    handleClose();
  };

  if (!isEnabled || !isMounted || isHidden) {
    return null;
  }

  return (
    <div
      className={`pointer-events-auto w-[320px] overflow-hidden rounded-3xl
        border border-[color:var(--ui-border)]
        bg-[color:var(--ui-surface)]
        shadow-xl backdrop-blur-xl
        transition-[transform,opacity] duration-300
        ${
          isClosing
            ? 'translate-x-[120%] opacity-0'
            : isEntering
              ? 'translate-x-0 opacity-100'
              : 'translate-x-[120%] opacity-0'
        }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      {/* Header with gradient background */}
      <div className="relative h-[140px] overflow-hidden bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10">
        {/* Animated background blobs */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 h-32 w-32 rounded-full bg-blue-400 blur-3xl animate-pulse" />
          <div
            className="absolute bottom-4 right-4 h-32 w-32 rounded-full bg-purple-400 blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          />
        </div>

        <IconButton
          onClick={handleClose}
          aria-label="Close wallpaper notice"
          className="absolute right-3 top-3 bg-[color:var(--ui-surface-muted)]/70 backdrop-blur"
        >
        <LuX size={14} />
        </IconButton>
      </div>

      {/* Content section */}
      <div className="border-t border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-6 py-6">
        <h3 className="mb-2 text-base font-semibold text-[color:var(--ui-text)]">
          Personalize Your Space
        </h3>
        <p className="mb-5 text-sm leading-relaxed text-[color:var(--ui-text-muted)]">
          Make Nook yours with a custom wallpaper or color that reflects your style
        </p>

        <button
          type="button"
          onClick={handleOpenSettings}
          className="group w-full rounded-xl bg-[color:var(--ui-accent)] px-5 py-3
            text-sm font-semibold text-[color:var(--ui-accent-contrast)]
            shadow-sm transition hover:brightness-95 active:scale-[0.98]"
        >
          <span className="relative flex items-center justify-center gap-2">
            Open Settings
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
};
