const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  setAdBlockEnabled: (enabled) => ipcRenderer.invoke('adblock:set-enabled', enabled),
  getAdblockCosmetics: (url) => ipcRenderer.invoke('adblock:get-cosmetics', url),
  onNewWindow: (handler) => {
    const listener = (_event, url) => handler(url);
    ipcRenderer.on('tabs:new-window', listener);
    return () => ipcRenderer.removeListener('tabs:new-window', listener);
  },
  onFocusAddressBar: (handler) => {
    const listener = () => handler();
    ipcRenderer.on('browser:focus-address-bar', listener);
    return () => ipcRenderer.removeListener('browser:focus-address-bar', listener);
  }
});
