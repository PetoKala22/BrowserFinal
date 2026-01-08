## Nook

Minimalistic and modern desktop browser UI built with React, Vite, Tailwind, and Electron. Includes a customizable start page, tabbed browsing shell, ad-block toggle, wallpaper controls, and a live sky/weather background.

### 📚 Project Reorganization (Jan 2026)

**The project has been professionally reorganized for better team collaboration!**

- ✅ Utilities extracted to reusable modules (`src/utils/`)
- ✅ Hooks centralized (`src/hooks/`)
- ✅ Features framework established (`src/features/`)
- ✅ Comprehensive documentation added

**New developers**: Start with [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for a complete guide.

**Quick reference**: See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for common workflows.

### Features
- Tabbed shell with address bar, suggestions, history pane, and settings drawer.
- Start page widgets: weather/sky backdrop, ad-block stats, onboarding flow, and wallpaper notice.
- Configurable search engine and custom search URL; remembers tabs/history via Electron IPC helpers.
- Theme/wallpaper controls with optional blur and seasonal sky rendering driven by astronomy math.

### Getting Started
1) Install Node 18+ and npm.  
2) Install deps: `npm install`  
3) Web preview: `npm run dev` then open the printed URL.  
4) Electron dev: `npm run electron:dev` (spawns Vite and Electron together).

### Scripts
- `npm run dev` — Vite dev server.
- `npm run build` — Production web build to `dist/`.
- `npm run preview` — Preview the production build.
- `npm run electron` — Launch Electron using the built files (set `VITE_DEV_SERVER_URL` if using dev server).
- `npm run electron:dev` — Concurrent Vite + Electron for live reload.

### Project Layout
- `src/app` / `features/home` — Main application shell and browser experience.
- `src/components/Browser` — Address bar, tabs, history, settings UI, and widgets.
- `src/lib/sky` — Procedural sky rendering, astronomy helpers, and weather-driven colors.
- `electron/` — Electron main process files and preload.

### Building Electron Package
- Run `npm run build` then `npm run electron` for a local check, or `npm run electron:build` to produce installers into `release/`.
