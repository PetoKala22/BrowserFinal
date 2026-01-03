import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_DURATION = 25 * 60;
const MIN_MINUTES = 1;
const MAX_MINUTES = 60;

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const FocusWidget: React.FC = () => {
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [remaining, setRemaining] = useState(DEFAULT_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  const endTimeRef = useRef<number | null>(null);
  const dialRef = useRef<HTMLDivElement | null>(null);
  const lastMinuteRef = useRef(Math.round(DEFAULT_DURATION / 60));
  const hapticAudioRef = useRef<HTMLAudioElement | null>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastHapticAtRef = useRef(0);
  const hapticSoundUrl = useMemo(
    () => new URL('../../../../assets/Haptic.wav', import.meta.url).toString(),
    []
  );
  const alarmSoundUrl = useMemo(
    () => new URL('../../../assets/Alarm.wav', import.meta.url).toString(),
    []
  );

  const playHaptic = useCallback((volume = 0.08) => {
    const audio = hapticAudioRef.current;
    if (!audio) return;
    const now = Date.now();
    if (now - lastHapticAtRef.current < 40) return;
    lastHapticAtRef.current = now;
    audio.playbackRate = 0.92 + Math.random() * 0.18;
    audio.volume = volume;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    const audio = new Audio(hapticSoundUrl);
    audio.volume = 0.08;
    audio.preload = 'auto';
    hapticAudioRef.current = audio;
    return () => {
      audio.pause();
      hapticAudioRef.current = null;
    };
  }, [hapticSoundUrl]);

  const stopAlarm = useCallback(() => {
    const audio = alarmAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsAlarmPlaying(false);
  }, []);

  const startAlarm = useCallback(() => {
    const audio = alarmAudioRef.current;
    if (!audio || isAlarmPlaying) return;
    audio.currentTime = 0;
    audio.volume = 1;
    void audio.play().catch(() => undefined);
    setIsAlarmPlaying(true);
  }, [isAlarmPlaying]);

  useEffect(() => {
    const audio = new Audio(alarmSoundUrl);
    audio.volume = 1;
    audio.preload = 'auto';
    audio.loop = true;
    alarmAudioRef.current = audio;
    return () => {
      audio.pause();
      alarmAudioRef.current = null;
    };
  }, [alarmSoundUrl]);

  /* ---------------- Timer (accurate, no drift) ---------------- */

  useEffect(() => {
    if (!isRunning || endTimeRef.current === null) return;

    const tick = () => {
      const secondsLeft = Math.max(
        0,
        Math.round((endTimeRef.current! - Date.now()) / 1000)
      );

      setRemaining(secondsLeft);

      if (secondsLeft === 0) {
        setIsRunning(false);
        endTimeRef.current = null;
        startAlarm();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, startAlarm]);

  const startTimer = () => {
    stopAlarm();
    const seconds = remaining > 0 ? remaining : duration;
    endTimeRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setIsRunning(true);
  };

  const pauseTimer = () => {
    stopAlarm();
    if (!isRunning || endTimeRef.current === null) return;

    const secondsLeft = Math.max(
      0,
      Math.round((endTimeRef.current - Date.now()) / 1000)
    );

    setRemaining(secondsLeft);
    endTimeRef.current = null;
    setIsRunning(false);
  };

  const resetTimer = () => {
    stopAlarm();
    endTimeRef.current = null;
    setIsRunning(false);
    setRemaining(duration);
  };

  /* ---------------- Progress ---------------- */

  const progress = useMemo(() => {
    if (duration <= 0) return 0;
    return 1 - remaining / duration;
  }, [duration, remaining]);

  /* ---------------- Dial interaction (snapped) ---------------- */

  const updateFromPointer = (clientX: number, clientY: number) => {
    const rect = dialRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const angle =
      (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90;

    const normalized = (angle + 360) % 360;

    // 6° per minute → snap like a clock
    const snappedMinutes =
      Math.round(normalized / 6) || 60;

    const minutes = Math.max(
      MIN_MINUTES,
      Math.min(MAX_MINUTES, snappedMinutes)
    );

    const nextDuration = minutes * 60;

    setDuration(nextDuration);
    setRemaining(nextDuration);
    setIsRunning(false);
    endTimeRef.current = null;
    stopAlarm();

    if (minutes !== lastMinuteRef.current) {
      lastMinuteRef.current = minutes;
      playHaptic();
    }
  };

  const handleDialPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isRunning) return;
    event.preventDefault();

    updateFromPointer(event.clientX, event.clientY);

    const handleMove = (e: PointerEvent) => {
      updateFromPointer(e.clientX, e.clientY);
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  /* ---------------- Dial visuals ---------------- */

  const durationMinutes = Math.max(1, Math.round(duration / 60));
  const setAngle = (durationMinutes / 60) * 360;
  const circumference = 2 * Math.PI * 52;
  useEffect(() => {
    lastMinuteRef.current = durationMinutes;
  }, [durationMinutes]);

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const isMajor = i % 5 === 0;
    const angle = (i / 60) * 360;

    return (
      <line
        key={i}
        x1="60"
        y1={isMajor ? 4 : 8}
        x2="60"
        y2={isMajor ? 14 : 12}
        stroke="var(--ui-border)"
        strokeWidth={isMajor ? 2 : 1}
        transform={`rotate(${angle} 60 60)`}
        opacity={isMajor ? 0.9 : 0.5}
      />
    );
  });

  /* ---------------- Render ---------------- */

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] p-4 text-[color:var(--ui-text)]">
      <div className="space-y-3">
        <div>
          <div className="text-base font-semibold">Focus timer</div>
          <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
            One task. One timer. Stay on it.
          </p>
        </div>

        <div className="flex items-center gap-4 widget-interactive">
          <div
            ref={dialRef}
            onPointerDown={handleDialPointerDown}
            className="relative h-24 w-24 cursor-pointer select-none"
          >
            <svg viewBox="0 0 120 120" className="h-full w-full">
              <g>{ticks}</g>

              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--ui-border)"
                strokeWidth="8"
              />

              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--ui-accent)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                transform="rotate(-90 60 60)"
              />

              <g transform={`rotate(${setAngle} 60 60)`}>
                <circle cx="60" cy="8" r="6" fill="var(--ui-text)" />
              </g>
            </svg>

            <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold">
              {formatTime(remaining)}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs text-[color:var(--ui-text-muted)]">
            <div className="uppercase tracking-[0.2em] text-[color:var(--ui-text-subtle)]">
              Session
            </div>
            <div className="text-sm font-semibold text-[color:var(--ui-text)]">
              {durationMinutes} min
            </div>
            <div>Rotate the dial to set your focus time.</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="text-[color:var(--ui-text-subtle)] uppercase tracking-[0.2em]">
          Keep it simple
        </div>

        <div className="flex items-center gap-2 widget-interactive">
          <button
            onClick={
              isAlarmPlaying
                ? stopAlarm
                : isRunning
                  ? pauseTimer
                  : startTimer
            }
            className="rounded-full bg-[color:var(--ui-accent)] px-4 py-2 text-[color:var(--ui-accent-contrast)] shadow-sm transition hover:brightness-95"
          >
            {isAlarmPlaying
              ? 'Stop'
              : isRunning
                ? 'Pause'
                : remaining === 0
                  ? 'Restart'
                  : 'Start'}
          </button>

          <button
            onClick={resetTimer}
            className="rounded-full border border-[color:var(--ui-border)] px-3 py-2 text-[color:var(--ui-text)] transition hover:bg-[color:var(--ui-hover)]"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
