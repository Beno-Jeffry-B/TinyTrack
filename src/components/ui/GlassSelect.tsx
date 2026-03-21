import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GlassSelectOption {
  label: string;
  value: string;
}

interface GlassSelectProps {
  options: GlassSelectOption[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
  icon?: React.ReactNode;
}

export function GlassSelect({ options, value, onChange, className, icon }: GlassSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 200),
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (isOpen) updatePos();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
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

  const selectedOption = options.find((o) => o.value === value) || options[0];

  // Detect dark mode inline for portal elements
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const panelBg = isDark ? 'rgba(10,15,30,0.92)' : 'rgba(255,255,255,0.75)';
  const panelBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)';
  const panelShadow = isDark
    ? '0 16px 48px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.05)'
    : '0 12px 40px rgba(31,38,135,0.16), inset 0 1px 1px rgba(255,255,255,0.9)';
  const backdropBg = isDark ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.22)';

  const textColor = isDark ? 'rgba(255,255,255,0.88)' : '#1e293b';
  const hoverBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.70)';
  const selectedBg = 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25))';
  const selectedColor = isDark ? '#93c5fd' : '#1d4ed8';

  const dropdownPortal = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sel-backdrop"
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

          {/* Dropdown panel */}
          <motion.div
            key="sel-panel"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              ...panelStyle,
              background: panelBg,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: `1px solid ${panelBorder}`,
              borderRadius: 14,
              boxShadow: panelShadow,
              padding: 6,
            }}
            role="listbox"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', textAlign: 'left',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13, fontWeight: 600, lineHeight: 1.4,
                    cursor: 'pointer',
                    background: isSelected ? selectedBg : 'transparent',
                    color: isSelected ? selectedColor : textColor,
                    border: isSelected ? `1px solid ${isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.2)'}` : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    marginBottom: 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Check size={13} style={{ flexShrink: 0, marginLeft: 6, color: isDark ? '#818cf8' : '#4f46e5' }} />
                  )}
                </button>
              );
            })}
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
        onMouseDown={() => setIsOpen((v) => !v)}
        className={cn(
          'w-full glass-input rounded-xl px-4 py-2 flex items-center justify-between text-sm font-semibold transition-all',
          'text-slate-800 dark:text-slate-100',
          isOpen && 'ring-2 ring-indigo-400/30 !border-indigo-300/40 dark:!border-indigo-500/30'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 truncate">
          {icon && (
            <span className={cn('flex-shrink-0 transition-colors', isOpen ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500')}>
              {icon}
            </span>
          )}
          <span className="truncate">{selectedOption?.label}</span>
        </span>
        <ChevronDown
          size={14}
          className={cn('flex-shrink-0 ml-1 transition-transform duration-200', isOpen ? 'rotate-180 text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500')}
        />
      </button>

      {typeof document !== 'undefined' && createPortal(dropdownPortal, document.body)}
    </div>
  );
}
