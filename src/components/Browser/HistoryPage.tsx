import React from 'react';

export const HistoryPage: React.FC = () => {
  return (
    <div className="w-full h-full text-neutral-700 dark:text-neutral-200 flex flex-col bg-neutral-100 dark:bg-neutral-900">
      <div className="flex-1 p-8">
        <div className="h-full rounded-2xl p-4">
          <div className="text-sm font-medium">No history yet</div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Visited pages will appear here as you browse.
          </div>
        </div>
      </div>
    </div>
  );
};
