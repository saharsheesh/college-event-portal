import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useNotification } from '../context/useNotification';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, Building, GraduationCap, Eye, EyeOff, Calendar, UserPlus } from 'lucide-react';
import { DEPARTMENTS, YEARS } from '../utils/seedData';

export default function Signup() {
  const { signup, clearError } = useAuth();
  const { success, error: showError } = useNotification();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    department: '', year: '', phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (form.password !== form.confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword: _confirmPassword, ...userData } = form;
      const user = await signup(userData);
      success(`Welcome to EventHub, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-surface-950 bg-surface-50 pt-24 pb-10 px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        <div className="rounded-3xl dark:bg-surface-900/80 bg-white border dark:border-white/10 border-surface-200 shadow-2xl dark:shadow-none p-8 sm:p-10 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-bg shadow-lg shadow-primary-500/25 mb-4">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold dark:text-white text-surface-900 mb-2">Create Account</h1>
            <p className="text-sm dark:text-surface-400 text-surface-500">Join EventHub and start exploring events</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium dark:text-surface-300 text-surface-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-surface-500 text-surface-400" />
                  <input type="text" value={form.name} onChange={update('name')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition"
                    placeholder="Your Name" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-surface-300 text-surface-700 mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-surface-500 text-surface-400" />
                  <input type="tel" value={form.phone} onChange={update('phone')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition"
                    placeholder="9876543210" required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-surface-300 text-surface-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-surface-500 text-surface-400" />
                <input type="email" value={form.email} onChange={update('email')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition"
                  placeholder="you@college.edu" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium dark:text-surface-300 text-surface-700 mb-1.5">Department</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-surface-500 text-surface-400" />
                  <select value={form.department} onChange={update('department')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition appearance-none"
                    required>
                    <option value="">Select</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-surface-300 text-surface-700 mb-1.5">Year</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-surface-500 text-surface-400" />
                  <select value={form.year} onChange={update('year')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition appearance-none"
                    required>
                    <option value="">Select</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium dark:text-surface-300 text-surface-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-surface-500 text-surface-400" />
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition"
                    placeholder="Min 6 characters" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-surface-500 text-surface-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-surface-300 text-surface-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-surface-500 text-surface-400" />
                  <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition"
                    placeholder="••••••••" required />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold gradient-bg shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><UserPlus className="w-5 h-5" /> Create Account</>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm dark:text-surface-400 text-surface-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-400 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
