import { Home, Package, Users, Puzzle, Settings, Terminal, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageId } from '../App';
import { SoundManager } from '../utils/SoundManager';
import Logo from './Logo';

interface SidebarProps {
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
}

const menuItems: { id: PageId; label: string; icon: any }[] = [
  { id: 'home', label: 'Play', icon: Home },
  { id: 'versions', label: 'Versions', icon: Package },
  { id: 'modloaders', label: 'Mod Loaders', icon: Puzzle },
  { id: 'instances', label: 'Instances', icon: Layers },
  { id: 'accounts', label: 'Accounts', icon: Users },
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <div className="w-[220px] h-full flex flex-col border-r border-white/[0.04]"
      style={{ background: 'rgba(10, 10, 14, 0.6)' }}>
      {/* Logo */}
      <div className="px-6 pt-6 pb-5 flex items-center gap-3">
        <Logo size={52} />
        <div>
          <h2 className="text-xs font-bold text-white/90 tracking-wider">M-SOCIETY</h2>
          <p className="text-[9px] text-white/25 font-mono mt-0.5">v1.0.0</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        <p className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.15em] px-4 mb-2">Navigation</p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              onMouseEnter={() => SoundManager.play('hover')}
              whileTap={{ scale: 0.97 }}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-purple-400' : ''} />
              <span className="text-[13px]">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Social Links */}
      <div className="px-4 pb-2 flex items-center gap-1">
        <button
          onClick={() => window.electronAPI?.util.openUrl('https://github.com/M-Societyy/M-Society-Launcher')}
          className="p-2.5 rounded-lg hover:bg-white/5 text-white/25 hover:text-white/70 transition-all group"
          title="GitHub"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="group-hover:scale-110 transition-transform">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI?.util.openUrl('https://discord.gg/w7TvFudgxm')}
          className="p-2.5 rounded-lg hover:bg-white/5 text-white/25 hover:text-white/70 transition-all group"
          title="Discord"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="group-hover:scale-110 transition-transform">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
          </svg>
        </button>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/[0.03]">
        <p className="text-[9px] text-white/15 leading-relaxed">
          Developed by<br />
          <span className="text-white/25">M-Society Dev Team & c1q_</span>
        </p>
      </div>
    </div>
  );
}

export default Sidebar;
