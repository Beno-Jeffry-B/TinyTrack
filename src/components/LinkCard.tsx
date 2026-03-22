import React, { memo } from 'react';
import type { LinkData } from '../types';
import OrbIndicator from './OrbIndicator';
import { Card } from '@/components/ui/card';
import { ClipboardCopy, ExternalLink, CalendarDays, MousePointerClick, Timer } from 'lucide-react';
import { formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { showToast } from '../utils/toast';

interface LinkCardProps {
  link: LinkData;
  maxClicks: number;
  onClick: (link: LinkData) => void;
  isActive?: boolean;
}

export const LinkCard: React.FC<LinkCardProps> = memo(({ link, maxClicks, onClick, isActive }) => {
  const isExpired = link.expiryDate != null && isPast(parseISO(link.expiryDate));

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link.shortUrl);
    showToast('Copied to clipboard!', 'success');
  };

  return (
    <motion.div
      whileHover={{ scale: isExpired ? 1 : 1.018, y: isExpired ? 0 : -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className="h-full"
    >
      <Card
        onClick={() => onClick(link)}
        className={cn(
          'group relative flex flex-col gap-4 sm:gap-5 p-5 glass-panel glass-panel-hover cursor-pointer h-full overflow-hidden',
          isActive && 'ring-2 ring-blue-500/40',
          isExpired && 'grayscale-[0.3]'
        )}
        role="button"
        tabIndex={0}
        aria-label={`Link card for ${link.shortUrl}`}
      >
        {/* Expired banner */}
        {isExpired && (
          <div className="absolute top-0 right-0 bg-[#ef4444] text-white text-[10px] sm:text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1 z-20 shadow-md">
            <Timer size={10} /> Expired
          </div>
        )}

        {/* Top row: orb + URL + badge */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 transition-transform group-hover:scale-105 duration-300">
            <OrbIndicator clicks={link.clicks} maxClicks={maxClicks} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-1">
            <h3 className="text-lg sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-relaxed sm:leading-snug group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              {link.shortUrl}
            </h3>
            <p className="text-sm sm:text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate flex items-center gap-1.5">
              <ExternalLink size={12} className="flex-shrink-0 text-slate-400 dark:text-slate-500" />
              {link.originalUrl}
            </p>
          </div>
        </div>

        {/* Bottom row: stats + copy */}
        <div className="flex items-center gap-4 pt-2 sm:pt-1 border-t border-slate-700/10 dark:border-slate-300/10 mt-auto">
          <span className={cn(
            'flex items-center gap-1.5 text-sm sm:text-[11px] font-bold text-slate-700 dark:text-slate-200 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-black/5 dark:border-white/10 bg-black/5 dark:bg-black/30 transition-colors',
            !isExpired && 'group-hover:bg-blue-500/10 dark:group-hover:bg-blue-400/10 group-hover:border-blue-500/20 dark:group-hover:border-blue-400/20 group-hover:text-blue-700 dark:group-hover:text-blue-400'
          )}>
            <MousePointerClick size={14} className={!isExpired ? 'text-blue-500 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'} />
            {link.clicks.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5 text-sm sm:text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <CalendarDays size={14} className="text-slate-400 dark:text-slate-500" />
            {formatDistanceToNow(new Date(link.lastVisited), { addSuffix: true })}
          </span>
          <motion.button
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
            onClick={handleCopy}
            className="ml-auto p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 border border-transparent hover:border-blue-100 dark:hover:border-slate-700"
            title="Copy short URL"
          >
            <ClipboardCopy size={15} />
          </motion.button>
        </div>
      </Card>
    </motion.div>
  );
});


