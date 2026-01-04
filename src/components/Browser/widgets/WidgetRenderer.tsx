import React from 'react';
import { LuMinus } from 'react-icons/lu';
import { widgetDefinitions } from './widgetRegistry';
import { WidgetInstance } from './widgetTypes';

interface WidgetRendererProps {
  widget: WidgetInstance;
  onRemove: (id: string) => void;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, onRemove }) => {
  const definition = widgetDefinitions[widget.type];

  if (!definition) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] text-sm text-[color:var(--ui-text-muted)]">
        Missing widget: {widget.type}
      </div>
    );
  }

  return (
    <div className="group relative flex h-full w-full flex-col overflow-visible rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] shadow-sm backdrop-blur-xl">
      <button
        type="button"
        onClick={() => onRemove(widget.id)}
        aria-label="Remove widget"
        className="widget-remove-button absolute -right-2.5 -top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] text-[color:var(--ui-text)] shadow-md opacity-0 transition hover:bg-[color:var(--ui-hover)] group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
      >
        <LuMinus size={14} />
      </button>
      <div className={`flex-1 ${widget.type === 'weather' || widget.type === 'focus' || widget.type === 'notes' ? 'p-0' : 'p-4'}`}>
        {definition.render(widget)}
      </div>
    </div>
  );
};
