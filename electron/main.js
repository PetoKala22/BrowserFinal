import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
const devServerUrl =
  process.env.VITE_DEV_SERVER_URL || (isDev ? 'http://localhost:3000' : null);

let mainWindow;

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
};

app.whenReady().then(() => {
  registerIpc();
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (mainWindow && url) {
        mainWindow.webContents.send('tabs:new-window', url);
      }
      return { action: 'deny' };
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
