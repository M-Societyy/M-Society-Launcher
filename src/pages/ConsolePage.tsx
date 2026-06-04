import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Trash2, Download, Copy, Pause, Play } from 'lucide-react';

function ConsolePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.electronAPI?.minecraft.onLog((log: string) => {
      setLogs((prev) => [...prev, log]);
    });
    return () => {
      window.electronAPI?.minecraft.removeLogListener();
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  function handleClear() {
    setLogs([]);
  }

  function handleCopy() {
    navigator.clipboard.writeText(logs.join('\n'));
  }

  function handleExport() {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `msociety-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredLogs = filter
    ? logs.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  function getLogColor(log: string): string {
    if (log.includes('[ERROR]') || log.includes('Exception') || log.includes('FATAL')) return 'text-ms-red-400';
    if (log.includes('[WARN]') || log.includes('Warning')) return 'text-yellow-400';
    if (log.includes('[M-Society]')) return 'text-ms-purple-400';
    if (log.includes('[INFO]')) return 'text-white/70';
    return 'text-white/50';
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal size={24} className="text-ms-purple-400" />
            Game Console
          </h1>
          <p className="text-sm text-white/40 mt-1">{logs.length} log entries</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`btn-ghost text-xs flex items-center gap-1 ${autoScroll ? 'text-green-400' : 'text-white/50'}`}
          >
            {autoScroll ? <Play size={12} /> : <Pause size={12} />}
            Auto-scroll
          </button>
          <button onClick={handleCopy} className="btn-ghost text-xs flex items-center gap-1">
            <Copy size={12} /> Copy
          </button>
          <button onClick={handleExport} className="btn-ghost text-xs flex items-center gap-1">
            <Download size={12} /> Export
          </button>
          <button onClick={handleClear} className="btn-ghost text-xs flex items-center gap-1 text-ms-red-400">
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Filter */}
      <input
        type="text"
        placeholder="Filter logs..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="input-field text-sm font-mono"
      />

      {/* Log Container */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin bg-ms-dark-900 rounded-xl border border-white/5 p-4 font-mono text-xs leading-relaxed"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/20">
            <div className="text-center">
              <Terminal size={32} className="mx-auto mb-3 opacity-30" />
              <p>No logs yet. Launch a game to see output here.</p>
            </div>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.1 }}
              className={`py-0.5 ${getLogColor(log)} hover:bg-white/5 px-2 rounded`}
            >
              <span className="text-white/20 mr-3 select-none">{String(index + 1).padStart(4, ' ')}</span>
              {log}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export default ConsolePage;
