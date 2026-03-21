import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addMonths, subMonths, format, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek,
  isSameMonth, isSameDay, isBefore, startOfDay, isToday,
} from 'date-fns';

interface GlassDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  placeholder?: string;
  className?: string;
}

const PANEL_W = 292;

export function GlassDatePicker({ value, onChange, minDate, placeholder = 'Select date', className }: GlassDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [currentMonth, setCurrentMonth] = useState(() => value ? new Date(value) : new Date());
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  // Recompute position every time we open
  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceRight = window.innerWidth - rect.left;

    let top: number;
    let left: number;
    let transformOrigin = 'top left';

    if (spaceBelow >= 340) {
      // Show below
      top = rect.bottom + 8;
      left = Math.min(rect.left, window.innerWidth - PANEL_W - 16);
      transformOrigin = 'top left';
    } else {
      // Show above
      top = rect.top - 8;
      transformOrigin = 'bottom left';
      left = Math.min(rect.left, window.innerWidth - PANEL_W - 16);
    }

    // If there's more space to the right of the element, align from right
    if (spaceRight < PANEL_W && rect.right >= PANEL_W) {
      left = rect.right - PANEL_W;
    }

    setPanelStyle({
      position: 'fixed',
      top: spaceBelow >= 340 ? top : undefined,
      bottom: spaceBelow < 340 ? window.innerHeight - rect.top + 8 : undefined,
      left: Math.max(8, left),
      width: PANEL_W,
      zIndex: 9999,
      transformOrigin,
    });
  };

  useEffect(() => {
    if (isOpen) updatePos();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const selectedDate = value ? new Date(value) : null;
  const minDateParsed = minDate ? startOfDay(new Date(minDate)) : null;

  const handleDaySelect = (day: Date) => {
    if (minDateParsed && isBefore(day, minDateParsed)) return;
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
  });

  // ── Detect dark mode ──────────────────────────────────
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const panelBg = isDark
    ? 'rgba(10, 15, 30, 0.92)'
    : 'rgba(255, 255, 255, 0.72)';
  const panelBorder = isDark
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(255,255,255,0.55)';
  const panelShadow = isDark
    ? '0 20px 60px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.06)'
    : '0 16px 48px rgba(31,38,135,0.18), inset 0 1px 1px rgba(255,255,255,0.9)';

  const backdropBg = isDark ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.24)';

  const calendarPortal = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Clickable backdrop */}
          <motion.div
            key="dp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: backdropBg,
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            onClick={() => setIsOpen(false)}
          />

          {/* Calendar panel */}
          <motion.div
            key="dp-panel"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              ...panelStyle,
              background: panelBg,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: `1px solid ${panelBorder}`,
              borderRadius: 20,
              boxShadow: panelShadow,
              padding: 18,
            }}
          >
            {/* ── Month header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                style={{
                  width: 32, height: 32, borderRadius: 10, border: `1px solid ${panelBorder}`,
                  background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: isDark ? 'rgba(255,255,255,0.8)' : '#334155',
                }}
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{
                fontSize: 13, fontWeight: 800, letterSpacing: '0.04em',
                color: isDark ? 'rgba(255,255,255,0.9)' : '#0f172a',
              }}>
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                style={{
                  width: 32, height: 32, borderRadius: 10, border: `1px solid ${panelBorder}`,
                  background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: isDark ? 'rgba(255,255,255,0.8)' : '#334155',
                }}
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {/* ── Day labels ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                <div key={d} style={{
                  textAlign: 'center', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                  textTransform: 'uppercase', padding: '4px 0',
                  color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(71,85,105,0.7)',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* ── Day grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
              {days.map((day, idx) => {
                const isSelected = !!(selectedDate && isSameDay(day, selectedDate));
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isDisabled = !!(minDateParsed && isBefore(day, minDateParsed));
                const todayDay = isToday(day);

                let cellBg = 'transparent';
                let cellColor = isDark ? 'rgba(255,255,255,0.82)' : '#334155';
                let cellBorder = 'transparent';
                let cellShadow = 'none';
                let scale = '1';

                if (isSelected) {
                  cellBg = 'linear-gradient(135deg, #3b82f6, #6366f1)';
                  cellColor = '#ffffff';
                  cellShadow = '0 0 14px rgba(99,102,241,0.55)';
                  scale = '1.1';
                } else if (todayDay) {
                  cellBg = isDark ? 'rgba(59,130,246,0.18)' : 'rgba(219,234,254,0.8)';
                  cellColor = isDark ? '#60a5fa' : '#1d4ed8';
                  cellBorder = isDark ? 'rgba(59,130,246,0.4)' : 'rgba(147,197,253,0.8)';
                }

                if (!isCurrentMonth) cellColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(71,85,105,0.25)';
                if (isDisabled) cellColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(71,85,105,0.15)';

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleDaySelect(day)}
                    style={{
                      width: 36, height: 36, margin: '0 auto',
                      borderRadius: 10,
                      border: `1px solid ${cellBorder}`,
                      background: cellBg,
                      color: cellColor,
                      boxShadow: cellShadow,
                      transform: `scale(${scale})`,
                      fontSize: 12, fontWeight: 700,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isDisabled) {
                        (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.70)';
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isDisabled) {
                        (e.currentTarget as HTMLButtonElement).style.background = isSelected ? '' : todayDay ? cellBg : 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.transform = `scale(${scale})`;
                      }
                    }}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            {/* ── Clear row ── */}
            {value && (
              <div style={{
                marginTop: 14, paddingTop: 12,
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(71,85,105,0.5)' }}>
                  Selected
                </span>
                <button
                  type="button"
                  onClick={() => { onChange(''); setIsOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#f87171', cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  <X size={10} /> Clear
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setIsOpen((v) => !v); }}
        className={cn(
          'w-full glass-input rounded-xl px-3 py-2 flex items-center justify-between text-sm font-semibold transition-all',
          'text-slate-800 dark:text-slate-100',
          isOpen && 'ring-2 ring-indigo-400/30 !border-indigo-300/50 dark:!border-indigo-500/30'
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <CalIcon size={14} className={cn('flex-shrink-0 transition-colors', value ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500')} />
          {value
            ? <span>{format(new Date(value), 'MMM d, yyyy')}</span>
            : <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          }
        </span>
      </button>

      {typeof document !== 'undefined' && createPortal(calendarPortal, document.body)}
    </div>
  );
}
