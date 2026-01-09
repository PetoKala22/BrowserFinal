import React from 'react';
import { AnalogClockWidget } from './AnalogClockWidget';
import { DigitalClockWidget } from './DigitalClockWidget';
import { FocusWidget } from './FocusWidget';
// Lazy-load heavier or less-frequently-used widgets to improve initial load.
const LazyNotes = React.lazy(() => import('./NotesWidget').then(m => ({ default: m.NotesWidget })));
const LazyWeather = React.lazy(() => import('./WeatherWidget').then(m => ({ default: m.WeatherWidget })));
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
  analogClock: {
    type: 'analogClock',
    title: 'Analog Clock',
    description: 'Classic time with a second hand.',
    defaultSize: { w: 3, h: 5 },
    minW: 3,
    minH: 5,
    isResizable: false,
    render: (instance: WidgetInstance) => <AnalogClockWidget widgetId={instance.id} />
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
    render: (instance: WidgetInstance) => <LazyNotes widgetId={instance.id} />
  },
  focus: {
    type: 'focus',
    title: 'Focus',
    description: 'A gentle reminder for your day.',
    defaultSize: { w: 4, h: 7 },
    minW: 4,
    minH: 7,
    isResizable: false,
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
    render: () => <LazyWeather />
  }
};

export const widgetList = Object.values(widgetDefinitions);
