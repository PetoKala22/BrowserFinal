import React from 'react';
import { SettingsGroup } from './SettingsGroup';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

interface PrivacySettingsSectionProps {
  adBlockEnabled: boolean;
  onAdBlockEnabledChange: (enabled: boolean) => void;
}

export const PrivacySettingsSection: React.FC<PrivacySettingsSectionProps> = ({
  adBlockEnabled,
  onAdBlockEnabledChange
}) => (
  <div className="space-y-8">
    <SettingsGroup
      title="Ad blocking"
      description="Blocks ads and trackers across all tabs."
    >
      <div className="flex items-center justify-between rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
        <div>
          <div className="text-sm font-medium text-[color:var(--ui-text)]">
            Enable ad blocker
          </div>
          <div className="text-xs text-[color:var(--ui-text-muted)]">
            Uses the built-in filter list.
          </div>
        </div>
        <ToggleSwitch
          checked={adBlockEnabled}
          onChange={onAdBlockEnabledChange}
          ariaLabel="Toggle ad blocker"
        />
      </div>
    </SettingsGroup>
  </div>
);
