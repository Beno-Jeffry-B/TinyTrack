import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, AlertCircle, Calendar, Link2 } from 'lucide-react';
import { useLinksStore } from '../store';
import type { LinkData } from '../types';
import toast from 'react-hot-toast';
import { FullScreenLoader } from './Skeletons';
import { isValid, parseISO, isAfter } from 'date-fns';

interface EditLinkModalProps {
  link: LinkData;
  isOpen: boolean;
  onClose: () => void;
}

export const EditLinkModal: React.FC<EditLinkModalProps> = ({ link, isOpen, onClose }) => {
  const { updateLink } = useLinksStore();
  const [url, setUrl] = useState(link.originalUrl);
  const [expiry, setExpiry] = useState(link.expiryDate ? link.expiryDate.split('T')[0] : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    try { new URL(url); } catch { errs.url = 'Enter a valid URL (include https://)'; }
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
      await updateLink(link.id, { originalUrl: url, expiryDate: expiry || null });
      toast.success('Link updated successfully');
      onClose();
    } catch {
      toast.error('Failed to update link');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[70] flex items-center justify-center px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="glass-panel w-full max-w-md p-8 space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil size={16} className="text-blue-600 dark:text-blue-500" />
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Edit Link</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"><X size={18} /></button>
          </div>

          <div className="px-4 py-3 glass-panel rounded-xl shadow-none border-white/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-0.5">Short URL</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{link.shortUrl}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Link2 size={12} /> Destination URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold outline-none transition-all text-slate-900 dark:text-slate-100 ${
                  errors.url ? 'glass-input !border-rose-400 dark:!border-rose-500 bg-rose-500/10 dark:bg-rose-900/20' : 'glass-input'
                }`}
              />
              {errors.url && (
                <p className="text-rose-500 text-xs font-semibold flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.url}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar size={12} /> Expiry Date <span className="normal-case font-medium text-slate-400 dark:text-slate-500">(optional)</span>
              </label>
              <input
                type="date"
                value={expiry}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setExpiry(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold outline-none transition-all text-slate-900 dark:text-slate-100 ${
                  errors.expiry ? 'glass-input !border-rose-400 dark:!border-rose-500 bg-rose-500/10 dark:bg-rose-900/20' : 'glass-input'
                }`}
              />
              {errors.expiry && (
                <p className="text-rose-500 text-xs font-semibold flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.expiry}
                </p>
              )}
            </div>

            {isSubmitting && (
              <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 rounded-3xl overflow-hidden pointer-events-none">
                <FullScreenLoader />
              </div>
            )}
            
            {/* Actions */}
            <div className="pt-4 border-t border-slate-700/10 dark:border-slate-300/10 flex gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-700 dark:text-slate-300 glass-panel hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-black dark:hover:bg-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
