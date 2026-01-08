# Refactoring Guidelines

This document provides guidance for further refactoring large files and improving code organization.

## Refactoring Strategy

### Priority 1: Split Large Components (>300 lines)

#### `Home.tsx` (739 lines) → MEDIUM PRIORITY

**Current responsibilities:**
- Tab management
- Settings management
- History management
- Sidebar state
- Ad block state
- Onboarding flow
- Wallpaper notice
- Page composition

**Recommended split:**
1. **`TabManager.tsx`**: Handle all tab-related logic
   - State: tabs, activeTabId, lastExternalUrlById
   - Handlers: addTab, closeTab, activateTab, updateTab
   
2. **`SettingsManager.tsx`**: Extract from useSettings integration
   - State: settingsOpen, settingsSection, pendingSettingsAction
   - Handlers: openSettings, closeSettings, changeSection
   
3. **`StateManager.tsx`** (or `HomeState.ts`): Custom hook for Home state
   - Consolidates all state management
   - Returns object with all state and handlers
   
4. **`Home.tsx`**: Remains as container/presentation
   - Receives props from state manager
   - Composes child components

**Implementation steps:**
```typescript
// Step 1: Create useHomeState.ts custom hook
export const useHomeState = (defaultSettings: AppSettings) => {
  // All state from Home.tsx
  // All handlers from Home.tsx
  // Returns organized object
};

// Step 2: Create HomeTabManager.tsx sub-component
export const HomeTabManager: React.FC<TabManagerProps> = ({ ... }) => {
  // Tab-related JSX
};

// Step 3: Create SettingsManager.tsx sub-component
export const SettingsManager: React.FC<SettingsManagerProps> = ({ ... }) => {
  // Settings-related JSX
};

// Step 4: Simplify Home.tsx
export const Home: React.FC = () => {
  const state = useHomeState(DEFAULT_SETTINGS);
  return (
    <div>
      <WindowControls />
      <HomeTabManager {...state} />
      <SettingsManager {...state} />
      {/* etc */}
    </div>
  );
};
```

#### `WeatherWidget.tsx` (616 lines) → MEDIUM PRIORITY

**Recommended split:**
1. Extract weather data fetching → `hooks/useWeatherData.ts`
2. Extract weather display logic → `components/WeatherDisplay.tsx`
3. Extract settings panel → `components/WeatherSettings.tsx`
4. Keep `WeatherWidget.tsx` as container

#### `DeveloperPanel.tsx` (424 lines) → LOW PRIORITY

**Recommended split:**
1. Extract panel tabs into separate components
2. Create `useDevPanelState.ts` hook
3. Split into sub-components per feature

### Priority 2: Extract Complex Logic

#### `useSkyBackground.ts` (from sky/) → MEDIUM PRIORITY

Move to hooks and create service layer:
```typescript
// src/services/skyService.ts
// Contains all sky rendering logic

// src/hooks/useSkyBackground.ts
// React hook using sky service
```

#### `skySun.ts` (472 lines) → LOW PRIORITY

Consider splitting astronomical calculations:
```typescript
// src/lib/sky/calculations/sunCalculations.ts
// src/lib/sky/calculations/pathCalculations.ts
```

### Priority 3: Create Feature Modules

#### Widgets → `src/features/widgets/`

Move from `components/Browser/widgets/`:
```
src/features/widgets/
├── components/
│   ├── AnalogClockWidget.tsx
│   ├── DigitalClockWidget.tsx
│   ├── WeatherWidget.tsx
│   ├── FocusWidget.tsx
│   ├── NotesWidget.tsx
│   └── ...
├── hooks/
│   ├── useWeatherData.ts
│   ├── useClockWidget.ts
│   └── ...
├── services/
│   ├── widgetService.ts
│   └── ...
├── types/
│   └── widget.ts
└── index.ts
```

#### Settings → `src/features/settings/`

