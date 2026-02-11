import React from 'react';
import { SettingsGroup } from './SettingsGroup';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { PermissionType } from '@/lib/types';

interface PrivacySettingsSectionProps {
  adBlockEnabled: boolean;
  onAdBlockEnabledChange: (enabled: boolean) => void;
  permissions?: Record<string, { type: PermissionType; allowed: boolean; ask: boolean }[]>;
  onPermissionsChange?: (permissions: Record<string, { type: PermissionType; allowed: boolean; ask: boolean }[]>) => void;
}

const getPermissionDisplayName = (type: PermissionType): string => {
  switch (type) {
    case PermissionType.GEOLOCATION:
      return 'Location';
    case PermissionType.MICROPHONE:
      return 'Microphone';
    case PermissionType.CAMERA:
      return 'Camera';
    case PermissionType.NOTIFICATIONS:
      return 'Notifications';
    case PermissionType.CLIPBOARD_READ:
      return 'Clipboard (read)';
    case PermissionType.CLIPBOARD_WRITE:
      return 'Clipboard (write)';
    default:
      return type;
  }
};

export const PrivacySettingsSection: React.FC<PrivacySettingsSectionProps> = ({
  adBlockEnabled,
  onAdBlockEnabledChange,
  permissions = {},
  onPermissionsChange
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

    <SettingsGroup
      title="Permissions"
      description="Manage website permissions and access."
    >
      <div className="space-y-3">
        {Object.entries(permissions).map(([origin, perms]) => (
          <div key={origin} className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-4">
            <div className="text-sm font-medium text-[color:var(--ui-text)] mb-3">
              {origin}
            </div>
            <div className="space-y-2">
              {(perms as { type: PermissionType; allowed: boolean; ask: boolean }[]).map((perm) => (
                <div key={perm.type} className="flex items-center justify-between">
                  <div className="text-sm text-[color:var(--ui-text)]">
                    {getPermissionDisplayName(perm.type)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-[color:var(--ui-text-muted)]">
                      {perm.allowed ? 'Allowed' : 'Blocked'}
                    </span>
                    <ToggleSwitch
                      checked={perm.allowed}
                      onChange={(allowed) => {
                        const newPerms = { ...permissions };
                        newPerms[origin] = newPerms[origin].map(p =>
                          p.type === perm.type ? { ...p, allowed } : p
                        );
                        onPermissionsChange?.(newPerms);
                      }}
                      ariaLabel={`Toggle ${getPermissionDisplayName(perm.type)} for ${origin}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(permissions).length === 0 && (
          <div className="text-sm text-[color:var(--ui-text-muted)] text-center py-4">
            No permissions granted yet
          </div>
        )}
      </div>
    </SettingsGroup>
  </div>
);
