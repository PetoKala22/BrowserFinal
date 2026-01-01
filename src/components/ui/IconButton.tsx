import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ children, className, active, ...props }) => {
  return (
    <button 
      className={`
        group inline-flex items-center justify-center
        p-1.5 rounded-lg
        transition-[background-color,color] duration-150 ease-out
        hover:bg-[color:var(--ui-hover)]
        disabled:opacity-30 disabled:pointer-events-none
        text-[color:var(--ui-text)]
        electron-no-drag
        ${active ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)]' : ''}
        ${className || ''}
      `}
      {...props}
    >
      <span className="transition-transform duration-150 ease-out group-active:scale-[0.90]">
        {children}
      </span>
    </button>
  );
};
