import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Tag, Clock, IndianRupee, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { checkTimetableClash } from '../utils/checkClash';

const statusColors = {
  open: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 hover:bg-emerald-600 border-emerald-500/20',
  closed: 'bg-red-500 text-white shadow-sm shadow-red-500/40 hover:bg-red-600 border-red-500/20',
  completed: 'bg-blue-500 text-white shadow-sm shadow-blue-500/40 hover:bg-blue-600 border-surface-500/20',
  upcoming: 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/40 hover:bg-cyan-600 border-blue-500/20',
};

const categoryColors = {
  Tech: 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/40 hover:bg-cyan-600',
  Cultural: 'bg-purple-500 text-white shadow-sm shadow-purple-500/40',
  Sports: 'bg-green-500 text-white shadow-sm shadow-green-500/40',
  Workshop: 'bg-amber-500 text-white shadow-sm shadow-amber-500/40',
  Seminar: 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/40',
  Hackathon: 'bg-pink-500 text-white shadow-sm shadow-pink-500/40',
};

export default function EventCard({ event, index = 0 }) {
  const { user } = useAuth();
  const hasClash = user ? checkTimetableClash(event.date, event.endDate, user.classes) : false;

  const date = new Date(event.date);
  const formattedDate = date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  const registrationCount = event.registrationCount || 0;
  const capacityPercent = Math.min((registrationCount / event.maxParticipants) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link to={`/events/${event.id}`} className="block group">
        <div className="rounded-2xl overflow-hidden dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 card-hover shadow-sm dark:shadow-none h-full flex flex-col">
          {/* Image */}
          <div className="relative h-48 overflow-hidden flex-shrink-0">
            <img
              src={event.poster}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Status badge */}
            <div className="absolute top-3 left-3">
              <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-lg border ${statusColors[event.status]}`}>
                {event.status}
              </span>
            </div>

            {/* Price badge */}
            {event.isPaid && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-accent-500/90 backdrop-blur-sm rounded-lg shadow-sm shadow-accent-500/40">
                <IndianRupee className="w-3 h-3" />
                {event.price}
              </div>
            )}

            {/* Timetable Clash Badge & Date */}
            <div className="absolute bottom-3 left-3 flex flex-col items-start gap-2">
              {hasClash ? (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm shadow-red-500/50">
                  <AlertTriangle className="w-3 h-3" /> Class Clash
                </div>
              ) : event.status === 'open' && user?.classes?.length > 0 ? (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500 text-white rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm shadow-emerald-500/50">
                  <CheckCircle2 className="w-3 h-3" /> Free to Go
                </div>
              ) : null}

              <div className="flex items-center gap-1.5 text-white text-sm font-medium">
                <Calendar className="w-4 h-4" />
                {formattedDate}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md ${categoryColors[event.category] || 'bg-blue-500 text-white shadow-sm shadow-blue-500/40'}`}>
                {event.category}
              </span>
              {event.teamEvent && (
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-orange-500 text-white shadow-sm shadow-orange-500/40">
                  Team
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold dark:text-white text-surface-900 mb-2 group-hover:text-primary-500 transition-colors line-clamp-1">
              {event.title}
            </h3>

            <p className="text-sm dark:text-surface-400 text-surface-500 mb-4 line-clamp-2 flex-1">
              {event.description}
            </p>

            <div className="space-y-3 mt-auto pt-2">
              <div className="flex items-center gap-4 text-xs font-medium dark:text-surface-300 text-surface-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary-400" /> {event.venue.split(',')[0]}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary-400" /> {formattedTime}
                </span>
              </div>

              {/* Capacity bar */}
              <div>
                <div className="flex items-center justify-between text-xs dark:text-surface-400 text-surface-500 mb-1.5">
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5" /> Registrations
                  </span>
                  <span className="font-bold dark:text-white text-surface-900">{registrationCount}/{event.maxParticipants}</span>
                </div>
                <div className="h-1.5 rounded-full dark:bg-surface-800 bg-surface-100 overflow-hidden">
                  <div
                    className="h-full rounded-full gradient-bg transition-all duration-500"
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
