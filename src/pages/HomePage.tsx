import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, User, ChevronDown, Activity } from 'lucide-react';
import { SoundManager } from '../utils/SoundManager';
import Logo from '../components/Logo';
import type { Account, InstallProgress } from '../types/electron';

function HomePage() {
  const [versions, setVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState('Ready to play');

  useEffect(() => {
    loadData();
    window.electronAPI?.minecraft.onInstallProgress((p) => {
      setProgress(p);
    });
    return () => {
      window.electronAPI?.minecraft.removeProgressListener();
    };
  }, []);

  async function loadData() {
    try {
      const installed = await window.electronAPI?.minecraft.getInstalledVersions();
      if (installed) setVersions(installed);
      if (installed && installed.length > 0 && !selectedVersion) {
        setSelectedVersion(installed[0]);
      }
      const account = await window.electronAPI?.accounts.getActive();
      if (account) setActiveAccount(account);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  async function handleLaunch() {
    if (!selectedVersion) {
      setStatusMessage('Select a version first');
      SoundManager.play('error');
      return;
    }
    if (!activeAccount) {
      setStatusMessage('Add an account first');
      SoundManager.play('error');
      return;
    }

    try {
      setIsLaunching(true);
      setStatusMessage('Launching...');
      SoundManager.play('launch');

      const settings = await window.electronAPI?.settings.get();
      await window.electronAPI?.minecraft.launch({
        versionId: selectedVersion,
        username: activeAccount.username,
        uuid: activeAccount.uuid,
        accessToken: activeAccount.accessToken,
        jvmArgs: settings?.java.jvmArgs || [],
        maxMemory: settings?.java.maxMemory || 4096,
        minMemory: settings?.java.minMemory || 1024,
        resolution: settings?.game.resolution,
      });

      setIsRunning(true);
      setStatusMessage('Game is running');
      SoundManager.play('success');
    } catch (err: any) {
      setStatusMessage(`Launch failed: ${err.message}`);
      SoundManager.play('error');
    } finally {
      setIsLaunching(false);
    }
  }

  async function handleStop() {
    try {
      await window.electronAPI?.minecraft.stop();
      setIsRunning(false);
      setStatusMessage('Game stopped');
    } catch {}
  }

  return (
    <div className="h-full flex flex-col">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col justify-center max-w-2xl"
      >
        <div className="mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05, duration: 0.4 }}
            className="mb-6"
          >
            <Logo size={190} />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-black tracking-tight text-white leading-[1.1]"
          >
            Ready to<br /><span className="text-gradient">Play</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/35 text-sm mt-4 max-w-md leading-relaxed"
          >
            {statusMessage}
          </motion.p>
        </div>

        {/* Version + Account Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-4 mb-8"
        >
          {/* Version Selector */}
          <div className="relative flex-1">
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="input-field appearance-none cursor-pointer pr-10"
            >
              {versions.length === 0 && <option value="">No versions installed</option>}
              {versions.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          </div>

          {/* Account Chip */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(139,0,255,0.3), rgba(220,20,60,0.2))' }}>
              <User size={14} className="text-white/80" />
            </div>
            <div>
              <p className="text-xs font-medium text-white/80">{activeAccount?.username || 'No account'}</p>
              <p className="text-[10px] text-white/30 capitalize">{activeAccount?.type || 'offline'}</p>
            </div>
          </div>
        </motion.div>

        {/* Progress */}
        {progress && progress.percent < 100 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6"
          >
            <div className="flex justify-between text-[11px] text-white/40 mb-2">
              <span>{progress.stage}</span>
              <span className="font-mono">{progress.percent}%</span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #8b00ff, #dc143c)' }}
                animate={{ width: `${progress.percent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* Launch Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {!isRunning ? (
            <motion.button
              onClick={handleLaunch}
              disabled={isLaunching}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary w-full max-w-xs py-4 text-sm flex items-center justify-center gap-3 uppercase tracking-wider"
            >
              {isLaunching ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full" />
                  Launching...
                </>
              ) : (
                <>
                  <Play size={16} fill="white" strokeWidth={0} />
                  Launch Game
                </>
              )}
            </motion.button>
          ) : (
            <motion.button
              onClick={handleStop}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full max-w-xs py-4 text-sm flex items-center justify-center gap-3 rounded-xl font-semibold uppercase tracking-wider text-white transition-all"
              style={{ background: 'rgba(220, 20, 60, 0.8)', boxShadow: '0 4px 20px rgba(220,20,60,0.2)' }}
            >
              <Square size={14} fill="white" strokeWidth={0} />
              Stop Game
            </motion.button>
          )}
        </motion.div>
      </motion.div>

      {/* Bottom Status Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-6 py-4 border-t border-white/[0.03]"
      >
        <div className="flex items-center gap-2">
          <Activity size={12} className={isRunning ? 'text-green-400' : 'text-white/20'} />
          <span className="text-[11px] text-white/30">{isRunning ? 'Game running' : 'Idle'}</span>
        </div>
        <div className="text-[11px] text-white/20">{versions.length} version{versions.length !== 1 ? 's' : ''} installed</div>
      </motion.div>
    </div>
  );
}

export default HomePage;
