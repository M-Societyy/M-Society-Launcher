import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Puzzle, Download, Check, RefreshCw } from 'lucide-react';
import { SoundManager } from '../utils/SoundManager';

function ModLoadersPage() {
  const [installedVersions, setInstalledVersions] = useState<string[]>([]);
  const [selectedMcVersion, setSelectedMcVersion] = useState('');
  const [loaderType, setLoaderType] = useState<'fabric' | 'forge'>('fabric');
  const [loaderVersions, setLoaderVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadInstalledVersions();
  }, []);

  async function loadInstalledVersions() {
    try {
      const versions = await window.electronAPI?.minecraft.getInstalledVersions();
      if (versions) {
        const baseVersions = versions.filter((v: string) => !v.includes('fabric') && !v.includes('forge'));
        setInstalledVersions(baseVersions);
        if (baseVersions.length > 0) setSelectedMcVersion(baseVersions[0]);
      }
    } catch {}
  }

  async function loadLoaderVersions() {
    if (!selectedMcVersion) return;
    setLoading(true);
    try {
      let versions;
      if (loaderType === 'fabric') {
        versions = await window.electronAPI?.minecraft.getFabricVersions(selectedMcVersion);
      } else {
        versions = await window.electronAPI?.minecraft.getForgeVersions(selectedMcVersion);
      }
      setLoaderVersions(versions || []);
    } catch {
      setLoaderVersions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedMcVersion) loadLoaderVersions();
  }, [selectedMcVersion, loaderType]);

  async function handleInstall(loaderVersion: string) {
    try {
      setInstalling(true);
      setStatus('Installing...');
      SoundManager.play('click');

      if (loaderType === 'fabric') {
        await window.electronAPI?.minecraft.installFabric(selectedMcVersion, loaderVersion);
      } else {
        await window.electronAPI?.minecraft.installForge(selectedMcVersion, loaderVersion);
      }

      setStatus('Installation complete!');
      SoundManager.play('success');
      await loadInstalledVersions();
    } catch (err: any) {
      setStatus(`Failed: ${err.message}`);
      SoundManager.play('error');
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Puzzle size={24} className="text-ms-purple-400" />
          Mod Loaders
        </h1>
        <p className="text-sm text-white/40 mt-1">Install Fabric or Forge for your Minecraft versions</p>
      </div>

      {/* Loader Type Selector */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setLoaderType('fabric'); SoundManager.play('click'); }}
          className={`flex-1 p-4 rounded-xl border transition-all duration-300 ${
            loaderType === 'fabric'
              ? 'bg-ms-purple-900/40 border-ms-purple-600/50 shadow-lg shadow-ms-purple-900/20'
              : 'bg-ms-dark-800/40 border-white/5 hover:border-white/10'
          }`}
        >
          <h3 className="text-lg font-bold text-white">Fabric</h3>
          <p className="text-xs text-white/40 mt-1">Lightweight, modern modding framework</p>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setLoaderType('forge'); SoundManager.play('click'); }}
          className={`flex-1 p-4 rounded-xl border transition-all duration-300 ${
            loaderType === 'forge'
              ? 'bg-ms-red-900/40 border-ms-red-600/50 shadow-lg shadow-ms-red-900/20'
              : 'bg-ms-dark-800/40 border-white/5 hover:border-white/10'
          }`}
        >
          <h3 className="text-lg font-bold text-white">Forge</h3>
          <p className="text-xs text-white/40 mt-1">Classic modding platform, huge mod library</p>
        </motion.button>
      </div>

      {/* MC Version Selector */}
      <div className="glass-panel p-4">
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">
          Minecraft Version
        </label>
        <div className="flex gap-3">
          <select
            value={selectedMcVersion}
            onChange={(e) => setSelectedMcVersion(e.target.value)}
            className="input-field flex-1"
          >
            {installedVersions.length === 0 && <option value="">No versions installed</option>}
            {installedVersions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <button onClick={loadLoaderVersions} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-ms-purple-300 font-medium"
        >
          {status}
        </motion.p>
      )}

      {/* Loader Versions List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-8 h-8 border-2 border-ms-purple-500 border-t-transparent rounded-full"
            />
          </div>
        ) : loaderVersions.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <p>No {loaderType} versions available for {selectedMcVersion || 'selected version'}</p>
          </div>
        ) : (
          loaderVersions.slice(0, 30).map((version: any, index: number) => {
            const versionId = loaderType === 'fabric' ? version.loader?.version : version;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center justify-between p-3 rounded-lg bg-ms-dark-800/40 hover:bg-ms-dark-700/60 border border-transparent hover:border-white/5 transition-all group"
              >
                <div>
                  <p className="text-sm font-medium text-white">{versionId}</p>
                  {loaderType === 'fabric' && version.loader?.stable !== undefined && (
                    <p className="text-xs text-white/30">
                      {version.loader.stable ? 'Stable' : 'Unstable'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleInstall(versionId)}
                  disabled={installing}
                  className="opacity-0 group-hover:opacity-100 btn-secondary flex items-center gap-1 text-xs py-1.5 px-3 disabled:opacity-30"
                >
                  <Download size={12} /> Install
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ModLoadersPage;
