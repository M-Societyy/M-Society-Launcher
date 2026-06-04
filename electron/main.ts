import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { MinecraftManager } from './minecraft/MinecraftManager';
import { AccountManager } from './minecraft/AccountManager';
import { SettingsManager } from './minecraft/SettingsManager';
import { InstanceManager } from './minecraft/InstanceManager';

let mainWindow: BrowserWindow | null = null;
let minecraftManager: MinecraftManager;
let accountManager: AccountManager;
let settingsManager: SettingsManager;
let instanceManager: InstanceManager;

const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV === 'true';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#08080c',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIPC() {
  const gameDir = path.join(app.getPath('appData'), '.msociety-launcher');

  minecraftManager = new MinecraftManager(gameDir);
  accountManager = new AccountManager(gameDir);
  settingsManager = new SettingsManager(gameDir);
  instanceManager = new InstanceManager(gameDir);

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  ipcMain.handle('minecraft:getVersionManifest', async () => {
    return await minecraftManager.getVersionManifest();
  });

  ipcMain.handle('minecraft:getInstalledVersions', async () => {
    return await minecraftManager.getInstalledVersions();
  });

  ipcMain.handle('minecraft:installVersion', async (_event, versionId: string) => {
    return await minecraftManager.installVersion(versionId, (progress: any) => {
      mainWindow?.webContents.send('minecraft:installProgress', progress);
    });
  });

  ipcMain.handle('minecraft:launch', async (_event, options: any) => {
    return await minecraftManager.launch(options, (log: string) => {
      mainWindow?.webContents.send('minecraft:log', log);
    });
  });

  ipcMain.handle('minecraft:stop', async () => {
    return minecraftManager.stopGame();
  });

  ipcMain.handle('minecraft:getFabricVersions', async (_event, mcVersion: string) => {
    return await minecraftManager.getFabricVersions(mcVersion);
  });

  ipcMain.handle('minecraft:getForgeVersions', async (_event, mcVersion: string) => {
    return await minecraftManager.getForgeVersions(mcVersion);
  });

  ipcMain.handle('minecraft:installFabric', async (_event, mcVersion: string, loaderVersion: string) => {
    return await minecraftManager.installFabric(mcVersion, loaderVersion, (progress: any) => {
      mainWindow?.webContents.send('minecraft:installProgress', progress);
    });
  });

  ipcMain.handle('minecraft:installForge', async (_event, mcVersion: string, forgeVersion: string) => {
    return await minecraftManager.installForge(mcVersion, forgeVersion, (progress: any) => {
      mainWindow?.webContents.send('minecraft:installProgress', progress);
    });
  });

  ipcMain.handle('accounts:getAll', async () => {
    return accountManager.getAccounts();
  });

  ipcMain.handle('accounts:addOffline', async (_event, username: string) => {
    return accountManager.addOfflineAccount(username);
  });

  ipcMain.handle('accounts:addMicrosoft', async () => {
    return await accountManager.addMicrosoftAccount();
  });

  ipcMain.handle('accounts:remove', async (_event, id: string) => {
    return accountManager.removeAccount(id);
  });

  ipcMain.handle('accounts:setActive', async (_event, id: string) => {
    return accountManager.setActiveAccount(id);
  });

  ipcMain.handle('accounts:getActive', async () => {
    return accountManager.getActiveAccount();
  });

  ipcMain.handle('settings:get', async () => {
    return settingsManager.getSettings();
  });

  ipcMain.handle('settings:update', async (_event, settings: any) => {
    return settingsManager.updateSettings(settings);
  });

  ipcMain.handle('settings:getSystemInfo', async () => {
    return settingsManager.getSystemInfo();
  });

  

  ipcMain.handle('instances:getAll', async () => {
    return instanceManager.getInstances();
  });

  ipcMain.handle('instances:get', async (_event, id: string) => {
    return instanceManager.getInstance(id);
  });

  ipcMain.handle('instances:create', async (_event, data: any) => {
    return instanceManager.createInstance(data);
  });

  ipcMain.handle('instances:update', async (_event, id: string, data: any) => {
    return instanceManager.updateInstance(id, data);
  });

  ipcMain.handle('instances:delete', async (_event, id: string) => {
    return instanceManager.deleteInstance(id);
  });

  ipcMain.handle('instances:duplicate', async (_event, id: string, newName: string) => {
    return instanceManager.duplicateInstance(id, newName);
  });

  ipcMain.handle('util:openFolder', async (_event, folderPath: string) => {
    shell.openPath(folderPath);
  });

  ipcMain.handle('util:openUrl', async (_event, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle('util:getGameDir', async () => {
    return gameDir;
  });
}

app.whenReady().then(() => {
  setupIPC();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
