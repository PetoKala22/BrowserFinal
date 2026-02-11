import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, ariaLabel }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-all duration-200 ease-out ${
        checked ? 'bg-green-500 shadow-md shadow-green-500/20' : 'bg-[color:var(--ui-border)]'
      }`}
      aria-pressed={checked}
      aria-label={ariaLabel}
    >
      <div
        className={`absolute top-0.5 left-0.5 h-5 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
};
