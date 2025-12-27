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
        <div className="w-[360px] rounded-2xl border border-neutral-200/70 bg-white p-5 text-neutral-800 shadow-xl dark:border-neutral-800/70 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="text-sm font-semibold">Unsaved changes</div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            You have unsaved changes. Save before leaving?
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onStay}
              className="rounded-full px-3 py-1 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Stay
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="rounded-full px-3 py-1 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={onSaveAndContinue}
              className="rounded-full px-3 py-1 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
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
