import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle2, XCircle, FileText, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import { useAuthStore, useLinksStore } from '../store';
import type { CsvResult } from '../types';
import { FullScreenLoader } from './Skeletons';
import toast from 'react-hot-toast';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { addFromCsv } = useLinksStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<CsvResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'results'>('upload');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const rows = (parsed.data as Record<string, string>[]).map((r) => ({
          originalUrl: r.originalUrl || r.url || r.URL || '',
          alias: r.alias || r.Alias || '',
          expiryDate: r.expiryDate || r.expiry || '',
        })).filter((r) => r.originalUrl);

        if (rows.length === 0) {
          toast.error('No valid rows found. Ensure CSV has an "originalUrl" column.');
          return;
        }

        setIsProcessing(true);
        const res = await addFromCsv(user!.id, rows);
        setResults(res);
        setStep('results');
        setIsProcessing(false);

        const successCount = res.filter((r) => r.success).length;
        toast.success(`${successCount}/${res.length} URLs created`);
      },
      error: () => toast.error('Failed to parse CSV file'),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) processFile(file);
    else toast.error('Please drop a .csv file');
  };

  const handleClose = () => {
    setStep('upload');
    setResults([]);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="glass-panel w-full max-w-lg p-8 space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Bulk CSV Upload</h2>
            </div>
            <button onClick={handleClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"><X size={18} /></button>
          </div>

          {step === 'upload' && (
            <div className="space-y-5">
              <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={32} className="mx-auto mb-3 text-slate-400 dark:text-slate-500" />
                <p className="font-bold text-slate-600 dark:text-slate-300">Drop CSV or click to upload</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Columns: <code>originalUrl</code>, <code>alias</code> (optional), <code>expiryDate</code> (optional)</p>
              </div>

              <div className="glass-panel rounded-xl shadow-none p-4 space-y-1 border-white/20 dark:border-white/10">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Example Format</p>
                <code className="text-[11px] text-slate-600 dark:text-slate-400 font-mono block">originalUrl,alias,expiryDate</code>
                <code className="text-[11px] text-slate-600 dark:text-slate-400 font-mono block">https://example.com,my-link,2026-12-31</code>
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-3xl">
                  <FullScreenLoader />
                </div>
              )}

              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={15} /> {results.filter((r) => r.success).length} created
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-rose-500 dark:text-rose-400 flex items-center gap-1">
                  <XCircle size={15} /> {results.filter((r) => !r.success).length} failed
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
                    r.success ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800'
                  }`}>
                    {r.success
                      ? <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      : <AlertTriangle size={14} className="text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    }
                    <div className="min-w-0">
                      <p className="font-bold truncate text-slate-700 dark:text-slate-300">{r.row.originalUrl}</p>
                      {r.success && <p className="text-emerald-600 dark:text-emerald-400 font-semibold">{r.shortUrl}</p>}
                      {!r.success && <p className="text-rose-600 dark:text-rose-400">{r.error}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold rounded-xl hover:bg-black dark:hover:bg-white transition-all"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
