const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  setAdBlockEnabled: (enabled) => ipcRenderer.invoke('adblock:set-enabled', enabled),
  getAdblockStats: () => ipcRenderer.invoke('adblock:get-stats'),
  getAdblockCosmetics: (url) => ipcRenderer.invoke('adblock:get-cosmetics', url),
  loadHistory: () => ipcRenderer.invoke('history:load'),
  addHistory: (entry) => ipcRenderer.invoke('history:add', entry),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  respondPermission: (id, granted) => ipcRenderer.invoke('permission:respond', id, granted),
  onAdblockStats: (handler) => {
    const listener = (_event, stats) => handler(stats);
    ipcRenderer.on('adblock:stats', listener);
    return () => ipcRenderer.removeListener('adblock:stats', listener);
  },
  onNewWindow: (handler) => {
    const listener = (_event, url) => handler(url);
    ipcRenderer.on('tabs:new-window', listener);
    return () => ipcRenderer.removeListener('tabs:new-window', listener);
  },
  onPermissionRequest: (handler) => {
    const listener = (_event, request) => handler(request);
    ipcRenderer.on('permission:request', listener);
    return () => ipcRenderer.removeListener('permission:request', listener);
  },
  onFocusAddressBar: (handler) => {
    const listener = () => handler();
    ipcRenderer.on('browser:focus-address-bar', listener);
    return () => ipcRenderer.removeListener('browser:focus-address-bar', listener);
  }
});
