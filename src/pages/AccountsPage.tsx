import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Trash2, Check, Shield, Wifi, WifiOff, Crown } from 'lucide-react';
import { SoundManager } from '../utils/SoundManager';
import type { Account } from '../types/electron';

function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAddOffline, setShowAddOffline] = useState(false);
  const [offlineUsername, setOfflineUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      const accs = await window.electronAPI?.accounts.getAll();
      if (accs) setAccounts(accs);
    } catch {}
  }

  async function handleAddOffline() {
    if (!offlineUsername || offlineUsername.length < 3) {
      setError('Username must be at least 3 characters');
      SoundManager.play('error');
      return;
    }
    try {
      setLoading(true);
      await window.electronAPI?.accounts.addOffline(offlineUsername);
      setOfflineUsername('');
      setShowAddOffline(false);
      setError('');
      await loadAccounts();
      SoundManager.play('success');
    } catch (err: any) {
      setError(err.message || 'Failed to add account');
      SoundManager.play('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMicrosoft() {
    try {
      setLoading(true);
      await window.electronAPI?.accounts.addMicrosoft();
      await loadAccounts();
      SoundManager.play('success');
    } catch (err: any) {
      setError(err.message || 'Microsoft login failed');
      SoundManager.play('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetActive(id: string) {
    try {
      await window.electronAPI?.accounts.setActive(id);
      await loadAccounts();
      SoundManager.play('click');
    } catch {}
  }

  async function handleRemove(id: string) {
    try {
      await window.electronAPI?.accounts.remove(id);
      await loadAccounts();
      SoundManager.play('click');
    } catch {}
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield size={24} className="text-ms-purple-400" />
            Account Manager
          </h1>
          <p className="text-sm text-white/40 mt-1">Manage multiple accounts, switch between premium and offline</p>
        </div>
      </div>

      {/* Add Account Buttons */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAddMicrosoft}
          disabled={loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Crown size={16} />
          Add Microsoft Account
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setShowAddOffline(!showAddOffline); SoundManager.play('click'); }}
          className="btn-secondary flex items-center gap-2"
        >
          <UserPlus size={16} />
          Add Offline Account
        </motion.button>
      </div>

      {/* Add Offline Form */}
      <AnimatePresence>
        {showAddOffline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-panel p-5"
          >
            <h3 className="text-sm font-semibold text-white mb-3">New Offline Account</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter username (3-16 characters)"
                value={offlineUsername}
                onChange={(e) => setOfflineUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddOffline()}
                maxLength={16}
                className="input-field flex-1"
              />
              <button
                onClick={handleAddOffline}
                disabled={loading}
                className="btn-primary px-6 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {error && <p className="text-xs text-ms-red-400 mt-2">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
        {accounts.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Shield size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No accounts added</p>
            <p className="text-sm mt-1">Add a Microsoft or offline account to get started</p>
          </div>
        ) : (
          accounts.map((account, index) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                account.active
                  ? 'bg-ms-purple-900/30 border-ms-purple-600/40 shadow-lg shadow-ms-purple-900/20'
                  : 'bg-ms-dark-800/40 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  account.type === 'microsoft'
                    ? 'bg-gradient-to-br from-ms-purple-600 to-ms-purple-800'
                    : 'bg-gradient-to-br from-ms-dark-500 to-ms-dark-700'
                }`}>
                  {account.skinUrl ? (
                    <img src={account.skinUrl} alt="" className="w-8 h-8 rounded pixelated" />
                  ) : (
                    <span className="text-lg font-bold text-white">
                      {account.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{account.username}</p>
                    {account.active && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-ms-purple-600/50 text-ms-purple-200 font-medium">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {account.type === 'microsoft' ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <Wifi size={10} /> Premium
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <WifiOff size={10} /> Offline
                      </span>
                    )}
                    <span className="text-xs text-white/20">
                      Last used: {new Date(account.lastUsed).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!account.active && (
                  <button
                    onClick={() => handleSetActive(account.id)}
                    className="btn-ghost text-xs flex items-center gap-1 text-white/50 hover:text-green-400"
                  >
                    <Check size={14} /> Select
                  </button>
                )}
                <button
                  onClick={() => handleRemove(account.id)}
                  className="btn-ghost text-xs flex items-center gap-1 text-white/50 hover:text-ms-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export default AccountsPage;
