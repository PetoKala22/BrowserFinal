import React, { useMemo } from 'react';
import { useDevTime } from '@/lib/devPanelState';

const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
  parts.find((part) => part.type === type)?.value ?? '';

export const DigitalClockWidget: React.FC = () => {
  const now = useDevTime();

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      }),
    []
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }),
    []
  );

  const parts = timeFormatter.formatToParts(now);
  const hour = getPart(parts, 'hour');
  const minute = getPart(parts, 'minute');
  const second = getPart(parts, 'second');
  const dayPeriod = getPart(parts, 'dayPeriod');

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[color:var(--ui-text)] backdrop-blur-lg rounded-3xl border border-[color:var(--ui-border)]">
      <div className="flex items-baseline">
        <div className="text-4xl font-light tracking-tight">
          {hour}:{minute}
        </div>
        {dayPeriod ? (
          <div className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--ui-text-muted)]">
            {dayPeriod}
          </div>
        ) : null}
      </div>
      <div className="text-sm text-[color:var(--ui-text-muted)]">
        {dateFormatter.format(now)}
      </div>
    </div>
  );
};
