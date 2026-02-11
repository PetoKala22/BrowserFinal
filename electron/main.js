import { app, BrowserWindow, ipcMain, nativeTheme, session, globalShortcut } from 'electron';
import { FiltersEngine, Request } from '@ghostery/adblocker';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reduce the maximum number of renderer processes to limit memory usage
// (adjust as needed; too low can impact multi-tab performance)
app.commandLine.appendSwitch('renderer-process-limit', '6');

const isDev = !app.isPackaged;

// Optionally disable hardware acceleration to save GPU memory. Set
// DISABLE_GPU=1 in the environment to enable.
if (process.env.DISABLE_GPU === '0') {
  try {
    app.disableHardwareAcceleration();
  } catch (e) {
    console.warn('Failed to disable hardware acceleration:', e);
  }
}
const devServerUrl =
  process.env.VITE_DEV_SERVER_URL || (isDev ? 'http://localhost:3000' : null);
const appIconPath = app.isPackaged
  ? path.join(app.getAppPath(), 'src/assets/AppIcon.ico')
  : path.join(__dirname, '../src/assets/AppIcon.ico');

let mainWindow;
let adblockEngine;
let adBlockEnabled = true;
let adblockAttached = false;
let adblockInitializing = false;
let adblockStats = { blocked: 0 };
const HISTORY_LIMIT = 300;
const pendingPermissions = new Map();

// Simple logging function (disabled for now to prevent startup issues)
const log = (message, error = null) => {
  if (error) {
    console.error(`[ERROR] ${message}:`, error);
  } else {
    console.log(`[INFO] ${message}`);
  }
};

const getHistoryPath = () => path.join(app.getPath('userData'), 'history.json');
const getWindowStatePath = () => path.join(app.getPath('userData'), 'window-state.json');

const readHistory = async () => {
  try {
    const raw = await fs.readFile(getHistoryPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    console.error('Failed to read history:', error);
    return [];
  }
};

const writeHistory = async (items) => {
  const payload = JSON.stringify(items, null, 2);
  await fs.writeFile(getHistoryPath(), payload, 'utf-8');
};

const readWindowState = async () => {
  try {
    const raw = await fs.readFile(getWindowStatePath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    console.error('Failed to read window state:', error);
    return null;
  }
};

const writeWindowState = async (state) => {
  const payload = JSON.stringify(state, null, 2);
  await fs.writeFile(getWindowStatePath(), payload, 'utf-8');
};

const toSafeBounds = (bounds) => {
  if (!bounds || typeof bounds !== 'object') return null;
  const { x, y, width, height } = bounds;
  if (![width, height].every((value) => Number.isFinite(value))) return null;
  const safe = { width: Math.max(640, Math.floor(width)), height: Math.max(480, Math.floor(height)) };
  if (Number.isFinite(x) && Number.isFinite(y)) {
    safe.x = Math.floor(x);
    safe.y = Math.floor(y);
  }
  return safe;
};

const getFilterListPaths = async () => {
  const filtersDir = app.isPackaged
    ? path.join(app.getAppPath(), 'electron', 'filters')
    : path.join(__dirname, 'filters');
  try {
    const entries = await fs.readdir(filtersDir);
    return entries
      .filter((name) => name.endsWith('.txt'))
      .sort()
      .map((name) => path.join(filtersDir, name));
  } catch (error) {
    console.error('Failed to read filters directory:', error);
    return [];
  }
};

const mapResourceType = (resourceType) => {
  switch (resourceType) {
    case 'mainFrame':
      return 'main_frame';
    case 'subFrame':
      return 'sub_frame';
    case 'stylesheet':
      return 'stylesheet';
    case 'script':
      return 'script';
    case 'image':
      return 'image';
    case 'font':
      return 'font';
    case 'object':
      return 'object';
    case 'xhr':
      return 'xmlhttprequest';
    case 'ping':
      return 'ping';
    case 'media':
      return 'media';
    case 'webSocket':
      return 'websocket';
    case 'other':
    default:
      return 'other';
  }
};

const attachAdblocker = () => {
  if (adblockAttached) return;
  adblockAttached = true;

  // Attach a lightweight request hook that will lazy-initialize the
  // adblock engine on first real request. This avoids parsing large
  // filter lists at startup which can spike memory.
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (!adBlockEnabled) {
      callback({});
      return;
    }

    // If engine isn't ready, start async initialization and allow the
    // request through for now. Initialization runs only once.
    if (!adblockEngine && !adblockInitializing) {
      adblockInitializing = true;
      initAdblocker().catch((err) => {
        console.error('Adblock init failed:', err);
        adblockInitializing = false;
      });
    }

    if (!adblockEngine) {
      callback({});
      return;
    }

    const type = mapResourceType(details.resourceType);
    const sourceUrl = details.referrer || details.initiator || undefined;
    const request = Request.fromRawDetails({
      url: details.url,
      type,
      sourceUrl
    });
    const { match } = adblockEngine.match(request);
    if (match) {
      adblockStats.blocked += 1;
      mainWindow?.webContents.send('adblock:stats', { blocked: adblockStats.blocked });
    }
    callback({ cancel: Boolean(match) });
  });
};

