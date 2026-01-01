import React from 'react';

interface SettingsGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  children
}) => (
  <div className="space-y-3">
    <div>
      <div className="text-xs uppercase tracking-wide text-[color:var(--ui-text-subtle)]">
        {title}
      </div>
      {description && (
        <div className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
          {description}
        </div>
      )}
    </div>
    {children}
  </div>
);
