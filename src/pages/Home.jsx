import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Users, Award, Sparkles, Zap, Shield, Star, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import EventCard from '../components/EventCard';
import * as api from '../services/api';
import { getRegistrations } from '../services/database';

export default function Home() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ events: 0, students: 0, certificates: 0 });

  useEffect(() => {
    api.fetchEvents().then(evts => {
      const counts = {};
      getRegistrations().forEach(r => { counts[r.eventId] = (counts[r.eventId] || 0) + 1; });
      setEvents(evts.map(e => ({ ...e, registrationCount: counts[e.id] || 0 })));
    });
    api.fetchAnalytics().then(a => {
      setStats({
        events: a.totalEvents,
        students: a.totalStudents,
        certificates: a.totalCertificates,
      });
    });
  }, []);

  // Soonest open events first
  const featuredEvents = events
    .filter(e => e.status === 'open' && new Date(e.date) > new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  return (
    <div className="min-h-screen dark:bg-surface-950 bg-surface-50">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/3 -right-32 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full dark:bg-white/5 bg-primary-50 border dark:border-white/10 border-primary-100 mb-8">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium dark:text-surface-300 text-primary-700">College Event Portal</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              <span className="dark:text-white text-surface-900">Discover, Register</span>
              <br />
              <span className="gradient-text">& Get Certified</span>
            </h1>

            <p className="text-lg sm:text-xl dark:text-surface-400 text-surface-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              Your one-stop platform for college event registration, participation tracking,
              and e-certificate generation. Never miss an opportunity.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/events"
                className="group inline-flex items-center gap-2 px-8 py-4 text-white font-semibold gradient-bg rounded-2xl shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 transition-all text-lg"
              >
                Explore Events
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/verify"
                className="inline-flex items-center gap-2 px-8 py-4 font-semibold dark:text-surface-200 text-surface-700 rounded-2xl border dark:border-white/10 border-surface-200 hover:border-primary-500/30 transition-all text-lg dark:bg-white/5 bg-white"
              >
                <Shield className="w-5 h-5" />
                Verify Certificate
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Calendar, label: 'Total Events', value: stats.events, color: 'text-primary-500 bg-primary-500/10' },
              { icon: Users, label: 'Students Registered', value: stats.students, color: 'text-accent-500 bg-accent-500/10' },
              { icon: Award, label: 'Certificates Issued', value: stats.certificates, color: 'text-success-500 bg-success-500/10' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                className="relative rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-8 text-center group card-hover"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${stat.color} mb-4`}>
                  <stat.icon className="w-7 h-7" />
                </div>
                <p className="text-4xl font-extrabold dark:text-white text-surface-900 mb-1">{stat.value}</p>
                <p className="text-sm dark:text-surface-400 text-surface-500 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      {featuredEvents.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold dark:text-white text-surface-900 mb-2">
                  Featured Events
                </h2>
                <p className="dark:text-surface-400 text-surface-500">
                  Don't miss these upcoming opportunities
                </p>
              </div>
              <Link
                to="/events"
                className="hidden sm:inline-flex items-center gap-1 text-primary-500 hover:text-primary-400 font-medium text-sm"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link to="/events" className="text-primary-500 font-medium">
                View All Events →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold dark:text-white text-surface-900 mb-3">
              Why EventHub?
            </h2>
            <p className="dark:text-surface-400 text-surface-500 max-w-xl mx-auto">
              Built for students and administrators to streamline the entire event lifecycle
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: 'Quick Registration',
                desc: 'Register for events in seconds with auto-filled profiles',
                color: 'text-amber-400 bg-amber-500/10',
              },
              {
                icon: Award,
                title: 'E-Certificates',
                desc: 'Auto-generated PDF certificates with QR verification',
                color: 'text-primary-400 bg-primary-500/10',
              },
              {
                icon: Calendar,
                title: 'Calendar View',
                desc: 'View all events in a beautiful calendar interface',
                color: 'text-emerald-400 bg-emerald-500/10',
              },
              {
                icon: Star,
                title: 'Rate & Feedback',
                desc: 'Rate events and leave feedback to help improve',
                color: 'text-accent-400 bg-accent-500/10',
              },
            ].map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-6 card-hover"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feat.color} mb-4`}>
                  <feat.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold dark:text-white text-surface-900 mb-2">{feat.title}</h3>
                <p className="text-sm dark:text-surface-400 text-surface-500 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 gradient-bg opacity-90" />
            <div className="absolute inset-0">
              <div className="absolute top-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-10 right-10 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
            </div>
            <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Create your account and start exploring amazing events at your college
              </p>
              {user ? (
                <Link
                  to={user.role === 'admin' ? '/admin' : '/dashboard'}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 font-bold rounded-2xl hover:bg-surface-50 transition-colors shadow-xl text-lg"
                >
                  Go to Dashboard <LayoutDashboard className="w-5 h-5" />
                </Link>
              ) : (
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 font-bold rounded-2xl hover:bg-surface-50 transition-colors shadow-xl text-lg"
                >
                  Sign Up Free <ArrowRight className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
