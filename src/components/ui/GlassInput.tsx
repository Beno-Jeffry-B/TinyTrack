import React from 'react';
import { cn } from '@/lib/utils';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all outline-none",
            "bg-white/20 dark:bg-white/5 backdrop-blur-md",
            "border border-white/30 dark:border-white/10",
            "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10",
            error && "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/10",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[11px] font-bold text-rose-500 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';
