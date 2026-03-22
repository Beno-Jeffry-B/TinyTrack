import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore, useLinksStore } from './store';
import { useTheme } from './hooks/useTheme';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { LinkCard } from './components/LinkCard';
import { GlassSelect } from './components/ui/GlassSelect';
import { GlassDatePicker } from './components/ui/GlassDatePicker';
import { AnalyticsModal } from './components/AnalyticsModal';
import { AddLinkModal } from './components/AddLinkModal';
import { CsvUploadModal } from './components/CsvUploadModal';
import { DashboardSkeletons } from './components/Skeletons';
import type { LinkData } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, LogOut, Sun, Moon,
  Search, UploadCloud, ArrowUpDown, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

import { Background } from './components/ui/Background';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

// ── Dashboard ──────────────────────────────────────────────────────────
function Dashboard() {
  const { user, logout } = useAuthStore();
  const { links, isLoading, fetchLinks } = useLinksStore();

  const [selectedLink, setSelectedLink] = useState<LinkData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [sortOption, setSortOption] = useState<'clicks-desc' | 'clicks-asc' | 'date-desc' | 'visit-desc'>('date-desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { theme, toggleTheme } = useTheme();

  // Load data on mount
  useEffect(() => {
    if (!user) return;
    setFetchError(false);
    
    // Initial load
    fetchLinks(user.id).catch(() => {
      setFetchError(true);
      toast.error('Failed to load links. Please retry.');
    });
  }, [user, fetchLinks]);

  // Join Socket.io rooms for all active links
  useEffect(() => {
    links.forEach((link) => {
      socket.emit('join_url_room', link.id);
    });
  }, [links]);

  // Listen for live click updates globally
  useEffect(() => {
    if (!user) return;
    
    const handleUpdate = () => {
      fetchLinks(user.id).catch(() => {});
    };

    socket.on('click_update', handleUpdate);
    return () => {
      socket.off('click_update', handleUpdate);
    };
  }, [user, fetchLinks]);

  const handleRetry = useCallback(() => {
    if (!user) return;
    setFetchError(false);
    fetchLinks(user.id).catch(() => {
      setFetchError(true);
      toast.error('Still failing. Check your connection.');
    });
  }, [user, fetchLinks]);

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
  };

  // Keep selectedLink in sync with store (e.g. after edit)
  useEffect(() => {
    if (selectedLink) {
      const fresh = links.find((l) => l.id === selectedLink.id);
      if (fresh) setSelectedLink(fresh);
    }
  }, [links]);

  const filteredLinks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let result = links.filter((l) => {
      const matchesQuery = l.shortUrl.toLowerCase().includes(q) || l.originalUrl.toLowerCase().includes(q);
      let matchesDate = true;
      if (dateFrom) matchesDate = matchesDate && new Date(l.createdAt) >= new Date(dateFrom);
      if (dateTo) matchesDate = matchesDate && new Date(l.createdAt) <= new Date(dateTo + 'T23:59:59');
      return matchesQuery && matchesDate;
    });

    result.sort((a, b) => {
      if (sortOption === 'clicks-desc') return b.clicks - a.clicks;
      if (sortOption === 'clicks-asc') return a.clicks - b.clicks;
      if (sortOption === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOption === 'visit-desc') return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime();
      return 0;
    });

    return result;
  }, [links, searchQuery, sortOption, dateFrom, dateTo]);

  const maxClicks = useMemo(() => Math.max(...links.map((l) => l.clicks), 0), [links]);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-900 pb-24 overflow-x-hidden relative transition-colors duration-300">
      <Background />
      <Toaster position="top-center" toastOptions={{
        duration: 3000,
        style: { borderRadius: '12px', fontWeight: '600', fontSize: '13px' },
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-14 space-y-10">

        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Dashboard Registry</h1>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {user?.email}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="flex items-center gap-3 flex-wrap"
          >
            <button onClick={toggleTheme} className="p-2.5 rounded-xl glass-panel text-slate-700 dark:text-slate-200 transition-all hover:brightness-110" title="Toggle theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Button variant="outline" className="rounded-xl gap-2 glass-panel text-slate-900 dark:text-slate-100 shadow-sm h-10 hover:brightness-110 border-transparent hover:border-transparent bg-transparent hover:bg-transparent" onClick={() => setShowCsv(true)}>
              <UploadCloud size={16} /> CSV
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white font-bold rounded-xl px-5 gap-2 shadow-[0_8px_32px_rgba(31,38,135,0.2)] dark:shadow-[0_8px_32px_rgba(255,255,255,0.15)] h-10 group transition-all" onClick={() => setShowAdd(true)}>
              <Plus size={18} className="stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
              Add URL
            </Button>
            <button onClick={handleLogout} className="p-2.5 rounded-xl glass-panel text-slate-700 dark:text-slate-200 transition-all hover:brightness-110" title="Sign out">
              <LogOut size={16} />
            </button>
          </motion.div>
        </header>

        {/* ── Search + Filter ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative group max-w-xl flex-1 w-full">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors z-10" />
              <input
                type="text"
                placeholder="Search Links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center glass-panel p-2 rounded-xl max-w-fit relative z-40">
            <div className="flex items-center px-1">
              <GlassSelect
                options={[
                  { label: 'Recently Created', value: 'date-desc' },
                  { label: 'Most Clicked', value: 'clicks-desc' },
                  { label: 'Least Clicked', value: 'clicks-asc' },
                  { label: 'Last Visited', value: 'visit-desc' }
                ]}
                value={sortOption}
                onChange={(val: any) => setSortOption(val)}
                icon={<ArrowUpDown size={15} />}
                className="w-48"
              />
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 hidden xl:block mx-1" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">From</span>
                <GlassDatePicker
                  value={dateFrom}
                  onChange={setDateFrom}
                  placeholder="Start"
                  className="w-36 sm:w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-2 sm:ml-0">To</span>
                <GlassDatePicker
                  value={dateTo}
                  minDate={dateFrom}
                  onChange={setDateTo}
                  placeholder="End"
                  className="w-36 sm:w-40"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Grid / States ── */}
        {isLoading ? (
          <DashboardSkeletons />
        ) : fetchError ? (
          <div className="text-center py-20 bg-white/50 border border-dashed border-rose-200 rounded-2xl">
            <p className="text-rose-600 font-bold mb-3">Failed to load link registry</p>
            <Button onClick={handleRetry} variant="outline" className="gap-2 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50">
              <RefreshCw size={15} /> Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredLinks.map((link) => (
                <motion.div
                  key={link.id} layout
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                >
                  <LinkCard
                    link={link}
                    maxClicks={maxClicks}
                    onClick={() => setSelectedLink((prev) => prev?.id === link.id ? null : link)}
                    isActive={selectedLink?.id === link.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {!isLoading && filteredLinks.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="col-span-full text-center py-24 bg-white/50 border border-dashed border-slate-200 rounded-2xl"
              >
                <Search size={28} className="text-slate-300 mx-auto mb-5" />
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">No results</p>
                <p className="text-slate-500 font-medium">
                  {searchQuery ? <>No entries match <span className="text-slate-800 font-bold">"{searchQuery}"</span></> : 'No links in this category'}
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* ── Panels & Modals ── */}
      <AnalyticsModal
        link={selectedLink}
        isOpen={!!selectedLink}
        onOpenChange={(open) => !open && setSelectedLink(null)}
      />
      <AddLinkModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
      <CsvUploadModal isOpen={showCsv} onClose={() => setShowCsv(false)} />
    </div>
  );
}

// ── Root with Auth Guard ───────────────────────────────────────────────
export default function App() {
  const { user, verifySession } = useAuthStore();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    verifySession().finally(() => setIsVerifying(false));
  }, [verifySession]);

  // Handle Google OAuth callback: /auth/callback?token=...
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallbackPage />;
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {/* Global Toaster — always mounted so toasts work on Login/Signup too */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', fontWeight: '600', fontSize: '13px' },
        }}
      />

      {user ? (
        <Dashboard />
      ) : authMode === 'login' ? (
        <LoginPage onSwitchToSignup={() => setAuthMode('signup')} />
      ) : (
        <SignupPage onSwitchToLogin={() => setAuthMode('login')} />
      )}
    </>
  );
}