const initAdblocker = async () => {
  if (adblockEngine || adblockInitializing) return;
  adblockInitializing = true;
  try {
    const filterPaths = await getFilterListPaths();
    const lists = await Promise.all(
      filterPaths.map((filePath) => fs.readFile(filePath, 'utf-8'))
    );
    const combined = lists.join('\n');
    adblockEngine = FiltersEngine.parse(combined);
    attachAdblocker();
  } catch (error) {
    console.error('Failed to initialize adblocker:', error);
  } finally {
    adblockInitializing = false;
  }
};

const setAdblockEnabled = (enabled) => {
  adBlockEnabled = Boolean(enabled);
};

const createWindow = async () => {
  const savedWindowState = await readWindowState();
  const savedBounds = toSafeBounds(savedWindowState?.bounds);
  const shouldMaximize = Boolean(savedWindowState?.isMaximized);
  const shouldFullscreen = Boolean(savedWindowState?.isFullScreen);

  // Resolve preload path correctly for packaged app
  const preloadPath = app.isPackaged
    ? path.join(app.getAppPath(), 'electron', 'preload.cjs')
    : path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 1280,
    height: savedBounds?.height ?? 800,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#000000' : '#ffffff',
    trafficLightPosition: { x: 14, y: 18 },
    show: false, // prevent flicker until maximized
    icon: appIconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  // load content
  const distPath = app.isPackaged
    ? path.join(app.getAppPath(), 'dist', 'index.html')
    : path.join(__dirname, '../dist/index.html');

  if (isDev && devServerUrl) {
    try {
      await mainWindow.loadURL(devServerUrl);
    } catch (err) {
      console.error('Failed to load dev server, falling back to dist:', err);
      await mainWindow.loadFile(distPath);
    }
  } else {
    try {
      await mainWindow.loadFile(distPath);
    } catch (err) {
      console.error('Failed to load app:', err);
      throw err;
    }
  }

  // show with the last window state
  mainWindow.once('ready-to-show', () => {
    if (shouldFullscreen) {
      mainWindow.setFullScreen(true);
    } else if (shouldMaximize) {
      mainWindow.maximize();
    }
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('close', async () => {
    if (!mainWindow) return;
    const isMaximized = mainWindow.isMaximized();
    const isFullScreen = mainWindow.isFullScreen();
    const bounds = isMaximized || isFullScreen ? mainWindow.getNormalBounds() : mainWindow.getBounds();
    try {
      await writeWindowState({
        bounds,
        isMaximized,
        isFullScreen
      });
    } catch (error) {
      console.error('Failed to write window state:', error);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const registerIpc = () => {
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  ipcMain.handle('settings:load', async () => {
    try {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      const raw = await fs.readFile(settingsPath, 'utf-8');
      return JSON.parse(raw);
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      return null;
    }
  });

  ipcMain.handle('settings:save', async (_event, settings) => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    const payload = JSON.stringify(settings, null, 2);
    await fs.writeFile(settingsPath, payload, 'utf-8');
  });

  ipcMain.handle('adblock:set-enabled', (_event, enabled) => {
    setAdblockEnabled(enabled);
    return adBlockEnabled;
  });

  ipcMain.handle('adblock:get-stats', () => {
    return { blocked: adblockStats.blocked };
  });

  ipcMain.handle('adblock:get-cosmetics', (_event, url) => {
    if (!adBlockEnabled || !adblockEngine || typeof url !== 'string') {
      return { styles: [], scripts: [] };
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { styles: [], scripts: [] };
    }
    try {
      const request = Request.fromRawDetails({ url, type: 'main_frame' });
      const { styles, scripts } = adblockEngine.getCosmeticsFilters({
        url,
        hostname: request.hostname,
        domain: request.domain
      });
      return { styles, scripts };
    } catch {
      return { styles: [], scripts: [] };
    }
  });

  ipcMain.handle('history:load', async () => {
    return readHistory();
  });

  ipcMain.handle('history:add', async (_event, entry) => {
    if (!entry || typeof entry.url !== 'string') return readHistory();
    const url = entry.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return readHistory();
    }
    const title = typeof entry.title === 'string' ? entry.title : url;
    const timestamp =
      typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp)
        ? entry.timestamp
        : Date.now();
    const nextEntry = { url, title, timestamp };
    const history = await readHistory();
    const deduped = history.filter((item) => item?.url !== url);
    deduped.unshift(nextEntry);
    const trimmed = deduped.slice(0, HISTORY_LIMIT);
    await writeHistory(trimmed);
    return trimmed;
  });

  ipcMain.handle('history:clear', async () => {
    await writeHistory([]);
    return [];
  });

  ipcMain.handle('permission:respond', async (_event, id, granted) => {
    const callback = pendingPermissions.get(id);
    if (callback) {
      callback(granted);
      pendingPermissions.delete(id);
    }
  });
};

// Global error handlers (synchronous to avoid blocking)
process.on('uncaughtException', (error) => {
  const msg = 'Uncaught Exception in main process';
  console.error(msg, error);
  log(msg, error);
  if (!app.isPackaged) {
    throw error;
  }
});

process.on('unhandledRejection', (reason) => {
  const msg = 'Unhandled Rejection in main process';
  console.error(msg, reason);
  log(msg, reason instanceof Error ? reason : new Error(String(reason)));
});

app.whenReady().then(async () => {
  log('App ready, initializing...');
  registerIpc();
  try {
    await createWindow();
    
    // Register global shortcuts
    globalShortcut.register('CommandOrControl+T', () => {
      mainWindow?.webContents.send('spotlight:open');
    });
    
    // Add webContents error logging
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.on('crashed', () => {
        log('Renderer process crashed');
      });
      
      mainWindow.webContents.on('render-process-gone', (event, details) => {
        log(`Render process gone: ${details.reason}`);
      });
    }
    
    // Use lazy adblock initialization to avoid parsing large filter lists at startup
    attachAdblocker();
    log('App initialization complete');
  } catch (error) {
    const msg = 'Failed to initialize app';
    console.error(msg, error);
    log(msg, error);
    app.quit();
    return;
  }

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (mainWindow && url) {
        mainWindow.webContents.send('tabs:new-window', url);
      }
      return { action: 'deny' };
    });

    contents.on('before-input-event', (event, input) => {
      if (!input) return;
      const key = String(input.key || input.code || '').toLowerCase();
      if (key !== 'l' && key !== 'keyl') return;
      if (!input.control && !input.meta) return;
      if (contents.getType() !== 'webview') return;
      event.preventDefault();
      mainWindow?.webContents.send('browser:focus-address-bar');
    });

    contents.on('permission-request', (event, permission, callback, details) => {
      if (contents.getType() !== 'webview') return;

      // Map Electron permission types to our types
      const permissionMap = {
        'geolocation': 'geolocation',
        'media': 'microphone', // media includes microphone/camera
        'notifications': 'notifications',
        'clipboard-read': 'clipboard-read',
        'clipboard-write': 'clipboard-write'
      };

      const mappedPermission = permissionMap[permission];
      if (!mappedPermission) {
        callback(false);
        return;
      }

      const id = Math.random().toString(36).slice(2, 9);
      const origin = details?.origin || contents.getURL();

      pendingPermissions.set(id, callback);

      mainWindow?.webContents.send('permission:request', {
        id,
        type: mappedPermission,
        origin,
        tabId: 'current' // We could track tab IDs if needed
      });
    });

    contents.on('will-download', (event, item, webContents) => {
      // Set download path to Downloads folder
      const downloadsPath = app.getPath('downloads');
      const fileName = item.getFilename();
      const filePath = path.join(downloadsPath, fileName);
      item.setSavePath(filePath);

      // Notify the renderer
      mainWindow?.webContents.send('download:started', {
        fileName,
        filePath,
        url: item.getURL(),
        totalBytes: item.getTotalBytes()
      });

      item.on('updated', (event, state) => {
        if (state === 'progressing') {
          mainWindow?.webContents.send('download:progress', {
            fileName,
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes()
          });
        }
      });

      item.once('done', (event, state) => {
        mainWindow?.webContents.send('download:completed', {
          fileName,
          filePath,
          state // 'completed', 'cancelled', 'interrupted'
        });
      });
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    globalShortcut.unregisterAll();
    app.quit();
  }
});
