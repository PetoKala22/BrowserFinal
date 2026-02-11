import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ children, className, active, ...props }) => {
  return (
    <button 
      className={`
        group inline-flex items-center justify-center
        p-2 rounded-xl
        transition-all duration-150 ease-out
        hover:bg-[color:var(--ui-hover)]
        disabled:opacity-30 disabled:pointer-events-none
        text-[color:var(--ui-text)]
        electron-no-drag
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--ui-ring)]
        ${active ? 'bg-[color:var(--ui-active)] text-[color:var(--ui-text)]' : ''}
        ${className || ''}
      `}
      {...props}
    >
      <span className="transition-transform duration-150 ease-out">
        {children}
      </span>
    </button>
  );
};
