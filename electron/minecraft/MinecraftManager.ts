import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { spawn, execSync, ChildProcess } from 'child_process';
import { createWriteStream } from 'fs';

const VERSION_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const FABRIC_META_URL = 'https://meta.fabricmc.net/v2';
const FORGE_META_URL = 'https://files.minecraftforge.net/net/minecraftforge/forge';

interface LauncherSettings {
  java: {
    path: string;
    maxMemory: number;
    minMemory: number;
    jvmArgs: string[];
    autoDetect: boolean;
  };
  performance: {
    gcType: string;
    optimizedArgs: boolean;
    experimentalFlags: boolean;
  };
  [key: string]: any;
}

interface VersionInfo {
  id: string;
  type: string;
  url: string;
  releaseTime: string;
}

interface ProgressCallback {
  (progress: { stage: string; percent: number; detail: string }): void;
}

interface LogCallback {
  (log: string): void;
}

export class MinecraftManager {
  private gameDir: string;
  private versionsDir: string;
  private librariesDir: string;
  private assetsDir: string;
  private nativesBaseDir: string;
  private settingsFile: string;
  private gameProcess: ChildProcess | null = null;

  constructor(gameDir: string) {
    this.gameDir = gameDir;
    this.versionsDir = path.join(gameDir, 'versions');
    this.librariesDir = path.join(gameDir, 'libraries');
    this.assetsDir = path.join(gameDir, 'assets');
    this.nativesBaseDir = path.join(gameDir, 'natives');
    this.settingsFile = path.join(gameDir, 'settings.json');

    this.ensureDirectories();
  }

  private loadSettings(): LauncherSettings | null {
    try {
      if (fs.existsSync(this.settingsFile)) {
        return JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
      }
    } catch {}
    return null;
  }

