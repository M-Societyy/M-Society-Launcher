export interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  minecraft: {
    getVersionManifest: () => Promise<any>;
    getInstalledVersions: () => Promise<string[]>;
    installVersion: (versionId: string) => Promise<boolean>;
    launch: (options: LaunchOptions) => Promise<boolean>;
    stop: () => Promise<boolean>;
    getFabricVersions: (mcVersion: string) => Promise<any[]>;
    getForgeVersions: (mcVersion: string) => Promise<any[]>;
    installFabric: (mcVersion: string, loaderVersion: string) => Promise<boolean>;
    installForge: (mcVersion: string, forgeVersion: string) => Promise<boolean>;
    onInstallProgress: (callback: (progress: InstallProgress) => void) => void;
    onLog: (callback: (log: string) => void) => void;
    removeLogListener: () => void;
    removeProgressListener: () => void;
  };
  accounts: {
    getAll: () => Promise<Account[]>;
    addOffline: (username: string) => Promise<Account>;
    addMicrosoft: () => Promise<Account>;
    remove: (id: string) => Promise<boolean>;
    setActive: (id: string) => Promise<Account | null>;
    getActive: () => Promise<Account | null>;
  };
  settings: {
    get: () => Promise<LauncherSettings>;
    update: (settings: any) => Promise<LauncherSettings>;
    getSystemInfo: () => Promise<SystemInfo>;
  };
  instances: {
    getAll: () => Promise<Instance[]>;
    get: (id: string) => Promise<Instance | null>;
    create: (data: Partial<Instance> & { name: string; versionId: string }) => Promise<Instance>;
    update: (id: string, data: Partial<Instance>) => Promise<Instance | null>;
    delete: (id: string) => Promise<boolean>;
    duplicate: (id: string, newName: string) => Promise<Instance | null>;
  };
  util: {
    openFolder: (path: string) => Promise<void>;
    openUrl: (url: string) => Promise<void>;
    getGameDir: () => Promise<string>;
  };
}

export interface LaunchOptions {
  versionId: string;
  username: string;
  uuid: string;
  accessToken: string;
  jvmArgs: string[];
  maxMemory: number;
  minMemory: number;
  gameDir?: string;
  resolution?: { width: number; height: number };
}

export interface InstallProgress {
  stage: string;
  percent: number;
  detail: string;
}

export interface Account {
  id: string;
  type: 'offline' | 'microsoft';
  username: string;
  uuid: string;
  accessToken: string;
  refreshToken?: string;
  skinUrl?: string;
  active: boolean;
  lastUsed: number;
}

export interface LauncherSettings {
  java: {
    path: string;
    maxMemory: number;
    minMemory: number;
    jvmArgs: string[];
    autoDetect: boolean;
  };
  game: {
    resolution: { width: number; height: number };
    fullscreen: boolean;
    gameDirectory: string;
    showConsole: boolean;
    autoClose: boolean;
    checkUpdates: boolean;
  };
  performance: {
    cpuPriority: 'low' | 'normal' | 'high' | 'realtime';
    gcType: 'G1GC' | 'ZGC' | 'ShenandoahGC' | 'ParallelGC';
    experimentalFlags: boolean;
    optimizedArgs: boolean;
  };
  appearance: {
    theme: 'dark' | 'midnight' | 'crimson';
    animations: boolean;
    sounds: boolean;
    reducedMotion: boolean;
    backgroundParticles: boolean;
  };
  network: {
    downloadThreads: number;
    connectionTimeout: number;
    retryAttempts: number;
    proxy: {
      enabled: boolean;
      host: string;
      port: number;
      type: 'http' | 'socks5';
    };
  };
  advanced: {
    keepLauncherOpen: boolean;
    preLaunchCommand: string;
    postExitCommand: string;
    wrapperCommand: string;
    customEnvVars: { key: string; value: string }[];
    nativesDirOverride: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export interface Instance {
  id: string;
  name: string;
  versionId: string;
  modLoader: 'none' | 'fabric' | 'forge';
  modLoaderVersion: string;
  icon: string;
  created: number;
  lastPlayed: number;
  playTime: number;
  javaMemoryMax: number;
  javaMemoryMin: number;
  jvmArgs: string[];
  resolution: { width: number; height: number };
  fullscreen: boolean;
  gameDirectory: string;
  notes: string;
}

export interface SystemInfo {
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
  cpuModel: string;
  platform: string;
  arch: string;
  hostname: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
