import React from 'react';
import ReactGridLayout, { Layout } from 'react-grid-layout';
import { WidthProvider } from 'react-grid-layout';
import { WidgetRenderer } from './WidgetRenderer';
import { WidgetInstance } from './widgetTypes';

const GridLayout = WidthProvider(ReactGridLayout);

interface WidgetGridProps {
  widgets: WidgetInstance[];
  layout: Layout[];
  onLayoutCommit: (layout: Layout[]) => void;
  onRemoveWidget: (id: string) => void;
}

/**
 * Performance note:
 * - We intentionally do NOT push layout updates to React state during drag/resize.
 * - RGL already animates via transforms; React state updates during drag cause global re-renders and jank.
 * - We only commit when the interaction ends (drag/resize stop).
 * - Wrapped with React.memo to prevent re-renders when parent props haven't changed.
 */
const WidgetGridInner: React.FC<WidgetGridProps> = ({
  widgets,
  layout,
  onLayoutCommit,
  onRemoveWidget
}) => {
  return (
    <GridLayout
      className="h-full"
      layout={layout}
      cols={24}
      rowHeight={28}
      margin={[16, 16]}
      containerPadding={[24, 24]}
      autoSize={false}
      isDraggable
      isResizable
      isBounded
      draggableCancel=".widget-remove-button, .widget-interactive"
      compactType={null}
      // Keep widgets from pushing each other while dragging/resizing.
      preventCollision={true}
      allowOverlap={false}
      resizeHandles={['se', 'e', 's']}
      // Critical: do not update state during drag/resize
      onLayoutChange={() => {}}
      onDragStop={(nextLayout) => onLayoutCommit(nextLayout)}
      onResizeStop={(nextLayout) => onLayoutCommit(nextLayout)}
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="h-full w-full">
          <WidgetRenderer widget={widget} onRemove={onRemoveWidget} />
        </div>
      ))}
    </GridLayout>
  );
};

export const WidgetGrid = React.memo(WidgetGridInner) as React.FC<WidgetGridProps>;
