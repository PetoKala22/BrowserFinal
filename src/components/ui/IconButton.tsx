import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ children, className, active, ...props }) => {
  return (
    <button 
      className={`
        p-1.5 rounded-lg transition-all duration-200 
        hover:bg-white/60 dark:hover:bg-neutral-800/60 
        active:scale-95 disabled:opacity-30 disabled:active:scale-100
        text-neutral-800 dark:text-neutral-100
        electron-no-drag
        ${active ? 'bg-white/70 text-neutral-900 dark:bg-neutral-800/70 dark:text-neutral-100' : ''}
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
