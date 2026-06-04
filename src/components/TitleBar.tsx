import { Minus, Square, X } from 'lucide-react';

function TitleBar() {
  const handleMinimize = () => window.electronAPI?.window.minimize();
  const handleMaximize = () => window.electronAPI?.window.maximize();
  const handleClose = () => window.electronAPI?.window.close();

  return (
    <div className="h-8 flex items-center justify-between select-none border-b border-white/[0.03]"
      style={{ WebkitAppRegion: 'drag', background: 'rgba(8, 8, 12, 0.95)' } as any}>
      <div className="flex items-center gap-2 pl-4">
        <img src="/assets/icon.png" alt="" className="w-4 h-4 object-contain" />
        <span className="text-[10px] font-medium text-white/30 tracking-[0.2em] uppercase">M-Society</span>
      </div>
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-150"
        >
          <Minus size={13} strokeWidth={1.5} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-150"
        >
          <Square size={10} strokeWidth={1.5} />
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-white/30 hover:text-white hover:bg-red-600/80 transition-all duration-150"
        >
          <X size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
