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
      className={`relative inline-flex h-5 w-10 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-[color:var(--ui-accent)]' : 'bg-[color:var(--ui-border)]'
      }`}
      aria-pressed={checked}
      aria-label={ariaLabel}
    >
      <div
        className={`absolute left-0.5 top-0.5 h-4 w-6 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-3' : 'translate-x-0'
        }`}
      />
    </button>
  );
};
