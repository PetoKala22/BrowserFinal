import React, { useEffect, useState } from 'react';

export const ClockWidget: React.FC = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    let raf: number;
    const update = () => {
      setTick(t => t + 1);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  const now = new Date();

  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 200 200"
        className="h-full max-h-[120px] aspect-square"
      >
        <circle
          cx="100"
          cy="100"
          r="98"
          fill="none"
          stroke="var(--ui-border)"
          strokeWidth="2"
        />

        <circle
          cx="100"
          cy="100"
          r="96"
          fill="var(--ui-surface)"
        />

        {Array.from({ length: 60 }).map((_, i) => (
          <line
            key={`m-${i}`}
            x1="100"
            y1="8"
            x2="100"
            y2="12"
            stroke="var(--ui-newtab-text-muted)"
            strokeWidth="1"
            transform={`rotate(${i * 6} 100 100)`}
          />
        ))}

        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="100"
            y1="8"
            x2="100"
            y2="18"
            stroke="var(--ui-newtab-text)"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${i * 30} 100 100)`}
          />
        ))}

        <line
          x1="100"
          y1="100"
          x2="100"
          y2="58"
          stroke="var(--ui-newtab-text)"
          strokeWidth="6"
          strokeLinecap="round"
          transform={`rotate(${hours * 30} 100 100)`}
        />

        <line
          x1="100"
          y1="100"
          x2="100"
          y2="42"
          stroke="var(--ui-newtab-text)"
          strokeWidth="4"
          strokeLinecap="round"
          transform={`rotate(${minutes * 6} 100 100)`}
        />

        <line
          x1="100"
          y1="112"
          x2="100"
          y2="30"
          stroke="var(--ui-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${seconds * 6} 100 100)`}
        />

        <circle cx="100" cy="100" r="4" fill="var(--ui-newtab-text)" />
      </svg>
    </div>
  );
};
