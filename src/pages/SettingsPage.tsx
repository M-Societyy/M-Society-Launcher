import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Cpu, Monitor, Network, Wrench, Save, RotateCcw, HardDrive, Gauge } from 'lucide-react';
import { SoundManager } from '../utils/SoundManager';
import type { LauncherSettings, SystemInfo } from '../types/electron';

type SettingsTab = 'java' | 'game' | 'performance' | 'appearance' | 'network' | 'advanced';

function SettingsPage() {
  const [settings, setSettings] = useState<LauncherSettings | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('java');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [s, sys] = await Promise.all([
        window.electronAPI?.settings.get(),
        window.electronAPI?.settings.getSystemInfo(),
      ]);
      if (s) setSettings(s);
      if (sys) setSystemInfo(sys);
    } catch {}
  }

  async function handleSave() {
    if (!settings) return;
    try {
      await window.electronAPI?.settings.update(settings);
      setSaved(true);
      SoundManager.play('success');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      SoundManager.play('error');
    }
  }

  function updateSetting(path: string, value: any) {
    if (!settings) return;
    const keys = path.split('.');
    const newSettings = JSON.parse(JSON.stringify(settings));
    let obj = newSettings;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setSettings(newSettings);
  }

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'java', label: 'Java / Memory', icon: Cpu },
    { id: 'game', label: 'Game', icon: Monitor },
    { id: 'performance', label: 'Performance', icon: Gauge },
    { id: 'appearance', label: 'Appearance', icon: Settings },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'advanced', label: 'Advanced', icon: Wrench },
  ];

  if (!settings) return <div className="text-white/50 text-center py-20">Loading settings...</div>;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings size={24} className="text-ms-purple-400" />
            Settings
          </h1>
          <p className="text-sm text-white/40 mt-1">Configure every aspect of your launcher experience</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSettings} className="btn-secondary flex items-center gap-2 text-sm">
            <RotateCcw size={14} /> Reset
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Save size={14} /> {saved ? 'Saved!' : 'Save Settings'}
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ms-dark-800 rounded-lg p-1 border border-white/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); SoundManager.play('click'); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-ms-purple-700 text-white shadow-lg shadow-ms-purple-900/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* System Info Bar */}
      {systemInfo && (
        <div className="flex gap-4 text-xs text-white/40 bg-ms-dark-800/30 rounded-lg px-4 py-2 border border-white/5">
          <span className="flex items-center gap-1"><HardDrive size={11} /> RAM: {Math.round(systemInfo.totalMemory / 1024)}GB</span>
          <span className="flex items-center gap-1"><Cpu size={11} /> {systemInfo.cpuCount} cores</span>
          <span>{systemInfo.cpuModel}</span>
        </div>
      )}

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {activeTab === 'java' && (
            <div className="space-y-4">
              <SettingGroup title="Memory Allocation">
                <SettingRow label="Maximum RAM (MB)" description={`System total: ${systemInfo?.totalMemory || 0}MB`}>
                  <input
                    type="number"
                    value={settings.java.maxMemory}
                    onChange={(e) => updateSetting('java.maxMemory', parseInt(e.target.value))}
                    min={512}
                    max={systemInfo?.totalMemory || 16384}
                    step={256}
                    className="input-field w-32 text-right"
                  />
                </SettingRow>
                <SettingRow label="Minimum RAM (MB)">
                  <input
                    type="number"
                    value={settings.java.minMemory}
                    onChange={(e) => updateSetting('java.minMemory', parseInt(e.target.value))}
                    min={256}
                    max={settings.java.maxMemory}
                    step={256}
                    className="input-field w-32 text-right"
                  />
                </SettingRow>
                <div className="pt-2">
                  <div className="h-2 bg-ms-dark-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-ms-purple-500 to-ms-red-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (settings.java.maxMemory / (systemInfo?.totalMemory || 16384)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/30 mt-1">
                    Using {Math.round((settings.java.maxMemory / (systemInfo?.totalMemory || 16384)) * 100)}% of system RAM
                  </p>
                </div>
              </SettingGroup>

              <SettingGroup title="Java Configuration">
                <SettingRow label="Java Path" description="Leave empty for auto-detection">
                  <input
                    type="text"
                    value={settings.java.path}
                    onChange={(e) => updateSetting('java.path', e.target.value)}
                    placeholder="Auto-detect"
                    className="input-field w-64"
                  />
                </SettingRow>
                <SettingRow label="JVM Arguments" description="Space-separated custom JVM flags">
                  <input
                    type="text"
                    value={settings.java.jvmArgs.join(' ')}
                    onChange={(e) => updateSetting('java.jvmArgs', e.target.value.split(' ').filter(Boolean))}
                    placeholder="-XX:+UseG1GC"
                    className="input-field w-64 font-mono text-xs"
                  />
                </SettingRow>
              </SettingGroup>
            </div>
          )}

          {activeTab === 'game' && (
            <div className="space-y-4">
              <SettingGroup title="Display">
                <SettingRow label="Resolution Width">
                  <input
                    type="number"
                    value={settings.game.resolution.width}
                    onChange={(e) => updateSetting('game.resolution.width', parseInt(e.target.value))}
                    className="input-field w-28 text-right"
                  />
                </SettingRow>
                <SettingRow label="Resolution Height">
                  <input
                    type="number"
                    value={settings.game.resolution.height}
                    onChange={(e) => updateSetting('game.resolution.height', parseInt(e.target.value))}
                    className="input-field w-28 text-right"
                  />
                </SettingRow>
                <SettingRow label="Fullscreen">
                  <Toggle value={settings.game.fullscreen} onChange={(v) => updateSetting('game.fullscreen', v)} />
                </SettingRow>
              </SettingGroup>
              <SettingGroup title="Behavior">
                <SettingRow label="Show Console">
                  <Toggle value={settings.game.showConsole} onChange={(v) => updateSetting('game.showConsole', v)} />
                </SettingRow>
                <SettingRow label="Auto-close Launcher">
                  <Toggle value={settings.game.autoClose} onChange={(v) => updateSetting('game.autoClose', v)} />
                </SettingRow>
                <SettingRow label="Check for Updates">
                  <Toggle value={settings.game.checkUpdates} onChange={(v) => updateSetting('game.checkUpdates', v)} />
                </SettingRow>
              </SettingGroup>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-4">
              <SettingGroup title="Process Priority">
                <SettingRow label="CPU Priority">
                  <select
                    value={settings.performance.cpuPriority}
                    onChange={(e) => updateSetting('performance.cpuPriority', e.target.value)}
                    className="input-field w-40"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="realtime">Realtime</option>
                  </select>
                </SettingRow>
              </SettingGroup>
              <SettingGroup title="Garbage Collector">
                <SettingRow label="GC Type" description="Recommended: G1GC for most setups">
                  <select
                    value={settings.performance.gcType}
                    onChange={(e) => updateSetting('performance.gcType', e.target.value)}
                    className="input-field w-48"
                  >
                    <option value="G1GC">G1 Garbage Collector</option>
                    <option value="ZGC">Z Garbage Collector</option>
                    <option value="ShenandoahGC">Shenandoah GC</option>
                    <option value="ParallelGC">Parallel GC</option>
                  </select>
                </SettingRow>
                <SettingRow label="Optimized Arguments" description="Use pre-tuned JVM flags for Minecraft">
                  <Toggle value={settings.performance.optimizedArgs} onChange={(v) => updateSetting('performance.optimizedArgs', v)} />
                </SettingRow>
                <SettingRow label="Experimental Flags">
                  <Toggle value={settings.performance.experimentalFlags} onChange={(v) => updateSetting('performance.experimentalFlags', v)} />
                </SettingRow>
              </SettingGroup>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <SettingGroup title="Visual">
                <SettingRow label="Theme">
                  <select
                    value={settings.appearance.theme}
                    onChange={(e) => updateSetting('appearance.theme', e.target.value)}
                    className="input-field w-40"
                  >
                    <option value="dark">Dark</option>
                    <option value="midnight">Midnight</option>
                    <option value="crimson">Crimson</option>
                  </select>
                </SettingRow>
                <SettingRow label="Animations">
                  <Toggle value={settings.appearance.animations} onChange={(v) => updateSetting('appearance.animations', v)} />
                </SettingRow>
                <SettingRow label="Background Particles">
                  <Toggle value={settings.appearance.backgroundParticles} onChange={(v) => updateSetting('appearance.backgroundParticles', v)} />
                </SettingRow>
                <SettingRow label="Reduced Motion">
                  <Toggle value={settings.appearance.reducedMotion} onChange={(v) => updateSetting('appearance.reducedMotion', v)} />
                </SettingRow>
              </SettingGroup>
              <SettingGroup title="Audio">
                <SettingRow label="UI Sounds">
                  <Toggle value={settings.appearance.sounds} onChange={(v) => updateSetting('appearance.sounds', v)} />
                </SettingRow>
              </SettingGroup>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="space-y-4">
              <SettingGroup title="Downloads">
                <SettingRow label="Download Threads" description="More threads = faster downloads but more bandwidth">
                  <input
                    type="number"
                    value={settings.network.downloadThreads}
                    onChange={(e) => updateSetting('network.downloadThreads', parseInt(e.target.value))}
                    min={1}
                    max={16}
                    className="input-field w-24 text-right"
                  />
                </SettingRow>
                <SettingRow label="Connection Timeout (ms)">
                  <input
                    type="number"
                    value={settings.network.connectionTimeout}
                    onChange={(e) => updateSetting('network.connectionTimeout', parseInt(e.target.value))}
                    className="input-field w-32 text-right"
                  />
                </SettingRow>
                <SettingRow label="Retry Attempts">
                  <input
                    type="number"
                    value={settings.network.retryAttempts}
                    onChange={(e) => updateSetting('network.retryAttempts', parseInt(e.target.value))}
                    min={0}
                    max={10}
                    className="input-field w-24 text-right"
                  />
                </SettingRow>
              </SettingGroup>
              <SettingGroup title="Proxy">
                <SettingRow label="Enable Proxy">
                  <Toggle value={settings.network.proxy.enabled} onChange={(v) => updateSetting('network.proxy.enabled', v)} />
                </SettingRow>
                {settings.network.proxy.enabled && (
                  <>
                    <SettingRow label="Proxy Host">
                      <input
                        type="text"
                        value={settings.network.proxy.host}
                        onChange={(e) => updateSetting('network.proxy.host', e.target.value)}
                        className="input-field w-48"
                      />
                    </SettingRow>
                    <SettingRow label="Proxy Port">
                      <input
                        type="number"
                        value={settings.network.proxy.port}
                        onChange={(e) => updateSetting('network.proxy.port', parseInt(e.target.value))}
                        className="input-field w-28 text-right"
                      />
                    </SettingRow>
                    <SettingRow label="Proxy Type">
                      <select
                        value={settings.network.proxy.type}
                        onChange={(e) => updateSetting('network.proxy.type', e.target.value)}
                        className="input-field w-32"
                      >
                        <option value="http">HTTP</option>
                        <option value="socks5">SOCKS5</option>
                      </select>
                    </SettingRow>
                  </>
                )}
              </SettingGroup>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <SettingGroup title="Launcher Behavior">
                <SettingRow label="Keep Launcher Open">
                  <Toggle value={settings.advanced.keepLauncherOpen} onChange={(v) => updateSetting('advanced.keepLauncherOpen', v)} />
                </SettingRow>
                <SettingRow label="Log Level">
                  <select
                    value={settings.advanced.logLevel}
                    onChange={(e) => updateSetting('advanced.logLevel', e.target.value)}
                    className="input-field w-32"
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </SettingRow>
              </SettingGroup>
              <SettingGroup title="Commands">
                <SettingRow label="Pre-launch Command">
                  <input
                    type="text"
                    value={settings.advanced.preLaunchCommand}
                    onChange={(e) => updateSetting('advanced.preLaunchCommand', e.target.value)}
                    placeholder="Command to run before launch"
                    className="input-field w-64 font-mono text-xs"
                  />
                </SettingRow>
                <SettingRow label="Post-exit Command">
                  <input
                    type="text"
                    value={settings.advanced.postExitCommand}
                    onChange={(e) => updateSetting('advanced.postExitCommand', e.target.value)}
                    placeholder="Command to run after game exits"
                    className="input-field w-64 font-mono text-xs"
                  />
                </SettingRow>
                <SettingRow label="Wrapper Command">
                  <input
                    type="text"
                    value={settings.advanced.wrapperCommand}
                    onChange={(e) => updateSetting('advanced.wrapperCommand', e.target.value)}
                    placeholder="e.g., mangohud"
                    className="input-field w-64 font-mono text-xs"
                  />
                </SettingRow>
              </SettingGroup>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel p-5">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-white/30 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => { onChange(!value); SoundManager.play('click'); }}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
        value ? 'bg-ms-purple-600' : 'bg-ms-dark-600'
      }`}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
        animate={{ left: value ? '24px' : '4px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

export default SettingsPage;
