import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Copy, FolderOpen, Edit3, Play, Clock, HardDrive, X, ChevronDown, StickyNote } from 'lucide-react';
import { SoundManager } from '../utils/SoundManager';
import Logo from '../components/Logo';
import type { Instance } from '../types/electron';

type ModalMode = 'create' | 'edit' | null;

function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [versions, setVersions] = useState<string[]>([]);

  const [formName, setFormName] = useState('');
  const [formVersion, setFormVersion] = useState('');
  const [formLoader, setFormLoader] = useState<'none' | 'fabric' | 'forge'>('none');
  const [formMemMax, setFormMemMax] = useState(4096);
  const [formMemMin, setFormMemMin] = useState(1024);
  const [formResW, setFormResW] = useState(854);
  const [formResH, setFormResH] = useState(480);
  const [formNotes, setFormNotes] = useState('');
  const [formJvmArgs, setFormJvmArgs] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [inst, vers] = await Promise.all([
        window.electronAPI?.instances.getAll(),
        window.electronAPI?.minecraft.getInstalledVersions(),
      ]);
      if (inst) setInstances(inst);
      if (vers) setVersions(vers);
    } catch (err) {
      console.error('Failed to load instances:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormName('');
    setFormVersion(versions[0] || '');
    setFormLoader('none');
    setFormMemMax(4096);
    setFormMemMin(1024);
    setFormResW(854);
    setFormResH(480);
    setFormNotes('');
    setFormJvmArgs('');
  }

  function openCreate() {
    resetForm();
    setEditingId(null);
    setModal('create');
    SoundManager.play('click');
  }

  function openEdit(inst: Instance) {
    setFormName(inst.name);
    setFormVersion(inst.versionId);
    setFormLoader(inst.modLoader);
    setFormMemMax(inst.javaMemoryMax);
    setFormMemMin(inst.javaMemoryMin);
    setFormResW(inst.resolution.width);
    setFormResH(inst.resolution.height);
    setFormNotes(inst.notes);
    setFormJvmArgs(inst.jvmArgs.join(' '));
    setEditingId(inst.id);
    setModal('edit');
    SoundManager.play('click');
  }

  async function handleSave() {
    if (!formName.trim() || !formVersion) return;

    const data = {
      name: formName.trim(),
      versionId: formVersion,
      modLoader: formLoader,
      javaMemoryMax: formMemMax,
      javaMemoryMin: formMemMin,
      resolution: { width: formResW, height: formResH },
      notes: formNotes,
      jvmArgs: formJvmArgs.split(' ').filter(Boolean),
    };

    try {
      if (modal === 'create') {
        await window.electronAPI?.instances.create(data as any);
        SoundManager.play('success');
      } else if (modal === 'edit' && editingId) {
        await window.electronAPI?.instances.update(editingId, data);
        SoundManager.play('success');
      }
      setModal(null);
      await loadData();
    } catch (err) {
      SoundManager.play('error');
    }
  }

  async function handleDelete(id: string) {
    try {
      await window.electronAPI?.instances.delete(id);
      SoundManager.play('click');
      await loadData();
    } catch {
      SoundManager.play('error');
    }
  }

  async function handleDuplicate(inst: Instance) {
    try {
      await window.electronAPI?.instances.duplicate(inst.id, `${inst.name} (Copy)`);
      SoundManager.play('success');
      await loadData();
    } catch {
      SoundManager.play('error');
    }
  }

  async function handleOpenFolder(dir: string) {
    await window.electronAPI?.util.openFolder(dir);
  }

  function formatTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  function formatDate(ts: number): string {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const loaderColors: Record<string, string> = {
    none: 'text-white/30',
    fabric: 'text-amber-400',
    forge: 'text-blue-400',
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-6 h-6 border-2 border-purple-500/50 border-t-purple-400 rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Instances</h1>
          <p className="text-white/30 text-sm mt-1">{instances.length} instance{instances.length !== 1 ? 's' : ''} configured</p>
        </div>
        <motion.button
          onClick={openCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5"
        >
          <Plus size={16} />
          New Instance
        </motion.button>
      </div>

      {/* Instance Grid */}
      {instances.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center gap-4"
        >
          <Logo size={64} className="opacity-20" />
          <p className="text-white/25 text-sm">No instances yet. Create one to get started.</p>
        </motion.div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin grid grid-cols-1 lg:grid-cols-2 gap-3 content-start">
          <AnimatePresence>
            {instances.map((inst, i) => (
              <motion.div
                key={inst.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className="glass-panel-elevated p-5 flex gap-4 group"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(139,0,255,0.15), rgba(220,20,60,0.1))', border: '1px solid rgba(139,0,255,0.15)' }}>
                  <Logo size={28} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white truncate">{inst.name}</h3>
                    <span className={`text-[10px] uppercase tracking-wider font-medium ${loaderColors[inst.modLoader]}`}>
                      {inst.modLoader !== 'none' ? inst.modLoader : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-white/30">
                    <span className="flex items-center gap-1">
                      <HardDrive size={10} />
                      {inst.versionId}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatTime(inst.playTime)}
                    </span>
                    <span>{inst.javaMemoryMax} MB</span>
                  </div>

                  {inst.notes && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-white/20">
                      <StickyNote size={9} />
                      <span className="truncate">{inst.notes}</span>
                    </div>
                  )}

                  <p className="text-[10px] text-white/15 mt-1">Last: {formatDate(inst.lastPlayed)}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(inst)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/70 transition-colors">
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => handleDuplicate(inst)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/70 transition-colors">
                    <Copy size={13} />
                  </button>
                  <button onClick={() => handleOpenFolder(inst.gameDirectory)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/70 transition-colors">
                    <FolderOpen size={13} />
                  </button>
                  <button onClick={() => handleDelete(inst.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="glass-panel-elevated w-[520px] max-h-[80vh] overflow-y-auto scrollbar-thin"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 pb-4 border-b border-white/[0.04]">
                <h2 className="text-lg font-bold text-white">
                  {modal === 'create' ? 'New Instance' : 'Edit Instance'}
                </h2>
                <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <div className="p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block mb-2">Instance Name</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="My Instance"
                    className="input-field"
                  />
                </div>

                {/* Version + Loader */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block mb-2">Version</label>
                    <div className="relative">
                      <select
                        value={formVersion}
                        onChange={(e) => setFormVersion(e.target.value)}
                        className="input-field appearance-none cursor-pointer pr-10"
                      >
                        <option value="">Select version</option>
                        {versions.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block mb-2">Mod Loader</label>
                    <div className="relative">
                      <select
                        value={formLoader}
                        onChange={(e) => setFormLoader(e.target.value as any)}
                        className="input-field appearance-none cursor-pointer pr-10"
                      >
                        <option value="none">None</option>
                        <option value="fabric">Fabric</option>
                        <option value="forge">Forge</option>
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Memory */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block mb-2">Min RAM (MB)</label>
                    <input
                      type="number"
                      value={formMemMin}
                      onChange={(e) => setFormMemMin(Number(e.target.value))}
                      className="input-field"
                      min={512}
                      step={256}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block mb-2">Max RAM (MB)</label>
                    <input
                      type="number"
                      value={formMemMax}
                      onChange={(e) => setFormMemMax(Number(e.target.value))}
                      className="input-field"
                      min={1024}
                      step={256}
                    />
                  </div>
                </div>

                {/* Resolution */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block mb-2">Width</label>
                    <input
                      type="number"
                      value={formResW}
                      onChange={(e) => setFormResW(Number(e.target.value))}
                      className="input-field"
                      min={640}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block mb-2">Height</label>
                    <input
                      type="number"
                      value={formResH}
                      onChange={(e) => setFormResH(Number(e.target.value))}
                      className="input-field"
                      min={480}
                    />
                  </div>
                </div>

                {/* JVM Args */}
                <div>
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block mb-2">JVM Arguments</label>
                  <input
                    value={formJvmArgs}
                    onChange={(e) => setFormJvmArgs(e.target.value)}
                    placeholder="-XX:+UseG1GC -XX:MaxGCPauseMillis=50"
                    className="input-field font-mono text-xs"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block mb-2">Notes</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Optional notes about this instance..."
                    rows={3}
                    className="input-field resize-none text-xs"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-white/[0.04]">
                <button onClick={() => setModal(null)} className="btn-secondary text-sm py-2.5 px-5">Cancel</button>
                <button onClick={handleSave} className="btn-primary text-sm py-2.5 px-5">
                  {modal === 'create' ? 'Create Instance' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default InstancesPage;
