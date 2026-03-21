import React from 'react';
import { motion } from 'framer-motion';

// A set of skeleton shimmer cards for the grid
export const LinkCardSkeleton: React.FC = () => (
  <div className="glass-panel p-5 flex flex-col gap-5 h-full animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-14 h-14 rounded-[1.25rem] bg-slate-200 dark:bg-slate-700/50 flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-lg w-full" />
      </div>
      <div className="w-14 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
    </div>
    <div className="flex items-center gap-3 pt-1 border-t border-slate-700/10 dark:border-slate-300/10 mt-auto">
      <div className="h-7 w-24 rounded-lg bg-black/5 dark:bg-white/10" />
      <div className="h-4 w-28 rounded-lg bg-black/5 dark:bg-white/10" />
    </div>
  </div>
);

export const DashboardSkeletons: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
    {Array.from({ length: 6 }).map((_, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
        <LinkCardSkeleton />
      </motion.div>
    ))}
  </div>
);

export const AnalyticsSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse px-2 py-2">
    <div className="space-y-3">
      <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-700/50 rounded-lg" />
      <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem]" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem]" />
      <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem]" />
    </div>
    <div className="space-y-3 pt-4">
       <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-700/50 rounded-lg" />
       {Array.from({ length: 4 }).map((_, i) => (
         <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
       ))}
    </div>
  </div>
);

export const FullScreenLoader: React.FC = () => (
  <div className="fixed inset-0 z-[100] bg-[#f5f8ff] dark:bg-slate-950 flex flex-col items-center justify-center">
    <div className="relative flex items-center justify-center">
      {/* Outer blurred pulsing glow */}
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-40 h-40 bg-blue-500 rounded-full blur-[40px]"
      />
      {/* Inner sharp orb */}
      <motion.div
        animate={{ scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-400 dark:from-blue-500 dark:to-indigo-500 rounded-full shadow-[inset_0_-8px_20px_rgba(0,0,0,0.2),_0_0_40px_rgba(59,130,246,0.6)]"
      />
    </div>
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-12 text-sm font-bold tracking-[0.2em] uppercase text-blue-900/40 dark:text-blue-200/40"
    >
      Loading insights...
    </motion.p>
  </div>
);
