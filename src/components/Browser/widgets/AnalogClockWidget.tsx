import React, { useEffect, useState } from 'react';

interface ClockWidgetProps {
  widgetId: string;
}

export const AnalogClockWidget: React.FC<ClockWidgetProps> = ({ widgetId }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 16); // smooth animation
    return () => clearInterval(id);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;
  const milliseconds = time.getMilliseconds();

  const secondDeg = (seconds + milliseconds / 1000) * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  return (
    <div
      id={widgetId}
      className="flex h-full w-full items-center justify-center rounded-3xl backdrop-blur-xl border border-[color:var(--ui-border)]"
    >
      {/* Clock face */}
      <div className="relative h-full w-full rounded-3xl bg-[color:var(--ui-surface-subtle)]">
        
        {/* Hour markers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          const isMainHour = i % 3 === 0;
          const radius = 45;

          const x = 50 + radius * Math.sin((angle * Math.PI) / 180);
          const y = 50 - radius * Math.cos((angle * Math.PI) / 180);

          return (
            <span
              key={i}
              className={`absolute bg-[color:var(--ui-text)] ${
                isMainHour
                  ? 'w-[3px] h-[8%] opacity-100'
                  : 'w-[2px] h-[5%] opacity-60'
              }`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                transformOrigin: '50% 50%',
              }}
            />
          );
        })}

        {/* Numbers */}
        <span className="absolute left-1/2 top-[12%] -translate-x-1/2 text-2xl font-light text-[color:var(--ui-text)]">12</span>
        <span className="absolute right-[12%] top-1/2 -translate-y-1/2 text-2xl font-light text-[color:var(--ui-text)]">3</span>
        <span className="absolute bottom-[12%] left-1/2 -translate-x-1/2 text-2xl font-light text-[color:var(--ui-text)]">6</span>
        <span className="absolute left-[12%] top-1/2 -translate-y-1/2 text-2xl font-light text-[color:var(--ui-text)]">9</span>

        {/* Hour hand */}
        <span
          className="absolute left-1/2 top-1/2 w-[4px] h-[26%] rounded-full bg-[color:var(--ui-text)]"
          style={{
            transformOrigin: '50% 100%',
            transform: `translate(-50%, -100%) rotate(${hourDeg}deg)`,
          }}
        />

        {/* Minute hand */}
        <span
          className="absolute left-1/2 top-1/2 w-[3px] h-[36%] rounded-full bg-[color:var(--ui-text)] opacity-80"
          style={{
            transformOrigin: '50% 100%',
            transform: `translate(-50%, -100%) rotate(${minuteDeg}deg)`,
          }}
        />

        {/* Second hand */}
        <span
          className="absolute left-1/2 top-1/2 w-[2px] h-[40%] bg-red-500"
          style={{
            transformOrigin: '50% 100%',
            transform: `translate(-50%, -100%) rotate(${secondDeg}deg)`,
          }}
        />

        {/* Center cap */}
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--ui-text)]" />
      </div>
    </div>
  );
};
