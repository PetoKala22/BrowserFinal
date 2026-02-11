import React, { useEffect, useState } from 'react';

const NOTES_STORAGE_PREFIX = 'newtab-widget-notes';

interface NotesWidgetProps {
  widgetId: string;
}

export const NotesWidget: React.FC<NotesWidgetProps> = ({ widgetId }) => {
  const storageKey = `${NOTES_STORAGE_PREFIX}-${widgetId}`;
  const [value, setValue] = useState(() => localStorage.getItem(storageKey) ?? '');

  useEffect(() => {
    localStorage.setItem(storageKey, value);
  }, [storageKey, value]);

  return (
    <textarea
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Write down a few notes..."
      className="h-full w-full resize-none rounded-3xl backdrop-blur-lg p-4 border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] p-3 text-sm text-[color:var(--ui-text)] outline-none focus:ring-2 focus:ring-[color:var(--ui-ring)]"
    />
  );
};
