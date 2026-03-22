import React, { useState, useMemo, useEffect } from 'react';
import type { LinkData, DeviceBreakdown, LocationBreakdown } from '../types';
import {
  ClipboardCopy, Trash2, CalendarDays, MousePointerClick, TrendingUp,
  Pencil, QrCode, Smartphone, Monitor, Tablet, Globe, X, Download, Clock, Users
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { EditLinkModal } from './EditLinkModal';
import { useLinksStore } from '../store';
import type { AnalyticsData } from '../store';
import { showToast } from '../utils/toast';
import { AnalyticsSkeleton } from './Skeletons';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { io } from 'socket.io-client';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const socket = io(import.meta.env.VITE_API_URL);

interface Props {
  link: LinkData | null;
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
}

/* ── Custom Tooltip ─────────────────────────────── */
const CustomTooltip = ({ active, payload, label, timeRange }: any) => {
  if (active && payload && payload.length) {
    const d = new Date(label);
    
    // Format clearly to requested text: "Time: 02:10 PM / Clicks: 2 clicks"
    const displayTime = timeRange !== '1d'
      ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    return (
      <div className="glass-panel px-3 py-2 shadow-lg rounded-xl border border-white/20 dark:border-white/10">
        <p className="text-[11px] font-bold tracking-widest text-slate-500 dark:text-slate-400 mb-1">
          Time: <span className="text-slate-700 dark:text-slate-300">{displayTime}</span>
        </p>
        <p className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums">
          <span className="text-blue-500 mr-1.5 leading-none">•</span>
          Clicks: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

/* ── Device icon map ───────────────────────── */
const DeviceIcon: React.FC<{ device: string }> = ({ device }) => {
  if (device === 'mobile') return <Smartphone size={14} className="text-blue-500" />;
  if (device === 'tablet') return <Tablet size={14} className="text-indigo-500" />;
  return <Monitor size={14} className="text-slate-500" />;
};

/* ── Main Component ───────────────────────── */
export const AnalyticsModal: React.FC<Props> = ({ link, isOpen, onOpenChange }) => {
  const { deleteLink, fetchAnalytics } = useLinksStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'locations'>('overview');
  const [timeRange, setTimeRange] = useState<import('../store').AnalyticsRange>('7d');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const isMobile = useMediaQuery('(max-width: 640px)');

  // Fetch analytics from API on open or when timeRange changes
  useEffect(() => {
    if (!isOpen || !link) return;
    document.body.style.overflow = 'hidden';
    setIsLoading(true);
    setAnalytics(null);
    fetchAnalytics(link.id, timeRange, selectedDate)
      .then((data) => setAnalytics(data))
      .catch(() => showToast('Failed to load analytics', 'error'))
      .finally(() => setIsLoading(false));
      
    // Socket.IO Real-time Subscriptions
    socket.emit('join_url_room', link.id);

    const handleUpdate = (data: { urlId: string; timestamp: string }) => {
      if (data.urlId === link.id) {
        fetchAnalytics(link.id, timeRange, selectedDate).then(setAnalytics);
      }
    };

    socket.on('click_update', handleUpdate);

    return () => { 
      document.body.style.overflow = 'unset'; 
      socket.off('click_update', handleUpdate);
    };
  }, [isOpen, link?.id, timeRange, selectedDate, fetchAnalytics]);

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

  const previousPeriodClicks = analytics?.previous_period_clicks ?? 0;
  const currentPeriodClicks = useMemo(() => {
    if (!analytics?.daily_trend?.length) return 0;
    return analytics.daily_trend.reduce((sum, d) => sum + d.clicks, 0);
  }, [analytics]);

  const trendContent = useMemo(() => {
    if (previousPeriodClicks === 0) {
      if (currentPeriodClicks === 0) return 'No clicks';
      return `+${currentPeriodClicks} (New)`;
    }
    const pct = ((currentPeriodClicks - previousPeriodClicks) / previousPeriodClicks) * 100;
    return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  }, [currentPeriodClicks, previousPeriodClicks]);

  const isPositiveTrend = currentPeriodClicks >= previousPeriodClicks;
  // Device breakdown from API
  const deviceBreakdown: DeviceBreakdown = useMemo(() => {
    if (analytics?.device_breakdown?.length) {
      return analytics.device_breakdown.map((d) => ({ device: d.device, count: d.count }));
    }
    // Fallback to recentVisits computation
    if (!link) return [];
    const counts: Record<string, number> = {};
    link.recentVisits.forEach((v) => {
      if (v.device) counts[v.device] = (counts[v.device] ?? 0) + v.clicks;
    });
    return Object.entries(counts).map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);
  }, [analytics, link]);

  // Location breakdown from API — backend now resolves codes to display names
  const locationBreakdown: LocationBreakdown = useMemo(() => {
    if (analytics?.location_breakdown?.length) {
      return analytics.location_breakdown.map((l) => ({ location: l.country, count: l.count }));
    }
    // Fallback to recentVisits computation
    if (!link) return [];
    const counts: Record<string, number> = {};
    link.recentVisits.forEach((v) => {
      if (v.location) counts[v.location] = (counts[v.location] ?? 0) + v.clicks;
    });
    return Object.entries(counts).map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [analytics, link]);

  const totalForBreakdown = deviceBreakdown.reduce((s, d) => s + d.count, 0);

  // Last visited: prefer API response, fallback to store
  const lastVisited = analytics?.last_visited ?? link?.lastVisited ?? null;

  const handleDelete = async () => {
    if (!link) return;
    if (isDeleting) {
      await deleteLink(link.id);
      showToast('Link deleted', 'success');
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
    showToast('QR code downloaded', 'success');
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
                      onClick={() => { navigator.clipboard.writeText(link.shortUrl); showToast('Copied to clipboard!', 'success'); }}
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
                              <div className="flex items-center gap-3">
                                <h4 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 focus:outline-none">
                                  <TrendingUp size={13} className="text-blue-500" /> Trend
                                </h4>
                                <div className="flex gap-2">
                                  {timeRange === '1d' && (
                                    <input
                                      type="date"
                                      value={selectedDate}
                                      onChange={(e) => setSelectedDate(e.target.value)}
                                      className="bg-slate-100 dark:bg-slate-800/50 rounded-lg px-2 py-0 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-2 ring-blue-500/50"
                                    />
                                  )}
                                  <div className="flex bg-slate-100 dark:bg-slate-800/50 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                                    {(['1d', '7d', '1m', '1y'] as const).map((r) => (
                                      <button
                                        key={r}
                                        onClick={() => setTimeRange(r)}
                                        className={cn(
                                          'px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all',
                                          timeRange === r 
                                            ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        )}
                                      >
                                        {r}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                                currentPeriodClicks === 0 && previousPeriodClicks === 0
                                  ? 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                  : isPositiveTrend ? 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800' : 'text-rose-700 bg-rose-50 border-rose-100 dark:text-rose-400 dark:bg-rose-900/30 dark:border-rose-800'
                              )}>
                                {trendContent}
                              </span>
                            </div>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                              className="glass-panel px-5 pt-4 pb-2 shadow-sm border-white/20 dark:border-white/10 h-48 sm:h-56 relative group/chart"
                            >
                              {!analytics?.daily_trend?.length ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <p className="text-slate-400 font-bold text-sm tracking-wider uppercase">No data for this day</p>
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={analytics.daily_trend} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                    <defs>
                                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <XAxis 
                                      dataKey="date" 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tickFormatter={(val) => {
                                        const d = new Date(val);
                                        return timeRange !== '1d'
                                          ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                          : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                      }}
                                      tick={{ fontSize: 10, fill: '#8ca3af', fontWeight: 700 }} 
                                      dy={10} 
                                    />
                                    <Tooltip content={<CustomTooltip timeRange={timeRange} />} cursor={{ stroke: 'rgba(59,130,246,0.2)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                                    <Area 
                                      type="monotone" 
                                      dataKey="clicks" 
                                      stroke="#3b82f6" 
                                      strokeWidth={3}
                                      fillOpacity={1} 
                                      fill="url(#colorClicks)" 
                                      dot={{ r: 4, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 2 }}
                                      activeDot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2, className: "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" }}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              )}
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
                                  <Users size={24} className="sm:size-5 text-purple-500 dark:text-purple-400" />
                                </div>
                                <div>
                                  <p className="text-sm sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Unique Visitors</p>
                                  <p className="text-4xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                                    {analytics?.unique_visitors?.toLocaleString() ?? '—'}
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
                                  {lastVisited
                                    ? formatDistanceToNow(new Date(lastVisited), { addSuffix: true })
                                    : '—'}
                                </p>
                              </div>
                            </div>
                          </div>


                          {/* Visit history */}
                          <section className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Visitor History</h4>
                            <div className="space-y-3">
                              {(!analytics?.recent_history || analytics.recent_history.length === 0) ? (
                                <div className="text-center py-8">
                                  <p className="text-slate-400 font-bold tracking-wider text-sm">No visitors yet</p>
                                </div>
                              ) : (
                                analytics.recent_history.map((v, i) => (
                                  <motion.div key={i}
                                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="flex justify-between items-center px-5 py-4 rounded-2xl glass-panel shadow-none border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 transition-all"
                                  >
                                    <div className="flex items-center gap-3">
                                      {v.device && <div className="p-2 bg-white/50 dark:bg-black/20 rounded-lg"><DeviceIcon device={v.device.toLowerCase()} /></div>}
                                      <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                          {(() => {
                                            const d = new Date(v.date);
                                            const tStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                            if (isToday(d)) return `Today, ${tStr}`;
                                            if (isYesterday(d)) return `Yesterday, ${tStr}`;
                                            return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${tStr}`;
                                          })()}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5 opacity-80">
                                            {v.location && <span className="text-[14px] leading-none">{getFlag(v.location)}</span>}
                                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                                              {v.device} {v.location ? `· ${v.location}` : ''}
                                            </p>
                                        </div>
                                      </div>
                                    </div>
                                    <span className="flex-shrink-0 text-slate-400">
                                      {formatDistanceToNow(new Date(v.date), { addSuffix: true })}
                                    </span>
                                  </motion.div>
                                ))
                              )}
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
                <div className="px-6 py-5 border-t border-white/10 dark:border-white/5 flex-shrink-0 flex items-center justify-end">
                  {isDeleting && (
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mr-auto">Are you sure you want to delete?</p>
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