  private ensureDirectories() {
    const dirs = [this.gameDir, this.versionsDir, this.librariesDir, this.assetsDir];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async getVersionManifest(): Promise<any> {
    try {
      const data = await this.httpGet(VERSION_MANIFEST_URL);
      return JSON.parse(data);
    } catch (error: any) {
      throw new Error(`Failed to fetch version manifest: ${error.message}`);
    }
  }

  async getInstalledVersions(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.versionsDir)) return [];
      const dirs = fs.readdirSync(this.versionsDir);
      return dirs.filter(dir => {
        const jsonPath = path.join(this.versionsDir, dir, `${dir}.json`);
        return fs.existsSync(jsonPath);
      });
    } catch {
      return [];
    }
  }

  async installVersion(versionId: string, onProgress: ProgressCallback): Promise<boolean> {
    try {
      onProgress({ stage: 'Fetching version info', percent: 0, detail: versionId });

      const manifest = await this.getVersionManifest();
      const versionEntry = manifest.versions.find((v: VersionInfo) => v.id === versionId);
      if (!versionEntry) throw new Error(`Version ${versionId} not found`);

      onProgress({ stage: 'Downloading version JSON', percent: 5, detail: '' });
      const versionJson = JSON.parse(await this.httpGet(versionEntry.url));

      const versionDir = path.join(this.versionsDir, versionId);
      if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true });
      fs.writeFileSync(path.join(versionDir, `${versionId}.json`), JSON.stringify(versionJson, null, 2));

      onProgress({ stage: 'Downloading client', percent: 10, detail: 'client.jar' });
      const clientUrl = versionJson.downloads?.client?.url;
      const clientJar = path.join(versionDir, `${versionId}.jar`);
      if (clientUrl && !fs.existsSync(clientJar)) {
        await this.downloadFile(clientUrl, clientJar);
      }

      const libraries = versionJson.libraries || [];
      for (let i = 0; i < libraries.length; i++) {
        const lib = libraries[i];
        const percent = 20 + Math.floor((i / libraries.length) * 50);
        
        if (lib.rules && !this.checkRules(lib.rules)) continue;

        const artifact = lib.downloads?.artifact;
        if (artifact) {
          onProgress({ stage: 'Downloading libraries', percent, detail: lib.name || '' });
          const libPath = path.join(this.librariesDir, artifact.path);
          const libDir = path.dirname(libPath);
          if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });
          if (!fs.existsSync(libPath)) {
            try {
              await this.downloadFile(artifact.url, libPath);
            } catch (e) {
              console.error(`Failed to download library: ${lib.name}`);
            }
          }
        }
      }

      onProgress({ stage: 'Downloading assets index', percent: 75, detail: '' });
      const assetIndex = versionJson.assetIndex;
      if (assetIndex) {
        const indexDir = path.join(this.assetsDir, 'indexes');
        if (!fs.existsSync(indexDir)) fs.mkdirSync(indexDir, { recursive: true });
        const indexData = await this.httpGet(assetIndex.url);
        fs.writeFileSync(path.join(indexDir, `${assetIndex.id}.json`), indexData);

        const assets = JSON.parse(indexData).objects || {};
        const assetKeys = Object.keys(assets);
        const objectsDir = path.join(this.assetsDir, 'objects');

        for (let i = 0; i < assetKeys.length; i++) {
          const asset = assets[assetKeys[i]];
          const hash = asset.hash;
          const prefix = hash.substring(0, 2);
          const assetPath = path.join(objectsDir, prefix, hash);
          const percent = 75 + Math.floor((i / assetKeys.length) * 24);

          if (i % 50 === 0) {
            onProgress({ stage: 'Downloading assets', percent, detail: `${i}/${assetKeys.length}` });
          }

          if (!fs.existsSync(assetPath)) {
            const assetDir = path.dirname(assetPath);
            if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true });
            try {
              await this.downloadFile(`https://resources.download.minecraft.net/${prefix}/${hash}`, assetPath);
            } catch (e) {
            }
          }
        }
      }

      onProgress({ stage: 'Extracting natives', percent: 99, detail: '' });
      await this.extractNatives(versionJson, versionDir);

      onProgress({ stage: 'Installation complete', percent: 100, detail: versionId });
      return true;
    } catch (error: any) {
      throw new Error(`Installation failed: ${error.message}`);
    }
  }

  async launch(options: { versionId: string; username: string; uuid: string; accessToken: string; jvmArgs: string[]; maxMemory: number; minMemory: number; gameDir?: string; resolution?: { width: number; height: number } }, onLog: LogCallback): Promise<boolean> {
    try {
      const versionDir = path.join(this.versionsDir, options.versionId);
      const versionJsonPath = path.join(versionDir, `${options.versionId}.json`);

      if (!fs.existsSync(versionJsonPath)) {
        throw new Error(`Version ${options.versionId} is not installed`);
      }

      const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));

      // Resolve the full version chain (inheritsFrom)
      const resolvedJson = this.resolveInheritance(versionJson);

      // Use settings java path or auto-detect
      const settings = this.loadSettings();
      let javaPath: string;
      if (settings?.java?.path && !settings.java.autoDetect && fs.existsSync(settings.java.path)) {
        javaPath = settings.java.path;
      } else {
        javaPath = await this.findJava();
      }

      // Build classpath from resolved (merged) version JSON
      const classpath = this.buildClasspath(resolvedJson, options.versionId);

      // Prepare natives
      const nativesDir = path.join(versionDir, 'natives');
      if (!fs.existsSync(nativesDir)) fs.mkdirSync(nativesDir, { recursive: true });
      await this.extractNatives(resolvedJson, versionDir);

      const args: string[] = [];

      // Memory
      args.push(`-Xmx${options.maxMemory}M`);
      args.push(`-Xms${options.minMemory}M`);

      // GC arguments from settings
      const gcArgs = this.buildGCArgs(settings);
      args.push(...gcArgs);

      // User JVM args
      args.push(...(options.jvmArgs || []));

      // Natives path
      args.push(`-Djava.library.path=${nativesDir}`);

      // Version-specific JVM args from version JSON (modern format)
      if (resolvedJson.arguments?.jvm) {
        for (const arg of resolvedJson.arguments.jvm) {
          if (typeof arg === 'string') {
            const replaced = arg
              .replace(/\$\{natives_directory\}/g, nativesDir)
              .replace(/\$\{launcher_name\}/g, 'M-Society')
              .replace(/\$\{launcher_version\}/g, '1.0.0')
              .replace(/\$\{classpath\}/g, classpath);
            // Skip -cp and classpath since we add them ourselves
            if (replaced !== '-cp' && replaced !== classpath) {
              args.push(replaced);
            }
          }
        }
      }

      args.push('-cp', classpath);

      // Main class
      args.push(resolvedJson.mainClass);

      // Game arguments
      const actualGameDir = options.gameDir || this.gameDir;
      const gameArgs = this.buildGameArguments(resolvedJson, {
        username: options.username,
        uuid: options.uuid,
        accessToken: options.accessToken,
        versionId: options.versionId,
        gameDir: actualGameDir,
        assetsDir: this.assetsDir,
        assetIndex: resolvedJson.assetIndex?.id || options.versionId,
        resolution: options.resolution,
      });
      args.push(...gameArgs);

      // Ensure game directory exists
      if (!fs.existsSync(actualGameDir)) fs.mkdirSync(actualGameDir, { recursive: true });

      onLog(`[M-Society] Launching Minecraft ${options.versionId}`);
      onLog(`[M-Society] Java: ${javaPath}`);
      onLog(`[M-Society] Memory: ${options.minMemory}M - ${options.maxMemory}M`);
      onLog(`[M-Society] Player: ${options.username}`);
      onLog(`[M-Society] Game dir: ${actualGameDir}`);
      onLog(`[M-Society] Natives: ${nativesDir}`);
      onLog(`[M-Society] Classpath entries: ${classpath.split(process.platform === 'win32' ? ';' : ':').length}`);
      onLog('---');

      this.gameProcess = spawn(javaPath, args, {
        cwd: actualGameDir,
        env: { ...process.env },
        detached: false,
      });

      this.gameProcess.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n').filter((l: string) => l.trim());
        lines.forEach((line: string) => onLog(line));
      });

      this.gameProcess.stderr?.on('data', (data) => {
        const lines = data.toString().split('\n').filter((l: string) => l.trim());
        lines.forEach((line: string) => onLog(`[STDERR] ${line}`));
      });

      this.gameProcess.on('error', (err) => {
        onLog(`[M-Society] Failed to start process: ${err.message}`);
        this.gameProcess = null;
      });

      this.gameProcess.on('close', (code) => {
        onLog(`[M-Society] Game process exited with code ${code}`);
        this.gameProcess = null;
      });

      return true;
    } catch (error: any) {
      onLog(`[M-Society] Launch failed: ${error.message}`);
      throw error;
    }
  }

  stopGame(): boolean {
    if (this.gameProcess) {
      this.gameProcess.kill();
      this.gameProcess = null;
      return true;
    }
    return false;
  }

  async getFabricVersions(mcVersion: string): Promise<any[]> {
    try {
      const data = await this.httpGet(`${FABRIC_META_URL}/versions/loader/${mcVersion}`);
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async getForgeVersions(mcVersion: string): Promise<any[]> {
    try {
      const data = await this.httpGet(`https://files.minecraftforge.net/net/minecraftforge/forge/maven-metadata.json`);
      const allVersions = JSON.parse(data);
      return allVersions[mcVersion] || [];
    } catch {
      return [];
    }
  }

  async installFabric(mcVersion: string, loaderVersion: string, onProgress: ProgressCallback): Promise<boolean> {
    try {
      onProgress({ stage: 'Installing Fabric', percent: 0, detail: `${mcVersion} - ${loaderVersion}` });

      const profileUrl = `${FABRIC_META_URL}/versions/loader/${mcVersion}/${loaderVersion}/profile/json`;
      const profileData = await this.httpGet(profileUrl);
      const profile = JSON.parse(profileData);

      const versionId = `fabric-loader-${loaderVersion}-${mcVersion}`;
      const versionDir = path.join(this.versionsDir, versionId);
      if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true });

      fs.writeFileSync(path.join(versionDir, `${versionId}.json`), JSON.stringify(profile, null, 2));

      const libraries = profile.libraries || [];
      for (let i = 0; i < libraries.length; i++) {
        const lib = libraries[i];
        const percent = Math.floor((i / libraries.length) * 100);
        onProgress({ stage: 'Downloading Fabric libraries', percent, detail: lib.name });

        if (lib.url) {
          const libPath = this.mavenToPath(lib.name);
          const fullPath = path.join(this.librariesDir, libPath);
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          if (!fs.existsSync(fullPath)) {
            try {
              await this.downloadFile(lib.url + libPath, fullPath);
            } catch (e) {
              console.error(`Failed to download: ${lib.name}`);
            }
          }
        }
      }

      onProgress({ stage: 'Fabric installation complete', percent: 100, detail: versionId });
      return true;
    } catch (error: any) {
      throw new Error(`Fabric installation failed: ${error.message}`);
    }
  }

  async installForge(mcVersion: string, forgeVersion: string, onProgress: ProgressCallback): Promise<boolean> {
    try {
      onProgress({ stage: 'Installing Forge', percent: 0, detail: `${mcVersion} - ${forgeVersion}` });

      const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVersion}-${forgeVersion}/forge-${mcVersion}-${forgeVersion}-installer.jar`;
      const installerPath = path.join(this.gameDir, 'temp', `forge-installer-${mcVersion}-${forgeVersion}.jar`);
      const tempDir = path.dirname(installerPath);
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      onProgress({ stage: 'Downloading Forge installer', percent: 20, detail: '' });
      await this.downloadFile(installerUrl, installerPath);

      onProgress({ stage: 'Running Forge installer', percent: 50, detail: 'This may take a while...' });
      
      const javaPath = await this.findJava();
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(javaPath, ['-jar', installerPath, '--installClient', this.gameDir], {
          cwd: this.gameDir,
        });
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Forge installer exited with code ${code}`));
        });
        proc.on('error', reject);
      });

      try { fs.unlinkSync(installerPath); } catch {}

      onProgress({ stage: 'Forge installation complete', percent: 100, detail: `${mcVersion}-forge-${forgeVersion}` });
      return true;
    } catch (error: any) {
      throw new Error(`Forge installation failed: ${error.message}`);
    }
  }

  private resolveInheritance(versionJson: any): any {
    if (!versionJson.inheritsFrom) return versionJson;

    const parentId = versionJson.inheritsFrom;
    const parentJsonPath = path.join(this.versionsDir, parentId, `${parentId}.json`);
    if (!fs.existsSync(parentJsonPath)) return versionJson;

    const parentJson = JSON.parse(fs.readFileSync(parentJsonPath, 'utf8'));
    const resolvedParent = this.resolveInheritance(parentJson);

    // Merge: child overrides parent, but libraries and arguments are concatenated
    const merged: any = { ...resolvedParent, ...versionJson };

    // Merge libraries (child first, then parent)
    merged.libraries = [
      ...(versionJson.libraries || []),
      ...(resolvedParent.libraries || []),
    ];

    // Merge game arguments
    if (resolvedParent.arguments?.game || versionJson.arguments?.game) {
      merged.arguments = merged.arguments || {};
      merged.arguments.game = [
        ...(versionJson.arguments?.game || []),
        ...(resolvedParent.arguments?.game || []),
      ];
    }

    // Merge JVM arguments
    if (resolvedParent.arguments?.jvm || versionJson.arguments?.jvm) {
      merged.arguments = merged.arguments || {};
      merged.arguments.jvm = [
        ...(versionJson.arguments?.jvm || []),
        ...(resolvedParent.arguments?.jvm || []),
      ];
    }

    // Keep minecraftArguments from parent if child doesn't have it
    if (!versionJson.minecraftArguments && resolvedParent.minecraftArguments) {
      merged.minecraftArguments = resolvedParent.minecraftArguments;
    }

    // Use parent's assetIndex/downloads if child doesn't have them
    if (!versionJson.assetIndex && resolvedParent.assetIndex) {
      merged.assetIndex = resolvedParent.assetIndex;
    }
    if (!versionJson.downloads && resolvedParent.downloads) {
      merged.downloads = resolvedParent.downloads;
    }

    delete merged.inheritsFrom;
    return merged;
  }

  private buildClasspath(versionJson: any, versionId: string): string {
    const separator = process.platform === 'win32' ? ';' : ':';
    const paths: string[] = [];
    const seen = new Set<string>();

    const libraries = versionJson.libraries || [];
    for (const lib of libraries) {
      if (lib.rules && !this.checkRules(lib.rules)) continue;

      const artifact = lib.downloads?.artifact;
      if (artifact) {
        const libPath = path.join(this.librariesDir, artifact.path);
        if (!seen.has(libPath)) {
          seen.add(libPath);
          paths.push(libPath);
        }
      } else if (lib.name && lib.url) {
        // Maven-style library (Fabric/Forge)
        const libRelPath = this.mavenToPath(lib.name);
        const libPath = path.join(this.librariesDir, libRelPath);
        if (!seen.has(libPath)) {
          seen.add(libPath);
          paths.push(libPath);
        }
      }
    }

    // Add client jar
    const clientJar = path.join(this.versionsDir, versionId, `${versionId}.jar`);
    if (fs.existsSync(clientJar)) {
      paths.push(clientJar);
    }

    // Only include paths that actually exist on disk
    return paths.filter(p => fs.existsSync(p)).join(separator);
  }

  private buildGameArguments(versionJson: any, opts: any): string[] {
    const args: string[] = [];

    if (versionJson.arguments?.game) {
      for (const arg of versionJson.arguments.game) {
        if (typeof arg === 'string') {
          args.push(this.replaceArgPlaceholders(arg, opts));
        }
      }
    } else if (versionJson.minecraftArguments) {
      const parts = versionJson.minecraftArguments.split(' ');
      for (const part of parts) {
        args.push(this.replaceArgPlaceholders(part, opts));
      }
    }

    if (opts.resolution) {
      args.push('--width', String(opts.resolution.width));
      args.push('--height', String(opts.resolution.height));
    }

    return args;
  }

  private replaceArgPlaceholders(arg: string, opts: any): string {
    return arg
      .replace('${auth_player_name}', opts.username)
      .replace('${version_name}', opts.versionId)
      .replace('${game_directory}', opts.gameDir)
      .replace('${assets_root}', opts.assetsDir)
      .replace('${assets_index_name}', opts.assetIndex)
      .replace('${auth_uuid}', opts.uuid)
      .replace('${auth_access_token}', opts.accessToken)
      .replace('${user_type}', 'msa')
      .replace('${version_type}', 'release')
      .replace('${user_properties}', '{}');
  }

  private checkRules(rules: any[]): boolean {
    let dominated = false;
    for (const rule of rules) {
      const action = rule.action === 'allow';
      if (rule.os) {
        const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
        if (rule.os.name === osName) dominated = action;
      } else {
        dominated = action;
      }
    }
    return dominated;
  }

  private mavenToPath(maven: string): string {
    const parts = maven.split(':');
    const group = parts[0].replace(/\./g, '/');
    const artifact = parts[1];
    const version = parts[2];
    return `${group}/${artifact}/${version}/${artifact}-${version}.jar`;
  }

  private buildGCArgs(settings: LauncherSettings | null): string[] {
    const args: string[] = [];
    const gcType = settings?.performance?.gcType || 'G1GC';

    switch (gcType) {
      case 'G1GC':
        args.push('-XX:+UseG1GC');
        args.push('-XX:G1HeapRegionSize=16M');
        args.push('-XX:MaxGCPauseMillis=50');
        break;
      case 'ZGC':
        args.push('-XX:+UseZGC');
        break;
      case 'ShenandoahGC':
        args.push('-XX:+UseShenandoahGC');
        break;
      case 'ParallelGC':
        args.push('-XX:+UseParallelGC');
        break;
    }

    if (settings?.performance?.optimizedArgs) {
      args.push('-XX:+UnlockExperimentalVMOptions');
      args.push('-XX:+ParallelRefProcEnabled');
      args.push('-XX:+AlwaysPreTouch');
      args.push('-XX:+DisableExplicitGC');
    }

    return args;
  }

  private async extractNatives(versionJson: any, versionDir: string): Promise<void> {
    const nativesDir = path.join(versionDir, 'natives');
    if (!fs.existsSync(nativesDir)) fs.mkdirSync(nativesDir, { recursive: true });

    const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
    const osKey = process.platform === 'win32' ? 'natives-windows' : process.platform === 'darwin' ? 'natives-macos' : 'natives-linux';

    for (const lib of (versionJson.libraries || [])) {
      if (lib.rules && !this.checkRules(lib.rules)) continue;

      const classifiers = lib.downloads?.classifiers;

      // Method 1: classifiers with osKey (e.g. natives-windows)
      if (classifiers && classifiers[osKey]) {
        const native = classifiers[osKey];
        const nativePath = path.join(this.librariesDir, native.path);
        const nativeDir = path.dirname(nativePath);
        if (!fs.existsSync(nativeDir)) fs.mkdirSync(nativeDir, { recursive: true });
        if (!fs.existsSync(nativePath)) {
          try { await this.downloadFile(native.url, nativePath); } catch {}
        }
        if (fs.existsSync(nativePath)) {
          try {
            const extractZip = require('extract-zip');
            await extractZip(nativePath, { dir: nativesDir });
          } catch {}
        }
      }

      // Method 2: lib.natives map (older format)
      if (lib.natives) {
        const classifierKey = lib.natives[osName];
        if (classifierKey) {
          const resolvedKey = classifierKey.replace('${arch}', process.arch === 'x64' ? '64' : '32');
          if (classifiers?.[resolvedKey]) {
            const native = classifiers[resolvedKey];
            const nativePath = path.join(this.librariesDir, native.path);
            const nativeDir = path.dirname(nativePath);
            if (!fs.existsSync(nativeDir)) fs.mkdirSync(nativeDir, { recursive: true });
            if (!fs.existsSync(nativePath)) {
              try { await this.downloadFile(native.url, nativePath); } catch {}
            }
            if (fs.existsSync(nativePath)) {
              try {
                const extractZip = require('extract-zip');
                await extractZip(nativePath, { dir: nativesDir });
              } catch {}
            }
          }
        }
      }

      // Method 3: Modern Minecraft (1.19.3+) - natives are regular artifacts with OS in the name
      if (!classifiers && !lib.natives && lib.downloads?.artifact) {
        const name: string = lib.name || '';
        if (name.includes('natives-windows') || name.includes('natives-linux') || name.includes('natives-macos')) {
          const isForThisOS =
            (process.platform === 'win32' && name.includes('natives-windows')) ||
            (process.platform === 'darwin' && name.includes('natives-macos')) ||
            (process.platform === 'linux' && name.includes('natives-linux'));
          if (isForThisOS) {
            const artifact = lib.downloads.artifact;
            const nativePath = path.join(this.librariesDir, artifact.path);
            if (fs.existsSync(nativePath)) {
              try {
                const extractZip = require('extract-zip');
                await extractZip(nativePath, { dir: nativesDir });
              } catch {}
            }
          }
        }
      }
    }

    // Clean up META-INF from natives dir
    const metaInf = path.join(nativesDir, 'META-INF');
    if (fs.existsSync(metaInf)) {
      try { fs.rmSync(metaInf, { recursive: true, force: true }); } catch {}
    }
  }

  private async findJava(): Promise<string> {
    const javaHome = process.env.JAVA_HOME;
    if (javaHome) {
      const javaBin = path.join(javaHome, 'bin', process.platform === 'win32' ? 'javaw.exe' : 'java');
      if (fs.existsSync(javaBin)) return javaBin;
      const javaAlt = path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
      if (fs.existsSync(javaAlt)) return javaAlt;
    }

    if (process.platform === 'win32') {
      const commonPaths = [
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Java'),
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Eclipse Adoptium'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Java'),
      ];
      for (const base of commonPaths) {
        if (fs.existsSync(base)) {
          const jdks = fs.readdirSync(base).sort().reverse();
          for (const jdk of jdks) {
            const javaw = path.join(base, jdk, 'bin', 'javaw.exe');
            if (fs.existsSync(javaw)) return javaw;
          }
        }
      }
    }

    try {
      const cmd = process.platform === 'win32' ? 'where java' : 'which java';
      const result = execSync(cmd, { encoding: 'utf8' }).trim().split('\n')[0];
      if (result && fs.existsSync(result)) return result;
    } catch {}

    return process.platform === 'win32' ? 'javaw.exe' : 'java';
  }

  private httpGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      protocol.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          this.httpGet(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  private downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

      const protocol = url.startsWith('https') ? https : http;
      protocol.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          this.downloadFile(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
          return;
        }
        const file = createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
  }
}
