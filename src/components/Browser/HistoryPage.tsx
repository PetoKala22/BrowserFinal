import React from 'react';

export const HistoryPage: React.FC = () => {
  return (
    <div className="w-full h-full text-neutral-800 dark:text-neutral-100 flex flex-col bg-transparent">
      <div className="flex-1 p-8">
        <div className="h-full rounded-2xl border border-white/30 dark:border-neutral-800/70 bg-white/60 dark:bg-neutral-950/60 backdrop-blur-xl p-6">
          <div className="text-sm font-medium">No history yet</div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Visited pages will appear here as you browse.
          </div>
        </div>
      </div>
    </div>
  );
};
