import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
  minecraft: {
    getVersionManifest: () => ipcRenderer.invoke('minecraft:getVersionManifest'),
    getInstalledVersions: () => ipcRenderer.invoke('minecraft:getInstalledVersions'),
    installVersion: (versionId: string) => ipcRenderer.invoke('minecraft:installVersion', versionId),
    launch: (options: any) => ipcRenderer.invoke('minecraft:launch', options),
    stop: () => ipcRenderer.invoke('minecraft:stop'),
    getFabricVersions: (mcVersion: string) => ipcRenderer.invoke('minecraft:getFabricVersions', mcVersion),
    getForgeVersions: (mcVersion: string) => ipcRenderer.invoke('minecraft:getForgeVersions', mcVersion),
    installFabric: (mcVersion: string, loaderVersion: string) => ipcRenderer.invoke('minecraft:installFabric', mcVersion, loaderVersion),
    installForge: (mcVersion: string, forgeVersion: string) => ipcRenderer.invoke('minecraft:installForge', mcVersion, forgeVersion),
    onInstallProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('minecraft:installProgress', (_event, progress) => callback(progress));
    },
    onLog: (callback: (log: string) => void) => {
      ipcRenderer.on('minecraft:log', (_event, log) => callback(log));
    },
    removeLogListener: () => {
      ipcRenderer.removeAllListeners('minecraft:log');
    },
    removeProgressListener: () => {
      ipcRenderer.removeAllListeners('minecraft:installProgress');
    },
  },
  accounts: {
    getAll: () => ipcRenderer.invoke('accounts:getAll'),
    addOffline: (username: string) => ipcRenderer.invoke('accounts:addOffline', username),
    addMicrosoft: () => ipcRenderer.invoke('accounts:addMicrosoft'),
    remove: (id: string) => ipcRenderer.invoke('accounts:remove', id),
    setActive: (id: string) => ipcRenderer.invoke('accounts:setActive', id),
    getActive: () => ipcRenderer.invoke('accounts:getActive'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
    getSystemInfo: () => ipcRenderer.invoke('settings:getSystemInfo'),
  },
  instances: {
    getAll: () => ipcRenderer.invoke('instances:getAll'),
    get: (id: string) => ipcRenderer.invoke('instances:get', id),
    create: (data: any) => ipcRenderer.invoke('instances:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('instances:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('instances:delete', id),
    duplicate: (id: string, newName: string) => ipcRenderer.invoke('instances:duplicate', id, newName),
  },
  util: {
    openFolder: (path: string) => ipcRenderer.invoke('util:openFolder', path),
    openUrl: (url: string) => ipcRenderer.invoke('util:openUrl', url),
    getGameDir: () => ipcRenderer.invoke('util:getGameDir'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
