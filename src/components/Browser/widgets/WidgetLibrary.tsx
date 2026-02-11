import React, { useEffect, useRef, useState } from 'react';
import { MdAdd } from 'react-icons/md';
import type { WidgetDefinition, WidgetType } from './widgetTypes';

interface WidgetLibraryProps {
  availableWidgets: WidgetDefinition[];
  onAddWidget: (type: WidgetType) => void;
  onClearWidgets: () => void;
}

export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({
  availableWidgets,
  onAddWidget,
  onClearWidgets
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setConfirmClear(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  return (
    <>
      <div className="absolute bottom-6 left-6 z-20">
        <button
          type="button"
          ref={buttonRef}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-2 text-xs tracking-[0.2em] text-[color:var(--ui-text)] shadow-lg backdrop-blur-xl shadow-black/5 transition hover:bg-[color:var(--ui-hover)]"
        >
          <MdAdd size={16} />
          Widget
        </button>
      </div>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute bottom-6 left-6 z-30 w-[min(520px,calc(100%-3rem))] rounded-3xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="text-[0.65rem] uppercase tracking-[0.35em] text-[color:var(--ui-text-subtle)]">
              Widget Library
            </div>
            <button
              type="button"
              onClick={() => {
                if (!onClearWidgets) return;
                setConfirmClear(true);
              }}
              className="text-[0.6rem] uppercase tracking-[0.25em] text-[color:var(--ui-text-subtle)] transition hover:text-[color:var(--ui-text)]"
            >
              Clear all
            </button>
          </div>
          {confirmClear && (
            <div className="px-4 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-strong)] px-3 py-2 text-xs text-[color:var(--ui-text)]">
                <span>Remove all widgets?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="rounded-full px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-[color:var(--ui-text-muted)] transition hover:bg-[color:var(--ui-hover)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClearWidgets();
                      setConfirmClear(false);
                      setIsOpen(false);
                    }}
                    className="rounded-full bg-[color:var(--ui-accent)] px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-[color:var(--ui-accent-contrast)] transition hover:brightness-95"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="p-3 space-y-2">
            {availableWidgets.map((widget) => (
              <button
                key={widget.type}
                type="button"
                onClick={() => {
                  onAddWidget(widget.type);
                  setIsOpen(false);
                }}
                className="w-full rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-[color:var(--ui-border)] hover:bg-[color:var(--ui-hover)]"
              >
                <div className="text-sm text-[color:var(--ui-text)]">
                  {widget.title}
                </div>
                <div className="text-xs text-[color:var(--ui-text-muted)]">
                  {widget.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
