import React from 'react';

export const NewTabPage: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[color:var(--ui-surface-subtle)] text-[color:var(--ui-text)] backdrop-blur-md">
      <div className="text-center">

        <div className="text-lg font-medium text-[color:var(--ui-text)]">
          Ready when you are
        </div>

        <div className="mt-2 text-md text-[color:var(--ui-text-muted)]">
          Start typing to search or enter a website
        </div>

        <div className="mt-6 text-xs text-[color:var(--ui-text-muted)]">
          Press <span className="px-1.5 py-0.5 rounded bg-[color:var(--ui-surface)] text-[color:var(--ui-text)]">Ctrl + L</span>
        </div>

      </div>
    </div>
  );
};
