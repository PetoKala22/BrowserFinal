import type { ReactNode } from 'react';

export type WidgetType = 'digitalClock' | 'notes' | 'focus' | 'weather' | 'analogClock';

export interface WidgetInstance {
  id: string;
  type: WidgetType;
}

export interface WidgetDefinition {
  type: WidgetType;
  title: string;
  description: string;
  defaultSize: { w: number; h: number };
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  isResizable?: boolean;
  render: (instance: WidgetInstance) => ReactNode;
}
