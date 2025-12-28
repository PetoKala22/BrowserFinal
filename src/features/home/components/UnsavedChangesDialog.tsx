import React, { memo } from 'react';

interface UnsavedChangesDialogProps {
  onStay: () => void;
  onDiscard: () => void;
  onSaveAndContinue: () => void;
}

export const UnsavedChangesDialog = memo<UnsavedChangesDialogProps>(
  ({ onStay, onDiscard, onSaveAndContinue }) => {
    return (
      <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-[360px] rounded-2xl bg-[color:var(--ui-surface-strong)] p-5 text-[color:var(--ui-text)] shadow-xl backdrop-blur-xl">
          <div className="text-sm font-semibold">Unsaved changes</div>
          <div className="mt-2 text-xs text-[color:var(--ui-text-muted)]">
            You have unsaved changes. Save before leaving?
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onStay}
              className="rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-hover)]"
            >
              Stay
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-hover)]"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={onSaveAndContinue}
              className="rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--ui-accent-contrast)] bg-[color:var(--ui-accent)] hover:brightness-95"
            >
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }
);

UnsavedChangesDialog.displayName = 'UnsavedChangesDialog';
