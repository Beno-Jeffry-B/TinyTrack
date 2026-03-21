import React, { useState, useMemo, useEffect } from 'react';
import type { LinkData, DeviceBreakdown, LocationBreakdown } from '../types';
import {
  ClipboardCopy, Trash2, CalendarDays, MousePointerClick, TrendingUp,
  Pencil, QrCode, Smartphone, Monitor, Tablet, Globe, X, Download, Timer, Clock
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { EditLinkModal } from './EditLinkModal';
import { useLinksStore } from '../store';
import toast from 'react-hot-toast';
import { AnalyticsSkeleton } from './Skeletons';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface Props {
  link: LinkData | null;
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
}

/* ── Sparkline ─────────────────────────────── */
const Sparkline = ({ data }: { data: number[] }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const W = 100; const H = 40;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * H;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-14 overflow-visible">
      <defs>
        <linearGradient id="sg2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(37,99,235,0.25)" />
          <stop offset="100%" stopColor="rgba(37,99,235,0)" />
        </linearGradient>
      </defs>
      <polygon fill="url(#sg2)" points={`0,${H} ${pts} ${W},${H}`} />
      <polyline fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
};

/* ── Device icon map ───────────────────────── */
const DeviceIcon: React.FC<{ device: string }> = ({ device }) => {
  if (device === 'mobile') return <Smartphone size={14} className="text-blue-500" />;
  if (device === 'tablet') return <Tablet size={14} className="text-indigo-500" />;
  return <Monitor size={14} className="text-slate-500" />;
};

/* ── Main Component ───────────────────────── */
export const AnalyticsModal: React.FC<Props> = ({ link, isOpen, onOpenChange }) => {
  const { deleteLink } = useLinksStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'locations'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useMediaQuery('(max-width: 640px)');

  // Prevent body scroll & simulate load
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Simulate fetching insights
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, link?.id]);

  useEffect(() => {
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // Handle ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onOpenChange]);

  // Reset state on close
  const handleClose = () => {
    setIsDeleting(false); setShowQr(false); setActiveTab('overview');
    onOpenChange(false);
  };

  const sparkData = useMemo(() => link?.recentVisits.map((v) => v.clicks) ?? [], [link]);
  const firstVal = sparkData[0] ?? 0;
  const lastVal = sparkData[sparkData.length - 1] ?? 0;
  const trendPct = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;

  const deviceBreakdown: DeviceBreakdown = useMemo(() => {
    if (!link) return [];
    const counts: Record<string, number> = {};
    link.recentVisits.forEach((v) => {
      if (v.device) counts[v.device] = (counts[v.device] ?? 0) + v.clicks;
    });
    return Object.entries(counts).map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);
  }, [link]);

  const locationBreakdown: LocationBreakdown = useMemo(() => {
    if (!link) return [];
    const counts: Record<string, number> = {};
    link.recentVisits.forEach((v) => {
      if (v.location) counts[v.location] = (counts[v.location] ?? 0) + v.clicks;
    });
    return Object.entries(counts).map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [link]);

  const totalForBreakdown = deviceBreakdown.reduce((s, d) => s + d.count, 0);

  const handleDelete = async () => {
    if (!link) return;
    if (isDeleting) {
      await deleteLink(link.id);
      toast.success('Link deleted');
      handleClose();
    } else {
      setIsDeleting(true);
    }
  };

  const handleQrDownload = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `${link?.alias ?? 'qr'}.png`;
    a.href = canvas.toDataURL();
    a.click();
    toast.success('QR code downloaded');
  };

  const getFlag = (code: string) => {
    if (!code || code.length !== 2) return '🏳️';
    const codePoints = code
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const getCountryName = (code: string) => {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
    } catch {
      return code;
    }
  };

  if (!link && !isOpen) return null;

  const TABS = ['overview', 'devices', 'locations'] as const;

  return (
    <>
      <AnimatePresence>
        {isOpen && link && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-center justify-center p-4 sm:p-6"
            onClick={handleClose}
          >
            <div className="relative w-full max-w-[700px] sm:w-auto w-[95%] flex justify-center" onClick={(e) => e.stopPropagation()}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-white/30 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
              >

                {/* ── Header ── */}
                <div className="px-6 pt-5 pb-4 border-b border-white/10 dark:border-white/5 flex-shrink-0 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">
                      {link.shortUrl}
                    </h2>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 truncate mt-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-1.5 border border-slate-100 dark:border-slate-800 inline-block max-w-full">
                      {link.originalUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowEdit(true)}
                      className="p-3 sm:p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                      title="Edit link"
                    >
                      <Pencil size={18} className="sm:size-[15px]" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { navigator.clipboard.writeText(link.shortUrl); toast.success('Copied!', { duration: 1500 }); }}
                      className="p-3 sm:p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
                      title="Copy"
                    >
                      <ClipboardCopy size={18} className="sm:size-[15px]" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowQr((v) => !v)}
                      className={cn('p-3 sm:p-2 rounded-xl transition-all flex', showQr ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300')}
                      title="QR Code"
                    >
                      <QrCode size={18} className="sm:size-[15px]" />
                    </motion.button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleClose}
                      className="p-3 sm:p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 transition-all"
                      title="Close"
                    >
                      <X size={20} className="sm:size-[16px]" />
                    </motion.button>
                  </div>
                </div>



                {/* ── Tabs ── */}
                <div className="flex gap-1 px-6 pt-4 pb-0 flex-shrink-0">
                  {TABS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={cn(
                        'px-4 py-2.5 text-[11px] font-black tracking-widest uppercase transition-all whitespace-nowrap',
                        activeTab === t ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-t-xl'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {isLoading ? (
                    <AnalyticsSkeleton />
                  ) : (
                    <div className="space-y-7">
                      {/* OVERVIEW TAB */}
                      {activeTab === 'overview' && (
                        <>
                          {/* Sparkline */}
                          <section className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <TrendingUp size={13} className="text-blue-500" /> 7-day trend
                              </h4>
                              <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                                trendPct >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-700 bg-rose-50 border-rose-100'
                              )}>
                                {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}%
                              </span>
                            </div>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                              className="glass-panel px-5 pt-4 pb-2 shadow-sm border-white/20 dark:border-white/10"
                            >
                              <Sparkline data={sparkData} />
                            </motion.div>
                          </section>

                          {/* Stats grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 sm:p-6 glass-panel flex-1 flex flex-col justify-center shadow-none border-white/20 dark:border-white/10">
                              <div className="flex gap-4">
                                <div className="p-4 sm:p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                  <MousePointerClick size={24} className="sm:size-5 text-blue-500 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-sm sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Clicks</p>
                                  <p className="text-4xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                                    {link.clicks.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="p-5 sm:p-6 glass-panel flex-1 flex flex-col justify-center shadow-none border-white/20 dark:border-white/10">
                              <div className="flex gap-4">
                                <div className="p-4 sm:p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                  <Timer size={24} className="sm:size-5 text-emerald-500 dark:text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-sm sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Status</p>
                                  <p className="text-base sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug pt-1">
                                    {formatDistanceToNow(new Date(link.lastVisited), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 glass-panel flex items-center gap-4 shadow-none border-white/20 dark:border-white/10">
                              <CalendarDays size={20} className="sm:size-[18px] text-slate-400 dark:text-slate-500" />
                              <div>
                                <p className="text-[11px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</p>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{format(new Date(link.createdAt), 'MMM d, yyyy')}</p>
                              </div>
                            </div>
                            <div className="p-5 glass-panel flex items-center gap-4 shadow-none border-white/20 dark:border-white/10">
                              <Clock size={20} className="sm:size-[18px] text-slate-400 dark:text-slate-500" />
                              <div>
                                <p className="text-[11px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Visited</p>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {formatDistanceToNow(new Date(link.lastVisited), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </div>


                          {/* Visit history */}
                          <section className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Visitor History</h4>
                            <div className="space-y-3">
                              {link.recentVisits.map((v, i) => (
                                <motion.div key={i}
                                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.04 }}
                                  className="flex justify-between items-center px-5 py-4 rounded-2xl glass-panel shadow-none border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    {v.device && <div className="p-2 bg-white/50 dark:bg-black/20 rounded-lg"><DeviceIcon device={v.device} /></div>}
                                    <div>
                                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{format(new Date(v.date), 'MMM d, yyyy')}</p>
                                      {v.browser && <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{v.browser}{v.location ? ` · ${getCountryName(v.location)}` : ''}</p>}
                                    </div>
                                  </div>
                                  <span className="text-base font-black text-slate-900 dark:text-white tabular-nums px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                                    {v.clicks}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          </section>
                        </>
                      )}

                      {/* DEVICES TAB */}
                      {activeTab === 'devices' && (
                        <section className="space-y-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Device Breakdown</h4>
                          {deviceBreakdown.length === 0
                            ? <p className="text-slate-400 text-sm text-center py-12">No device data available</p>
                            : <div className="grid grid-cols-3 gap-3">
                              {deviceBreakdown.map((d, i) => {
                                const pct = totalForBreakdown > 0 ? Math.round((d.count / totalForBreakdown) * 100) : 0;
                                const icons = { Desktop: <Monitor size={20} />, Mobile: <Smartphone size={20} />, Tablet: <Tablet size={20} /> };
                                return (
                                  <motion.div key={d.device} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                                    <div key={d.device} className="flex flex-col items-center gap-2 p-4 rounded-xl glass-panel shadow-none border-white/20 dark:border-white/10">
                                      <span className="text-slate-400 dark:text-slate-500">{icons[d.device as keyof typeof icons]}</span>
                                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{d.device}</p>
                                      <div className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">{pct}%</div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          }
                        </section>
                      )}

                      {/* LOCATIONS TAB */}
                      {activeTab === 'locations' && (
                        <section className="space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <Globe size={12} /> Location Breakdown
                          </h4>
                          {locationBreakdown.length === 0
                            ? <p className="text-slate-400 text-sm text-center py-12">No location data available</p>
                            : locationBreakdown.map((l, i) => {
                              const total = locationBreakdown.reduce((s, x) => s + x.count, 0);
                              const pct = total > 0 ? Math.round((l.count / total) * 100) : 0;

                              return (
                                <motion.div key={l.location} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                  className="flex items-center gap-4 px-4 py-3 rounded-xl glass-panel shadow-none border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 transition-all dark:text-slate-100"
                                >
                                  <span className="text-lg flex-shrink-0">{getFlag(l.location)}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{getCountryName(l.location)}</p>
                                      <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 tabular-nums">{pct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.08 }}
                                        className="h-full bg-indigo-500 rounded-full"
                                      />
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })
                          }
                        </section>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Footer actions ── */}
                <div className="px-6 py-5 border-t border-white/10 dark:border-white/5 flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {isDeleting ? (
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Are you sure you want to delete?</p>
                  ) : (
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">Registry ID: {link.id}</p>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => isDeleting ? handleDelete() : setIsDeleting(true)}
                    className={cn(
                      'w-full sm:w-auto flex items-center justify-center gap-2 h-12 sm:h-9 px-5 rounded-xl transition-all duration-200 backdrop-blur-[10px] shadow-sm font-bold text-white',
                      isDeleting
                        ? 'bg-rose-700 hover:bg-rose-800'
                        : 'bg-red-500 hover:bg-red-700'
                    )}
                  >
                    <Trash2 size={15} className="sm:size-13" />
                    <span className="text-sm sm:text-xs tracking-tight">
                      {isDeleting ? 'Confirm Delete' : 'Delete Link'}
                    </span>
                  </motion.button>
                </div>

              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fixed Floating QR Panel ── */}
      <AnimatePresence>
        {showQr && isOpen && link && (
          <>
            {/* Backdrop for mobile only */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-md z-[9998]"
                onClick={() => setShowQr(false)}
              />
            )}

            <motion.div
              key="floating-qr"
              initial={{ 
                opacity: 0, 
                scale: isMobile ? 0.9 : 1,
                x: isMobile ? '-50%' : 20, 
                y: isMobile ? '-50%' : 0 
              }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: isMobile ? '-50%' : 0, 
                y: isMobile ? '-50%' : 0 
              }}
              exit={{ 
                opacity: 0, 
                scale: isMobile ? 0.9 : 1,
                x: isMobile ? '-50%' : 20, 
                y: isMobile ? '-50%' : 0 
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                "fixed z-[9999]",
                isMobile 
                  ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
                  : "hidden sm:flex right-8 top-1/2 -translate-y-1/2"
              )}
            >
              <div
                className="flex flex-col items-center gap-3 backdrop-blur-[16px] rounded-2xl border"
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px',
                  width: isMobile ? '180px' : '210px',
                  boxShadow: isMobile ? '0 10px 40px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)',
                }}
              >
                <div className="w-full flex justify-between items-center mb-0.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">QR Registry</p>
                  {isMobile && (
                    <button onClick={() => setShowQr(false)} className="text-slate-400 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                <div className="p-3 bg-white rounded-xl shadow-inner">
                  <QRCodeCanvas
                    id="qr-canvas"
                    value={link.shortUrl}
                    size={isMobile ? 150 : 170}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleQrDownload}
                  className="w-full py-2 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl transition-all shadow-lg shadow-blue-900/20"
                >
                  <Download size={13} /> DOWNLOAD PNG
                </motion.button>
                
                {!isMobile && (
                  <p className="text-[9px] text-slate-500 text-center leading-relaxed break-all max-w-full px-2">{link.shortUrl}</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      {showEdit && link && <EditLinkModal link={link} isOpen={showEdit} onClose={() => setShowEdit(false)} />}
    </>
  );
};