```
src/features/settings/
├── components/
│   ├── SettingsPanel.tsx
│   ├── GeneralSettings.tsx
│   ├── AppearanceSettings.tsx
│   ├── SearchSettings.tsx
│   ├── PrivacySettings.tsx
│   ├── AdvancedSettings.tsx
│   └── ...
├── hooks/
│   ├── useGeneralSettings.ts
│   ├── useAppearanceSettings.ts
│   └── ...
├── services/
│   └── settingsService.ts
├── types/
│   └── settings.ts
└── index.ts
```

## Code Organization Patterns

### 1. Feature-Based Structure

Each feature should have:
- `components/`: UI components
- `hooks/`: Custom hooks for that feature
- `services/`: Business logic and API calls
- `types/`: Feature-specific types
- `utils/`: Feature-specific utilities
- `index.ts`: Export public API

### 2. Custom Hooks Pattern

```typescript
// Good: Focused custom hook
export const useWeatherData = (latitude: number, longitude: number) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fetchWeather = useCallback(async () => {
    // logic
  }, [latitude, longitude]);
  
  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);
  
  return { data, loading, refetch: fetchWeather };
};
```

### 3. Service Layer Pattern

```typescript
// src/services/weatherService.ts
export const weatherService = {
  async fetch(lat: number, lon: number): Promise<WeatherData> {
    // API call
  },
  
  async search(query: string): Promise<Location[]> {
    // API call
  }
};

// Usage in hook:
const { data } = await weatherService.fetch(lat, lon);
```

### 4. Type Organization

```typescript
// src/features/weather/types/weather.ts
export interface WeatherData {
  temperature: number;
  condition: string;
  // ...
}

// src/features/weather/index.ts
export type { WeatherData } from './types/weather';
export { WeatherWidget } from './components/WeatherWidget';
```

## Code Quality Guidelines

### Component Size Limits
- **Presentational components**: < 150 lines (functions/markup only)
- **Container components**: < 300 lines (can include hooks)
- **Custom hooks**: < 200 lines
- **Utility functions**: < 100 lines (keep focused)

### Naming Conventions

```typescript
// Components (files: PascalCase.tsx)
export const MyComponent: React.FC<Props> = ({ ... }) => {};
export const MyComponentContainer: React.FC = () => {};

// Hooks (files: useMyHook.ts)
export const useMyHook = () => {};
export const useMyCustomState = () => {};

// Utilities (files: myUtility.ts)
export const myUtilFunction = () => {};
export const myOtherUtil = () => {};

// Services (files: myService.ts)
export const myService = {
  method1: () => {},
  method2: () => {}
};
```

### Import Organization

```typescript
// 1. React/External libraries
import React, { useState } from 'react';
import { someLibrary } from 'external-lib';

// 2. Absolute imports (app code)
import { MyComponent } from '@/components/MyComponent';
import { useMyHook } from '@/hooks/useMyHook';

// 3. Relative imports (local)
import { SubComponent } from './SubComponent';
```

## Testing Strategy

After refactoring, prioritize testing:

1. **Unit tests** for utility functions
2. **Hook tests** for custom hooks
3. **Component tests** for component logic
4. **Integration tests** for features

```typescript
// Example: Tab utility tests
import { createTab, updateTab, removeTab } from '@/utils/tabUtils';

describe('tabUtils', () => {
  it('should create a tab with correct properties', () => {
    const tab = createTab('1', 'Test', 'https://test.com');
    expect(tab.id).toBe('1');
    expect(tab.url).toBe('https://test.com');
  });
});
```

## Migration Checklist

- [x] Create utility modules (URL, history, tabs, theme, storage)
- [x] Move hooks to src/hooks/
- [x] Update imports in main Home component
- [x] Create STRUCTURE.md documentation
- [ ] Create useHomeState custom hook
- [ ] Split Home.tsx into sub-components
- [ ] Refactor WeatherWidget
- [ ] Move widgets to src/features/widgets/
- [ ] Create settings feature module
- [ ] Add unit tests for utilities
- [ ] Add unit tests for hooks
- [ ] Add component tests

