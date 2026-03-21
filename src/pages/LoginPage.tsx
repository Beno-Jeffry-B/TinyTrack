import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Chrome, Sun, Moon, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store';
import { useTheme } from '../hooks/useTheme';
import { Background } from '../components/ui/Background';
import { GlassInput } from '../components/ui/GlassInput';
import { Button } from '../components/ui/button';
import toast from 'react-hot-toast';
import type { User } from '../types';

const MOCK_USER: User = {
  id: 'user-1',
  name: 'Alex Johnson',
  email: 'alex@example.com',
  avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Alex',
  provider: 'credentials',
};

interface LoginPageProps {
  onSwitchToSignup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignup }) => {
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.identifier.trim()) newErrors.identifier = 'Username or Email is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    login(MOCK_USER);
    setIsLoading(false);
    toast.success('Logged in successfully!');
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    login(MOCK_USER);
    setIsLoading(false);
    toast.success('Signed in with Google');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 relative overflow-hidden transition-colors duration-300">
      <Background />

      {/* Theme Toggle in top-right */}
      <div className="fixed top-8 right-8 z-50">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl glass-panel text-slate-700 dark:text-slate-200 transition-all hover:scale-110 active:scale-95 shadow-lg"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="glass-panel p-6 sm:p-8 space-y-8">
          {/* Header */}
          <div className="text-center pt-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-[#e2e8f0] tracking-tight">
              Welcome Back
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <GlassInput
              label="Username or Email"
              placeholder="alex@example.com"
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              error={errors.identifier}
            />
            <GlassInput
              label="Password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-sm font-bold text-white shadow-xl transition-all group overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Login <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-slate-400 dark:text-slate-500 font-bold tracking-widest">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-12 rounded-xl border-slate-200 dark:border-white/15 bg-white/40 dark:bg-white/[0.08] hover:bg-white/60 dark:hover:bg-white/[0.15] transition-all font-bold gap-3 text-slate-900 dark:text-white/90"
          >
            <Chrome size={20} className="text-blue-600 dark:text-blue-400 drop-shadow-sm" />
            Login with Google
          </Button>

          <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 pt-2">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToSignup}
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold transition-colors"
            >
              Sign up
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

