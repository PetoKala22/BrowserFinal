import React from 'react';

export const NewTabPage: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center text-[color:var(--ui-newtab-text)]">
      {/* Background with visual detail (required for blur) */}
      <div className="absolute inset-0 bg-transparent" />

      <div className="relative text-center" style={{ textShadow: 'var(--ui-newtab-text-shadow)' }}>
        <div className="text-lg font-medium">Ready when you are</div>

        <div className="mt-2 text-md text-[color:var(--ui-newtab-text-muted)]">
          Start typing to search or enter a website
        </div>

        <div className="mt-4 text-xs text-[color:var(--ui-newtab-text-muted)]">
          Press{' '}
          <span
            className="
              inline-flex items-center
              px-2 py-0.5
              rounded-md
              bg-[color:var(--ui-surface)]
              backdrop-blur-md
              text-[color:var(--ui-newtab-text)]
              shadow-sm
            "
          >
            Ctrl + L
          </span>
        </div>
      </div>
    </div>
  );
};
