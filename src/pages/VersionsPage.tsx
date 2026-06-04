import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Check, Search, Filter, Package, RefreshCw } from 'lucide-react';
import { SoundManager } from '../utils/SoundManager';

interface VersionEntry {
  id: string;
  type: string;
  releaseTime: string;
}

function VersionsPage() {
  const [allVersions, setAllVersions] = useState<VersionEntry[]>([]);
  const [installedVersions, setInstalledVersions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'release' | 'snapshot' | 'old_beta' | 'old_alpha'>('release');
  const [installing, setInstalling] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ percent: number; stage: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVersions();
    window.electronAPI?.minecraft.onInstallProgress((p) => {
      setProgress({ percent: p.percent, stage: p.stage });
      if (p.percent >= 100) {
        setTimeout(() => {
          setInstalling(null);
          setProgress(null);
          loadInstalled();
          SoundManager.play('success');
        }, 500);
      }
    });
    return () => {
      window.electronAPI?.minecraft.removeProgressListener();
    };
  }, []);

  async function loadVersions() {
    setLoading(true);
    try {
      const manifest = await window.electronAPI?.minecraft.getVersionManifest();
      if (manifest?.versions) {
        setAllVersions(manifest.versions);
      }
      await loadInstalled();
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadInstalled() {
    const installed = await window.electronAPI?.minecraft.getInstalledVersions();
    if (installed) setInstalledVersions(installed);
  }

  async function handleInstall(versionId: string) {
    try {
      setInstalling(versionId);
      SoundManager.play('click');
      await window.electronAPI?.minecraft.installVersion(versionId);
    } catch (err: any) {
      SoundManager.play('error');
      setInstalling(null);
      setProgress(null);
    }
  }

  const filteredVersions = allVersions.filter((v) => {
    if (filter !== 'all' && v.type !== filter) return false;
    if (searchQuery && !v.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package size={24} className="text-ms-purple-400" />
            Minecraft Versions
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {allVersions.length} versions available | {installedVersions.length} installed
          </p>
        </div>
        <button onClick={loadVersions} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search versions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-1 bg-ms-dark-800 rounded-lg p-1 border border-white/5">
          {(['release', 'snapshot', 'old_beta', 'old_alpha', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); SoundManager.play('click'); }}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                filter === f
                  ? 'bg-ms-purple-700 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {f === 'all' ? 'All' : f === 'old_beta' ? 'Beta' : f === 'old_alpha' ? 'Alpha' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Install Progress */}
      {installing && progress && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-panel p-4"
        >
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/70">Installing {installing}</span>
            <span className="text-ms-purple-400 font-mono">{progress.percent}%</span>
          </div>
          <div className="h-2 bg-ms-dark-900 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-ms-purple-500 to-ms-red-500 rounded-full"
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-white/40 mt-1">{progress.stage}</p>
        </motion.div>
      )}

      {/* Version List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-8 h-8 border-2 border-ms-purple-500 border-t-transparent rounded-full"
            />
          </div>
        ) : filteredVersions.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <Filter size={32} className="mx-auto mb-3 opacity-50" />
            <p>No versions match your filters</p>
          </div>
        ) : (
          filteredVersions.slice(0, 100).map((version, index) => {
            const isInstalled = installedVersions.includes(version.id);
            const isInstalling = installing === version.id;

            return (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.01, duration: 0.2 }}
                className="flex items-center justify-between p-3 rounded-lg bg-ms-dark-800/40 hover:bg-ms-dark-700/60 border border-transparent hover:border-white/5 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    version.type === 'release' ? 'bg-green-500' :
                    version.type === 'snapshot' ? 'bg-yellow-500' :
                    'bg-white/30'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-white">{version.id}</p>
                    <p className="text-xs text-white/30">
                      {version.type} | {new Date(version.releaseTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  {isInstalled ? (
                    <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                      <Check size={14} /> Installed
                    </span>
                  ) : isInstalling ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-ms-purple-500 border-t-transparent rounded-full"
                    />
                  ) : (
                    <button
                      onClick={() => handleInstall(version.id)}
                      disabled={!!installing}
                      className="opacity-0 group-hover:opacity-100 btn-secondary flex items-center gap-1 text-xs py-1.5 px-3 disabled:opacity-30"
                    >
                      <Download size={12} /> Install
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default VersionsPage;
