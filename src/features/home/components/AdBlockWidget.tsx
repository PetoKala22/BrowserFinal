import React from 'react';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

interface AdBlockWidgetProps {
  adBlockEnabled: boolean;
  onToggleAdBlock: () => void;
}

export const AdBlockWidget: React.FC<AdBlockWidgetProps> = ({
  adBlockEnabled,
  onToggleAdBlock
}) => (
  <div className="w-56 pointer-events-auto">
    <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-strong)] backdrop-blur-xl shadow-lg px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-[color:var(--ui-text-subtle)]">
            Protection
          </div>
          <div className="text-sm font-medium text-[color:var(--ui-text)]">
            Ad blocker
          </div>
        </div>
        <ToggleSwitch
          checked={adBlockEnabled}
          onChange={() => onToggleAdBlock()}
          ariaLabel="Toggle ad blocker"
          size="sm"
        />
      </div>
      <div className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
        Turn this off if a site looks broken.
      </div>
    </div>
  </div>
);
