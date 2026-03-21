import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Calendar, Tag, AlertCircle } from 'lucide-react';
import { useAuthStore, useLinksStore } from '../store';
import toast from 'react-hot-toast';
import { FullScreenLoader } from './Skeletons';
import { isValid, parseISO, isAfter } from 'date-fns';
import { GlassDatePicker } from './ui/GlassDatePicker';

import { cn } from '@/lib/utils';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const validate = (url: string, alias: string, existingAliases: string[]) => {
  const errs: Record<string, string> = {};
  try { new URL(url); } catch { errs.url = 'Enter a valid URL (include https://)'; }
  if (!alias.trim()) {
    errs.alias = 'Alias is required';
  } else if (!/^[a-z0-9-]+$/.test(alias)) {
    errs.alias = 'Only lowercase letters, numbers and hyphens';
  } else if (existingAliases.includes(alias.trim())) {
    errs.alias = `Alias "${alias}" is already taken`;
  }
  return errs;
};

export const AddLinkModal: React.FC<AddLinkModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { links, addLink } = useLinksStore();
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiry, setExpiry] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingAliases = links.map((l) => l.alias);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(url, alias, existingAliases);
    if (expiry) {
      const parsed = parseISO(expiry);
      if (!isValid(parsed) || !isAfter(parsed, new Date())) {
        errs.expiry = 'Expiry must be a future date';
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      const link = await addLink(user!.id, {
        originalUrl: url,
        alias: alias.trim(),
        expiryDate: expiry || null,
      });
      toast.success(`Created: ${link.shortUrl}`);
      setUrl(''); setAlias(''); setExpiry(''); setErrors({});
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-[4px] z-50 flex items-center justify-center px-4"
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="glass-panel w-full max-w-md p-8 space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-[#e2e8f0] tracking-tight">Add New URL</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* URL field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-200 flex items-center gap-1.5">
                <Link2 size={12} /> Destination URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/long-url"
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400/70 dark:placeholder:text-slate-400/60 ${
                  errors.url
                    ? 'glass-input !border-rose-400 dark:!border-rose-500 bg-rose-500/10 dark:bg-rose-900/20'
                    : 'glass-input focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              />
              {errors.url && (
                <p className="text-rose-500 text-xs font-semibold flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.url}
                </p>
              )}
            </div>

            {/* Alias field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-200 flex items-center gap-1.5">
                <Tag size={12} /> Custom Alias
              </label>
              <div className={cn(
                "flex items-center w-full rounded-xl transition-all border outline-none overflow-hidden group/alias",
                "bg-white/5 dark:bg-slate-900/60 backdrop-blur-md",
                errors.alias 
                  ? "border-rose-400 dark:border-rose-500 bg-rose-500/10 dark:bg-rose-900/20" 
                  : "border-slate-200 dark:border-white/15 hover:bg-white/10 dark:hover:bg-slate-900/80 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
              )}>
                <span className="pl-3 pr-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 select-none">
                  shrt.ly/
                </span>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="my-link"
                  className="flex-1 pl-1 pr-4 py-3 text-sm font-bold bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>
              {errors.alias && (
                <p className="text-rose-500 text-xs font-semibold flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.alias}
                </p>
              )}
            </div>

            {/* Expiry date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar size={12} /> Expiry Date <span className="text-slate-500 dark:text-slate-400 normal-case font-medium">(optional)</span>
              </label>
              <GlassDatePicker
                value={expiry}
                onChange={setExpiry}
                minDate={new Date().toISOString().split('T')[0]}
                placeholder="No expiry"
                className={errors.expiry ? 'ring-2 ring-rose-400/50 rounded-xl' : ''}
              />
              {errors.expiry && (
                <p className="text-rose-500 text-xs font-semibold flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.expiry}
                </p>
              )}
            </div>

            {/* Actions */}
              <div className="pt-4 border-t border-slate-700/10 dark:border-slate-300/10 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-700 dark:text-slate-200 bg-slate-200/50 dark:bg-slate-800/60 border border-slate-300/30 dark:border-white/10 hover:bg-slate-300/50 dark:hover:bg-slate-800/80 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 relative py-3 px-4 rounded-xl font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 overflow-hidden group hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 rounded-xl overflow-hidden pointer-events-none">
                    <FullScreenLoader />
                  </div>
                )}
                {isSubmitting
                  ? 'Creating...'
                  : 'Create Short URL'
                }
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
