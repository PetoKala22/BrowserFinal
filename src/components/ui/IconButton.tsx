import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ children, className, active, ...props }) => {
  return (
    <button 
      className={`
        p-1.5 rounded-lg transition-all duration-200 
        hover:bg-[color:var(--ui-hover)] 
        active:scale-95 disabled:opacity-30 disabled:active:scale-100
        text-[color:var(--ui-text)]
        electron-no-drag
        ${active ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)]' : ''}
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
