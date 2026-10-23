import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Grid3X3, Calendar as CalIcon, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import InterestsModal from '../components/InterestsModal';
import EventCard from '../components/EventCard';
import CalendarView from '../components/CalendarView';
import * as api from '../services/api';
import { getRegistrations } from '../services/database';
import { CATEGORIES } from '../utils/seedData';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Students without interests get asked once per visit; null means "not dismissed yet"
  const [interestsModalChoice, setInterestsModalChoice] = useState(null);
  const needsInterests = user?.role === 'student' && !(user.interests?.length > 0);
  const showInterestsModal = interestsModalChoice ?? needsInterests;
  const setShowInterestsModal = setInterestsModalChoice;

  // Filters live in the URL so links like /events?category=Tech work
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const status = searchParams.get('status') || '';

  const setFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  };
  const setSearch = (v) => setFilter('search', v);
  const setCategory = (v) => setFilter('category', v);
  const setStatus = (v) => setFilter('status', v);

  useEffect(() => {
    api.fetchEvents().then(evts => {
      const counts = {};
      getRegistrations().forEach(r => { counts[r.eventId] = (counts[r.eventId] || 0) + 1; });
      setEvents(evts.map(e => ({ ...e, registrationCount: counts[e.id] || 0 })));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let result = [...events];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q)
      );
    }
    if (category) {
      result = result.filter(e => e.category === category);
    }
    if (status) {
      result = result.filter(e => e.status === status);
    }
    return result;
  }, [events, search, category, status]);

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const hasFilters = search || category || status;

  const suggestedEvents = user?.interests?.length > 0
    ? events
        .filter(e => e.status === 'open' && user.interests.includes(e.category))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  return (
    <div className="min-h-screen dark:bg-surface-950 bg-surface-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold dark:text-white text-surface-900 mb-2">
            Explore Events
          </h1>
          <p className="dark:text-surface-400 text-surface-500 mb-4">
            Discover and register for exciting events at your college
          </p>
          {user && user.role === 'student' && user.interests?.length > 0 && (
             <button onClick={() => setShowInterestsModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-500 bg-primary-500/10 hover:bg-primary-500/20 transition">
               <Sparkles className="w-3.5 h-3.5" /> Edit My Interests
             </button>
          )}
        </motion.div>

        {/* Suggested For You */}
        {!search && !category && !status && suggestedEvents.length > 0 && viewMode === 'grid' && (
          <div className="mb-10">
            <h2 className="text-lg font-bold dark:text-white text-surface-900 flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-400" /> Suggested For You
            </h2>
            <div className="flex overflow-x-auto gap-6 pb-6 pt-2 hide-scrollbar snap-x">
              {suggestedEvents.slice(0, 6).map((event, i) => (
                <div key={event.id} className="w-[320px] flex-shrink-0 snap-start">
                  <EventCard event={event} index={i} />
                </div>
              ))}
            </div>
            <div className="h-px w-full dark:bg-white/10 bg-surface-200 mt-2" />
          </div>
        )}

        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 dark:text-surface-500 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl dark:bg-surface-900/50 bg-white border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition"
                placeholder="Search events by name, description, or venue..."
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl dark:bg-surface-900/50 bg-white border dark:border-white/10 border-surface-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'dark:text-surface-400 text-surface-500'}`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2.5 rounded-lg transition ${viewMode === 'calendar' ? 'bg-primary-500 text-white' : 'dark:text-surface-400 text-surface-500'}`}
              >
                <CalIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 dark:text-surface-400 text-surface-500" />

            {/* Category filters */}
            {['All', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat === 'All' ? '' : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  (cat === 'All' && !category) || category === cat
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                    : 'dark:bg-surface-900/50 bg-white dark:text-surface-300 text-surface-600 border dark:border-white/5 border-surface-200 hover:border-primary-500/30'
                }`}
              >
                {cat}
              </button>
            ))}

            <div className="h-6 w-px dark:bg-white/10 bg-surface-200" />

            {/* Status filters */}
            {['open', 'completed', 'closed'].map(s => (
              <button
                key={s}
                onClick={() => setStatus(status === s ? '' : s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                  status === s
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                    : 'dark:bg-surface-900/50 bg-white dark:text-surface-300 text-surface-600 border dark:border-white/5 border-surface-200 hover:border-primary-500/30'
                }`}
              >
                {s}
              </button>
            ))}

            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarView events={filtered} onEventClick={(evt) => navigate(`/events/${evt.id}`)} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <h3 className="text-xl font-bold dark:text-white text-surface-900 mb-2">No events found</h3>
            <p className="dark:text-surface-400 text-surface-500 mb-4">Try adjusting your search or filter criteria</p>
            <button onClick={clearFilters} className="text-primary-500 font-medium hover:text-primary-400 transition">
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm dark:text-surface-400 text-surface-500 mb-4">
              Showing {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          </>
        )}
      </div>

      <InterestsModal isOpen={showInterestsModal} onClose={() => setShowInterestsModal(false)} />
    </div>
  );
}
