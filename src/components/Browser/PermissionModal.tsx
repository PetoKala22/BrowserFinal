import React from 'react';
import { Modal } from '../ui/Modal';
import { PermissionRequest, PermissionType } from '@/lib/types';

interface PermissionModalProps {
  request: PermissionRequest | null;
  onAllow: () => void;
  onDeny: () => void;
  onClose: () => void;
}

const getPermissionDescription = (type: PermissionType): string => {
  switch (type) {
    case PermissionType.GEOLOCATION:
      return 'access your location';
    case PermissionType.MICROPHONE:
      return 'access your microphone';
    case PermissionType.CAMERA:
      return 'access your camera';
    case PermissionType.NOTIFICATIONS:
      return 'show notifications';
    case PermissionType.CLIPBOARD_READ:
      return 'read from your clipboard';
    case PermissionType.CLIPBOARD_WRITE:
      return 'write to your clipboard';
    default:
      return 'access this feature';
  }
};

const getPermissionIcon = (type: PermissionType): string => {
  switch (type) {
    case PermissionType.GEOLOCATION:
      return '📍';
    case PermissionType.MICROPHONE:
      return '🎤';
    case PermissionType.CAMERA:
      return '📷';
    case PermissionType.NOTIFICATIONS:
      return '🔔';
    case PermissionType.CLIPBOARD_READ:
    case PermissionType.CLIPBOARD_WRITE:
      return '📋';
    default:
      return '🔒';
  }
};

export const PermissionModal: React.FC<PermissionModalProps> = ({
  request,
  onAllow,
  onDeny,
  onClose
}) => {
  if (!request) return null;

  const { type, origin } = request;
  const description = getPermissionDescription(type);
  const icon = getPermissionIcon(type);

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">{icon}</span>
          <h2 className="text-lg font-semibold text-[color:var(--ui-text)]">
            Permission Request
          </h2>
        </div>

        <p className="text-sm text-[color:var(--ui-text)] mb-6">
          <strong>{origin}</strong> wants to {description}.
        </p>

        <div className="flex space-x-3">
          <button
            onClick={onDeny}
            className="flex-1 px-4 py-2 text-sm font-medium text-[color:var(--ui-text)] bg-[color:var(--ui-surface)] border border-[color:var(--ui-border)] rounded-md hover:bg-[color:var(--ui-hover)] transition-colors"
          >
            Deny
          </button>
          <button
            onClick={onAllow}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Allow
          </button>
        </div>
      </div>
    </Modal>
  );
};