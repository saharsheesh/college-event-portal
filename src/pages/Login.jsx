import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useNotification } from '../context/useNotification';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Eye, EyeOff, Calendar } from 'lucide-react';

export default function Login() {
  const { login, clearError } = useAuth();
  const { success, error: showError } = useNotification();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-surface-950 bg-surface-50 pt-20 pb-10 px-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-3xl dark:bg-surface-900/80 bg-white border dark:border-white/10 border-surface-200 shadow-2xl dark:shadow-none p-8 sm:p-10 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-bg shadow-lg shadow-primary-500/25 mb-4">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold dark:text-white text-surface-900 mb-2">Welcome Back</h1>
            <p className="text-sm dark:text-surface-400 text-surface-500">Sign in to your EventHub account</p>
          </div>

          {/* Demo credentials */}
          <div className="mb-6 p-3 rounded-xl dark:bg-primary-500/5 bg-primary-50 border dark:border-primary-500/20 border-primary-100">
            <p className="text-xs font-medium text-primary-500 mb-1">Demo Credentials</p>
            <p className="text-[11px] dark:text-surface-400 text-surface-500">
              Admin: admin@college.edu / admin123<br />
              Student: student@college.edu / student123
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium dark:text-surface-300 text-surface-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 dark:text-surface-500 text-surface-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition"
                  placeholder="you@college.edu"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-surface-300 text-surface-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 dark:text-surface-500 text-surface-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-11 pr-12 py-3 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 dark:text-surface-500 text-surface-400 hover:text-primary-500 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold gradient-bg shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm dark:text-surface-400 text-surface-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary-500 hover:text-primary-400 font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
