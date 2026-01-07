import React from 'react';
import { DigitalClockWidget } from './DigitalClockWidget';
import { FocusWidget } from './FocusWidget';
import { NotesWidget } from './NotesWidget';
import { WeatherWidget } from './WeatherWidget';
import { WidgetDefinition, WidgetInstance, WidgetType } from './widgetTypes';

export const widgetDefinitions: Record<WidgetType, WidgetDefinition> = {
  digitalClock: {
    type: 'digitalClock',
    title: 'Digital Clock',
    description: 'Crisp time readout with date.',
    defaultSize: { w: 3, h: 3 },
    minW: 3,
    minH: 3,
    isResizable: false,
    render: () => <DigitalClockWidget />
  },
  notes: {
    type: 'notes',
    title: 'Notes',
    description: 'Quick scratchpad for ideas.',
    defaultSize: { w: 5, h: 6 },
    minW: 4,
    minH: 4,
    maxW: 12,
    maxH: 12,
    render: (instance: WidgetInstance) => <NotesWidget widgetId={instance.id} />
  },
  focus: {
    type: 'focus',
    title: 'Focus',
    description: 'A gentle reminder for your day.',
    defaultSize: { w: 4, h: 6 },
    minW: 4,
    minH: 6,
    maxW: 6,
    maxH: 8,
    render: () => <FocusWidget />
  },
  weather: {
    type: 'weather',
    title: 'Weather',
    description: 'Local forecast with live conditions.',
    defaultSize: { w: 5, h: 5 },
    minW: 4,
    minH: 4,
    isResizable: false,
    render: () => <WeatherWidget />
  }
};

export const widgetList = Object.values(widgetDefinitions);
