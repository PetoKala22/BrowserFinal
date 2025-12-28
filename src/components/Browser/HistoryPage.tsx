import React from 'react';

export const HistoryPage: React.FC = () => {
  return (
    <div className="w-full h-full text-[color:var(--ui-text)] flex flex-col bg-transparent">
      <div className="flex-1 p-8">
        <div className="h-full rounded-2xl bg-[color:var(--ui-surface)] backdrop-blur-xl p-6">
          <div className="text-sm font-medium">No history yet</div>
          <div className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
            Visited pages will appear here as you browse.
          </div>
        </div>
      </div>
    </div>
  );
};
