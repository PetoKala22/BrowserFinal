import React, { useEffect, useState } from 'react';
import { LuMinus, LuSquare, LuX } from 'react-icons/lu';

export const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    const fetchState = async () => {
      if (!isElectron || !window.electronAPI?.isMaximized) return;
      try {
        const maximized = await window.electronAPI.isMaximized();
        setIsMaximized(maximized);
      } catch {
        setIsMaximized(false);
      }
    };

    fetchState();
  }, [isElectron]);

  const handleMinimize = () => {
    window.electronAPI?.minimize?.();
  };

  const handleToggleMaximize = async () => {
    window.electronAPI?.toggleMaximize?.();
    if (isElectron && window.electronAPI?.isMaximized) {
      try {
        const maximized = await window.electronAPI.isMaximized();
        setIsMaximized(maximized);
      } catch {
        setIsMaximized((prev) => !prev);
      }
    } else {
      setIsMaximized((prev) => !prev);
    }
  };

  const handleClose = () => {
    if (isElectron) {
      window.electronAPI?.close?.();
    } else {
      window.close();
    }
  };

  return (
    <div className="flex items-start electron-no-drag">
      <button
        onClick={handleMinimize}
        className="h-8 w-10 flex items-center justify-center hover:bg-[color:var(--ui-hover)] text-[color:var(--ui-text)] transition-colors group"
        aria-label="Minimize window"
      >
        <LuMinus size={16} />
      </button>
      <button
        onClick={handleToggleMaximize}
        className="h-8 w-10 flex items-center justify-center hover:bg-[color:var(--ui-hover)] text-[color:var(--ui-text)] transition-colors group"
        aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
      >
        <LuSquare size={14} />
      </button>
      <button
        onClick={handleClose}
        className="h-8 w-10 flex items-center justify-center hover:bg-red-500 hover:text-[color:var(--ui-accent-contrast)] text-[color:var(--ui-text)] transition-colors group"
        aria-label="Close window"
      >
        <LuX size={16} />
      </button>
    </div>
  );
};
