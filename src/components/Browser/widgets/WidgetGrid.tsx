import React from 'react';
import ReactGridLayout, { Layout } from 'react-grid-layout';
import { WidthProvider } from 'react-grid-layout';
import { WidgetRenderer } from './WidgetRenderer';
import { WidgetInstance } from './widgetTypes';

const GridLayout = WidthProvider(ReactGridLayout);

interface WidgetGridProps {
  widgets: WidgetInstance[];
  layout: Layout[];
  onLayoutChange: (layout: Layout[]) => void;
  onRemoveWidget: (id: string) => void;
}

export const WidgetGrid: React.FC<WidgetGridProps> = ({
  widgets,
  layout,
  onLayoutChange,
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
      preventCollision
      resizeHandles={['se', 'e', 's']}
      onLayoutChange={onLayoutChange}
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="h-full w-full">
          <WidgetRenderer widget={widget} onRemove={onRemoveWidget} />
        </div>
      ))}
    </GridLayout>
  );
};
