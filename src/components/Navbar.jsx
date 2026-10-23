import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';
import { useNotification } from '../context/useNotification';
import * as api from '../services/api';
import { firstName } from '../utils/formatName';
import {
  Menu, X, Sun, Moon, Bell, LogOut, User, LayoutDashboard,
  Shield, ChevronDown, Calendar
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const { success } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (user) {
      api.fetchNotifications(user.id).then(n => {
        setNotifications(n);
        setUnread(n.filter(x => !x.read).length);
      });
    }
  }, [user, location]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    success('Logged out successfully');
    navigate('/');
    setProfileOpen(false);
    setMobileOpen(false);
  };

  const handleReadAll = async () => {
    if (user) {
      await api.readAllNotifications(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    }
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/events', label: 'Events' },
    { to: '/verify', label: 'Verify' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b dark:border-white/10 border-surface-200 dark:bg-surface-950/80 bg-white/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:block">EventHub</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(link.to)
                    ? 'bg-primary-500/10 text-primary-500 dark:text-primary-400'
                    : 'dark:text-surface-300 text-surface-600 hover:bg-surface-100 dark:hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl dark:text-surface-300 text-surface-600 hover:bg-surface-100 dark:hover:bg-white/5 transition-all"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user && (
              <>
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="p-2 rounded-xl dark:text-surface-300 text-surface-600 hover:bg-surface-100 dark:hover:bg-white/5 transition-all relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-accent-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl dark:bg-surface-900 bg-white border dark:border-white/10 border-surface-200 overflow-hidden">
                      <div className="p-4 border-b dark:border-white/10 border-surface-200 flex items-center justify-between">
                        <h3 className="font-semibold dark:text-white text-surface-900">Notifications</h3>
                        {unread > 0 && (
                          <button onClick={handleReadAll} className="text-xs text-primary-500 hover:text-primary-400 font-medium">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-sm text-center dark:text-surface-400 text-surface-500">No notifications</p>
                        ) : (
                          notifications.slice(0, 10).map(n => (
                            <div
                              key={n.id}
                              className={`p-3 border-b dark:border-white/5 border-surface-100 last:border-0 ${
                                !n.read ? 'dark:bg-primary-500/5 bg-primary-50' : ''
                              }`}
                            >
                              <p className="text-sm font-medium dark:text-white text-surface-900">{n.title}</p>
                              <p className="text-xs dark:text-surface-400 text-surface-500 mt-0.5">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile dropdown */}
                <div className="relative hidden md:block" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-surface-100 dark:hover:bg-white/5 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-sm font-bold">
                      {firstName(user.name).charAt(0)}
                    </div>
                    <span className="text-sm font-medium dark:text-surface-200 text-surface-700">{firstName(user.name)}</span>
                    <ChevronDown className="w-4 h-4 dark:text-surface-400 text-surface-500" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl dark:bg-surface-900 bg-white border dark:border-white/10 border-surface-200 overflow-hidden">
                      <div className="p-3 border-b dark:border-white/10 border-surface-200">
                        <p className="text-sm font-semibold dark:text-white text-surface-900">{user.name}</p>
                        <p className="text-xs dark:text-surface-400 text-surface-500">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full bg-primary-500/10 text-primary-500">
                          {user.role}
                        </span>
                      </div>
                      <div className="p-1">
                        <Link
                          to={user.role === 'admin' ? '/admin' : '/dashboard'}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm dark:text-surface-300 text-surface-600 hover:bg-surface-100 dark:hover:bg-white/5 transition-all"
                        >
                          {user.role === 'admin' ? <Shield className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                          {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {!user && (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium dark:text-surface-300 text-surface-600 hover:text-primary-500 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-medium text-white gradient-bg rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-xl dark:text-surface-300 text-surface-600"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t dark:border-white/10 border-surface-200 dark:bg-surface-950/95 bg-white/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(link.to)
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'dark:text-surface-300 text-surface-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to={user.role === 'admin' ? '/admin' : '/dashboard'}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium dark:text-surface-300 text-surface-600"
                >
                  {user.role === 'admin' ? '🛡️ Admin Panel' : '📊 Dashboard'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-red-400"
                >
                  🚪 Logout
                </button>
              </>
            ) : (
              <div className="pt-2 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-3 rounded-xl text-sm font-medium dark:text-surface-300 text-surface-600 border dark:border-white/10 border-surface-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-3 rounded-xl text-sm font-medium text-white gradient-bg"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
