import React from 'react';

export const NewTabPage: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center text-[color:var(--ui-newtab-text)] relative">
      {/* Background with visual detail (required for blur) */}
      <div className="absolute inset-0 bg-transparent" />
    </div>
  );
};
