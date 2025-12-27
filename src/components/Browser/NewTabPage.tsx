import React from 'react';

export const NewTabPage: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent text-neutral-900 dark:text-neutral-100">
      <div className="text-center rounded-2xl border border-white/30 dark:border-neutral-800/70 bg-white/60 dark:bg-neutral-950/60 backdrop-blur-xl px-8 py-6">

        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Ready when you are
        </div>

        <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
          Start typing to search or enter a website
        </div>

        <div className="mt-6 text-[11px] text-neutral-500 dark:text-neutral-500">
          Press <span className="px-1.5 py-0.5 rounded bg-white/70 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-200">Ctrl + L</span>
        </div>

      </div>
    </div>
  );
};
