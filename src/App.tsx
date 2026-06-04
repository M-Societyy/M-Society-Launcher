import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import VersionsPage from './pages/VersionsPage';
import AccountsPage from './pages/AccountsPage';
import SettingsPage from './pages/SettingsPage';
import ConsolePage from './pages/ConsolePage';
import ModLoadersPage from './pages/ModLoadersPage';
import InstancesPage from './pages/InstancesPage';
import { SoundManager } from './utils/SoundManager';
import Logo from './components/Logo';

export type PageId = 'home' | 'versions' | 'accounts' | 'modloaders' | 'instances' | 'settings' | 'console';

function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SoundManager.init();
    const timer = setTimeout(() => setIsLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  const handlePageChange = (page: PageId) => {
    SoundManager.play('click');
    setCurrentPage(page);
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: '#08080c' }}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onPageChange={handlePageChange} />
        <main className="flex-1 overflow-hidden relative">
          {/* Subtle gradient backdrop */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.03]"
              style={{ background: 'radial-gradient(circle, #8b00ff 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.02]"
              style={{ background: 'radial-gradient(circle, #dc143c 0%, transparent 70%)' }} />
          </div>
          <div className="relative z-10 h-full overflow-y-auto scrollbar-thin p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="h-full"
              >
                {currentPage === 'home' && <HomePage />}
                {currentPage === 'versions' && <VersionsPage />}
                {currentPage === 'accounts' && <AccountsPage />}
                {currentPage === 'modloaders' && <ModLoadersPage />}
                {currentPage === 'instances' && <InstancesPage />}
                {currentPage === 'settings' && <SettingsPage />}
                {currentPage === 'console' && <ConsolePage />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#08080c' }}>
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,0,255,0.08) 0%, transparent 70%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
        className="relative flex flex-col items-center gap-8"
      >
        {/* Logo ring */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            className="w-48 h-48 rounded-2xl flex items-center justify-center overflow-hidden"
          >
            <Logo size={200} />
          </motion.div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-3 rounded-2xl border border-purple-500/20"
            style={{ borderTopColor: 'rgba(139,0,255,0.6)' }}
          />
        </div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold tracking-tight text-white">M-Society Launcher</h1>
          <p className="text-white/30 text-xs mt-2 tracking-widest uppercase">Loading environment</p>
        </motion.div>

        {/* Loading bar */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 200 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="h-[2px] rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/2 rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, #8b00ff, transparent)' }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default App;
