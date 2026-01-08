# Project Structure Guide

This document describes the reorganized project structure for better maintainability and collaboration.

## Directory Structure

```
src/
├── app/                      # Application root component
│   └── App.tsx              # Main app component
│
├── components/              # Reusable UI components
│   ├── Browser/            # Browser-specific components
│   │   ├── AddressBar.tsx
│   │   ├── BrowserContent.tsx
│   │   ├── DeveloperPanel.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── NewTabPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── Suggestions.tsx
│   │   ├── TabBar.tsx
│   │   ├── WindowControls.tsx
│   │   ├── settings/       # Settings section components
│   │   └── widgets/        # Widget-related components (FUTURE: move to features/widgets)
│   │
│   ├── Sidebar/            # Sidebar navigation
│   │   └── Sidebar.tsx
│   │
│   └── ui/                 # Generic UI components
│       ├── IconButton.tsx
│       └── ToggleSwitch.tsx
│
├── features/               # Feature-specific logic and components
│   ├── home/              # Home/main feature
│   │   ├── Home.tsx       # Main container component (REFACTOR: split into smaller components)
│   │   ├── components/    # Home-specific sub-components
│   │   ├── hooks/         # Home-specific hooks (REFACTOR: move to src/hooks)
│   │   └── utils/         # Home-specific utilities (FUTURE: move to src/utils)
│   │
│   ├── browser/           # Browser feature (FUTURE)
│   ├── settings/          # Settings feature (FUTURE)
│   ├── pages/             # Page-level components (FUTURE)
│   └── widgets/           # Widget feature (FUTURE)
│
├── hooks/                 # Global React hooks
│   ├── useTheme.ts       # Theme management
│   ├── useSettings.ts    # Settings management
│   └── index.ts          # Central hook exports
│
├── lib/                   # Core library utilities
│   ├── appearance.ts     # Appearance utilities
│   ├── constants.ts      # App constants
│   ├── devPanelState.ts  # Developer panel state
│   ├── types.ts          # TypeScript type definitions
│   └── sky/              # Sky rendering system
│       ├── skyAstronomy.ts
│       ├── skyAtmosphere.ts
│       ├── skyColor.ts
│       ├── skyModel.ts
│       ├── skyNoise.ts
│       ├── skyRenderer.ts
│       ├── skyStarRenderer.ts
│       ├── skyStars.ts
│       ├── skySun.ts
│       ├── skyTypes.ts
│       ├── skyUtils.ts
│       ├── skyView.ts
│       └── useSkyBackground.ts
│
├── services/             # External API and service integrations
│   └── (future services)
│
├── styles/              # Global styles
│   └── index.css
│
├── types/               # Global TypeScript definitions
│   └── electron.d.ts
│
├── utils/              # Global utility functions
│   ├── urlUtils.ts     # URL manipulation and normalization
│   ├── historyUtils.ts # History management
│   ├── tabUtils.ts     # Tab management
│   ├── themeUtils.ts   # Theme application and utilities
│   ├── storageUtils.ts # Local storage management
│   └── index.ts        # Central utils exports
│
├── assets/             # Static assets
├── main.tsx            # React app entry point
└── (config files)
```

## Key Improvements

### 1. **Separation of Concerns**
- **Utils**: Pure utility functions (URL handling, history, tabs, theme, storage)
- **Hooks**: React hooks for stateful logic
- **Components**: UI components organized by feature
- **Services**: External integrations and APIs
- **Lib**: Core library code and complex algorithms

### 2. **Scalability**
- New features can be added under `src/features/`
- Global hooks are reusable across all components
- Utility functions prevent code duplication

### 3. **Collaboration**
- Clear module boundaries make it easier for multiple developers to work independently
- Centralized exports (`index.ts` files) provide clean import paths
- Organized structure helps onboarding new team members

### 4. **Refactoring Progress**

The following large files have been split or are candidates for splitting:

| File | Status | Details |
|------|--------|---------|
| `Home.tsx` (739 lines) | 📋 Refactor candidate | Should split into: TabManager, SettingsManager, PageContainer |
| `WeatherWidget.tsx` (616 lines) | 📋 Refactor candidate | Extract logic into custom hooks and sub-components |
| `OnboardingFlow.tsx` (462 lines) | 📋 Refactor candidate | Break into smaller step components |
| `DeveloperPanel.tsx` (424 lines) | 📋 Refactor candidate | Extract features into sub-components |
| `useSettings.ts` | ✅ Refactored | Split theme logic and moved to hooks/, added utility functions |
| `skySun.ts` (472 lines) | 📋 Refactor candidate | Consider extracting calculation logic into utils |

### 5. **New Utility Files**

Created utility modules for common operations:

- **`urlUtils.ts`**: URL normalization, hostname extraction, internal URL checking
- **`historyUtils.ts`**: History item management, searching, sorting
- **`tabUtils.ts`**: Tab creation, updates, reordering, and duplication
- **`themeUtils.ts`**: Theme application, color calculations, system theme detection
- **`storageUtils.ts`**: Safe localStorage operations with type safety

### 6. **Next Steps for Further Refactoring**

1. **Split `Home.tsx`**:
   - Extract tab management logic → `TabManager.tsx`
   - Extract settings handling → `SettingsManager.tsx`
   - Extract sidebar management → `SidebarManager.tsx`
   - Leave only page composition in `Home.tsx`

2. **Move Widget System**:
   - Move `components/Browser/widgets/` → `features/widgets/`
   - Create `features/widgets/hooks/` for widget-specific hooks

3. **Extract Services**:
   - Create `services/adBlockService.ts` for ad blocking logic
   - Create `services/storageService.ts` for persistence
   - Create `services/electronService.ts` for Electron integration

4. **Organize Settings**:
   - Move settings components → `features/settings/`
   - Create settings-specific hooks and utilities

## Import Conventions

### After Reorganization
```typescript
// Utilities
import { getTabTitleFromUrl, normalizeUrl } from '@/utils';

// Hooks
import { useSettings, useTheme } from '@/hooks';

// Types
import { AppSettings, Tab } from '@/lib/types';

// Components
import { Sidebar } from '@/components/Sidebar';
import { Home } from '@/features/home/Home';
```

### Before (Old Way)
```typescript
// Scattered imports
import { getTabTitleFromUrl } from '@/features/home/Home';
import { useSettings } from '@/features/home/hooks/useSettings';
```

## Contributing Guidelines

1. **Keep components focused**: Each component should have a single responsibility
2. **Use utility functions**: Extract repeated logic into utils/
3. **Create custom hooks**: For complex state logic, create hooks in `src/hooks/`
4. **Centralize exports**: Use `index.ts` files for clean imports
5. **Follow naming conventions**:
   - Components: `PascalCase` (e.g., `MyComponent.tsx`)
   - Utils/Hooks: `camelCase` (e.g., `myUtility.ts`)
   - Types: `PascalCase` interfaces/enums (e.g., `MyType`)

## File Size Guidelines

- **Components**: Keep under 300 lines (split if larger)
- **Hooks**: Keep under 200 lines (extract logic into helpers)
- **Utils**: Keep related functions together, split into files by domain

