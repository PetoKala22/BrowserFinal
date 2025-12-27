import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ children, className, active, ...props }) => {
  return (
    <button 
      className={`
        p-1.5 rounded-lg transition-all duration-200 
        hover:bg-neutral-200/70 dark:hover:bg-neutral-700/50 
        active:scale-95 disabled:opacity-30 disabled:active:scale-100
        text-neutral-700 dark:text-neutral-200
        electron-no-drag
        ${active ? 'bg-neutral-200/80 text-neutral-900 dark:bg-neutral-700/60 dark:text-neutral-100' : ''}
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
