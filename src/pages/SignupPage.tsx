import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Chrome, Sun, Moon, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store';
import { useTheme } from '../hooks/useTheme';
import { Background } from '../components/ui/Background';
import { GlassInput } from '../components/ui/GlassInput';
import { Button } from '../components/ui/button';
import { showToast } from '../utils/toast';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSwitchToLogin }) => {
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(newErrors).length > 0) {
      showToast('Please fill all fields', 'error');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Signup failed');

      const userData = data.data ?? data;
      localStorage.setItem('auth_token', userData.token);
      login({
        id: userData.user.id,
        name: userData.user.email.split('@')[0],
        email: userData.user.email,
        avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(userData.user.email)}`,
        provider: 'credentials',
      });
      showToast(data.message || 'Account created successfully!', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Signup failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
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
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-panel p-6 sm:p-8 space-y-8">
          {/* Header */}
          <div className="text-center pt-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-[#e2e8f0] tracking-tight">
              Create Account
            </h1>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <GlassInput
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password with toggle */}
              <div className="w-full space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                  Password
                </label>
                <div className="relative">
                  <GlassInput
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    error={errors.password}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Confirm password with toggle */}
              <div className="w-full space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                  Confirm
                </label>
                <div className="relative">
                  <GlassInput
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    error={errors.confirmPassword}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            </div>

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
                  Create Account <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
            onClick={handleGoogleSignup}
            disabled={isLoading}
            className="w-full h-12 rounded-xl border-slate-200 dark:border-white/15 bg-white/40 dark:bg-white/[0.08] hover:bg-white/60 dark:hover:bg-white/[0.15] transition-all font-bold gap-3 text-slate-900 dark:text-white/90"
          >
            <Chrome size={20} className="text-blue-600 dark:text-blue-400 drop-shadow-sm" />
            Sign up with Google
          </Button>

          <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold transition-colors"
            >
              Login
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
