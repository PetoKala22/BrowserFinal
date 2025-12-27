import React, { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

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
    <div className="flex items-center h-full electron-no-drag">
      <button
        onClick={handleMinimize}
        className="h-8 w-10 flex items-center justify-center hover:bg-neutral-200/70 dark:hover:bg-neutral-700/60 text-neutral-700 dark:text-neutral-300 transition-colors rounded-sm group"
        aria-label="Minimize window"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={handleToggleMaximize}
        className="h-8 w-10 flex items-center justify-center hover:bg-neutral-200/70 dark:hover:bg-neutral-700/60 text-neutral-700 dark:text-neutral-300 transition-colors rounded-sm group"
        aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
      >
        <Square size={14} />
      </button>
      <button
        onClick={handleClose}
        className="h-8 w-10 flex items-center justify-center hover:bg-red-500/80 dark:hover:bg-neutral-700/80 dark:hover:text-neutral-100 text-neutral-700 dark:text-neutral-300 transition-colors rounded-sm group"
        aria-label="Close window"
      >
        <X size={16} />
      </button>
    </div>
  );
};
