import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

const DEFAULT_SETTINGS: LauncherSettings = {
  java: {
    path: '',
    maxMemory: 4096,
    minMemory: 1024,
    jvmArgs: [],
    autoDetect: true,
  },
  game: {
    resolution: { width: 1280, height: 720 },
    fullscreen: false,
    gameDirectory: '',
    showConsole: true,
    autoClose: false,
    checkUpdates: true,
  },
  performance: {
    cpuPriority: 'normal',
    gcType: 'G1GC',
    experimentalFlags: false,
    optimizedArgs: true,
  },
  appearance: {
    theme: 'dark',
    animations: true,
    sounds: true,
    reducedMotion: false,
    backgroundParticles: true,
  },
  network: {
    downloadThreads: 4,
    connectionTimeout: 30000,
    retryAttempts: 3,
    proxy: {
      enabled: false,
      host: '',
      port: 8080,
      type: 'http',
    },
  },
  advanced: {
    keepLauncherOpen: true,
    preLaunchCommand: '',
    postExitCommand: '',
    wrapperCommand: '',
    customEnvVars: [],
    nativesDirOverride: '',
    logLevel: 'info',
  },
};

export class SettingsManager {
  private settingsFile: string;
  private settings: LauncherSettings;
  private gameDir: string;

  constructor(gameDir: string) {
    this.gameDir = gameDir;
    this.settingsFile = path.join(gameDir, 'settings.json');
    this.settings = this.loadSettings();
  }

  private loadSettings(): LauncherSettings {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, 'utf8');
        const loaded = JSON.parse(data);
        return this.mergeSettings(DEFAULT_SETTINGS, loaded);
      }
    } catch {}
    return { ...DEFAULT_SETTINGS, game: { ...DEFAULT_SETTINGS.game, gameDirectory: this.gameDir } };
  }

  private mergeSettings(defaults: any, loaded: any): any {
    const result: any = {};
    for (const key of Object.keys(defaults)) {
      if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key]) && defaults[key] !== null) {
        result[key] = this.mergeSettings(defaults[key], loaded[key] || {});
      } else {
        result[key] = loaded[key] !== undefined ? loaded[key] : defaults[key];
      }
    }
    return result;
  }

  private saveSettings() {
    const dir = path.dirname(this.settingsFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2));
  }

  getSettings(): LauncherSettings {
    return this.settings;
  }

  updateSettings(newSettings: Partial<LauncherSettings>): LauncherSettings {
    this.settings = this.mergeSettings(this.settings, newSettings);
    this.saveSettings();
    return this.settings;
  }

  getSystemInfo(): {
    totalMemory: number;
    freeMemory: number;
    cpuCount: number;
    cpuModel: string;
    platform: string;
    arch: string;
    hostname: string;
  } {
    return {
      totalMemory: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemory: Math.round(os.freemem() / (1024 * 1024)),
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
    };
  }
}
