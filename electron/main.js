import { app, BrowserWindow, ipcMain, nativeTheme, session } from 'electron';
import { FiltersEngine, Request } from '@ghostery/adblocker';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
const devServerUrl =
  process.env.VITE_DEV_SERVER_URL || (isDev ? 'http://localhost:3000' : null);
const appIconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'AppIcon.ico')
  : path.join(__dirname, '../src/assets/AppIcon.ico');

let mainWindow;
let adblockEngine;
let adBlockEnabled = true;
let adblockAttached = false;
let adblockStats = { blocked: 0 };
const HISTORY_LIMIT = 300;

const getHistoryPath = () => path.join(app.getPath('userData'), 'history.json');

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

const getFilterListPaths = async () => {
  const filtersDir = path.join(__dirname, 'filters');
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
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (!adBlockEnabled || !adblockEngine) {
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
  }
};

const setAdblockEnabled = (enabled) => {
  adBlockEnabled = Boolean(enabled);
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#000000' : '#ffffff',
    trafficLightPosition: { x: 14, y: 18 },
    show: false, // prevent flicker until maximized
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  // load content
  if (isDev && devServerUrl) {
    try {
      await mainWindow.loadURL(devServerUrl);
    } catch {
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // maximize as soon as ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

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

};

app.whenReady().then(async () => {
  registerIpc();
  await initAdblocker();
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
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
