declare module 'electron' {
  export interface BrowserWindowConstructorOptions {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    frame?: boolean;
    transparent?: boolean;
    backgroundColor?: string;
    titleBarStyle?: string;
    webPreferences?: {
      preload?: string;
      contextIsolation?: boolean;
      nodeIntegration?: boolean;
      sandbox?: boolean;
    };
    icon?: string;
    show?: boolean;
  }

  export class BrowserWindow {
    constructor(options?: BrowserWindowConstructorOptions);
    loadURL(url: string): Promise<void>;
    loadFile(filePath: string): Promise<void>;
    once(event: string, callback: (...args: any[]) => void): this;
    on(event: string, callback: (...args: any[]) => void): this;
    show(): void;
    minimize(): void;
    maximize(): void;
    unmaximize(): void;
    isMaximized(): boolean;
    close(): void;
    webContents: {
      send(channel: string, ...args: any[]): void;
      openDevTools(options?: { mode?: string }): void;
    };
  }

  export interface IpcMainEvent {
    sender: any;
    reply: (channel: string, ...args: any[]) => void;
  }

  export interface IpcMainInvokeEvent {
    sender: any;
  }

  export const app: {
    whenReady(): Promise<void>;
    quit(): void;
    getPath(name: string): string;
    on(event: string, callback: (...args: any[]) => void): void;
  };

  export const ipcMain: {
    on(channel: string, listener: (event: IpcMainEvent, ...args: any[]) => void): void;
    handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => any): void;
  };

  export const ipcRenderer: {
    send(channel: string, ...args: any[]): void;
    invoke(channel: string, ...args: any[]): Promise<any>;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
    removeAllListeners(channel: string): void;
  };

  export const contextBridge: {
    exposeInMainWorld(apiKey: string, api: any): void;
  };

  export const shell: {
    openPath(path: string): Promise<string>;
    openExternal(url: string): Promise<void>;
  };
}
