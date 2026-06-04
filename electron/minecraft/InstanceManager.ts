import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

export class InstanceManager {
  private instancesFile: string;
  private instancesDir: string;
  private instances: Instance[] = [];

  constructor(private gameDir: string) {
    this.instancesFile = path.join(gameDir, 'instances.json');
    this.instancesDir = path.join(gameDir, 'instances');
    this.loadInstances();
  }

  private loadInstances(): void {
    try {
      if (fs.existsSync(this.instancesFile)) {
        const data = fs.readFileSync(this.instancesFile, 'utf-8');
        this.instances = JSON.parse(data);
      }
    } catch {
      this.instances = [];
    }
  }

  private saveInstances(): void {
    try {
      const dir = path.dirname(this.instancesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.instancesFile, JSON.stringify(this.instances, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save instances:', err);
    }
  }

  getInstances(): Instance[] {
    return [...this.instances].sort((a, b) => b.lastPlayed - a.lastPlayed);
  }

  getInstance(id: string): Instance | null {
    return this.instances.find(i => i.id === id) || null;
  }

  createInstance(data: Partial<Instance> & { name: string; versionId: string }): Instance {
    const id = uuidv4();
    const instanceDir = path.join(this.instancesDir, id);

    if (!fs.existsSync(instanceDir)) {
      fs.mkdirSync(instanceDir, { recursive: true });
    }

    const instance: Instance = {
      id,
      name: data.name,
      versionId: data.versionId,
      modLoader: data.modLoader || 'none',
      modLoaderVersion: data.modLoaderVersion || '',
      icon: data.icon || 'default',
      created: Date.now(),
      lastPlayed: 0,
      playTime: 0,
      javaMemoryMax: data.javaMemoryMax || 4096,
      javaMemoryMin: data.javaMemoryMin || 1024,
      jvmArgs: data.jvmArgs || [],
      resolution: data.resolution || { width: 854, height: 480 },
      fullscreen: data.fullscreen || false,
      gameDirectory: instanceDir,
      notes: data.notes || '',
    };

    this.instances.push(instance);
    this.saveInstances();
    return instance;
  }

  updateInstance(id: string, data: Partial<Instance>): Instance | null {
    const index = this.instances.findIndex(i => i.id === id);
    if (index === -1) return null;

    const updated = { ...this.instances[index], ...data, id };
    this.instances[index] = updated;
    this.saveInstances();
    return updated;
  }

  deleteInstance(id: string): boolean {
    const index = this.instances.findIndex(i => i.id === id);
    if (index === -1) return false;

    const instance = this.instances[index];

    try {
      if (fs.existsSync(instance.gameDirectory)) {
        fs.rmSync(instance.gameDirectory, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('Failed to delete instance directory:', err);
    }

    this.instances.splice(index, 1);
    this.saveInstances();
    return true;
  }

  duplicateInstance(id: string, newName: string): Instance | null {
    const source = this.instances.find(i => i.id === id);
    if (!source) return null;

    return this.createInstance({
      name: newName,
      versionId: source.versionId,
      modLoader: source.modLoader,
      modLoaderVersion: source.modLoaderVersion,
      icon: source.icon,
      javaMemoryMax: source.javaMemoryMax,
      javaMemoryMin: source.javaMemoryMin,
      jvmArgs: [...source.jvmArgs],
      resolution: { ...source.resolution },
      fullscreen: source.fullscreen,
      notes: source.notes,
    });
  }

  markPlayed(id: string): void {
    const instance = this.instances.find(i => i.id === id);
    if (instance) {
      instance.lastPlayed = Date.now();
      this.saveInstances();
    }
  }

  addPlayTime(id: string, ms: number): void {
    const instance = this.instances.find(i => i.id === id);
    if (instance) {
      instance.playTime += ms;
      this.saveInstances();
    }
  }

  getInstanceDir(id: string): string {
    return path.join(this.instancesDir, id);
  }
}
