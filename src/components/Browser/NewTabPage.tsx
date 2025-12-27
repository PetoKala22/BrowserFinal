import React from 'react';

export const NewTabPage: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <div className="text-center">

        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Ready when you are
        </div>

        <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
          Start typing to search or enter a website
        </div>

        <div className="mt-6 text-[11px] text-neutral-400 dark:text-neutral-600">
          Press <span className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">Ctrl + L</span>
        </div>

      </div>
    </div>
  );
};
