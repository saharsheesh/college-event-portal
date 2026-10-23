import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/useAuth';
import { useNotification } from '../context/useNotification';
import * as api from '../services/api';
import { getRegistrations } from '../services/database';
import { generateCertificatePDF, downloadCertificate } from '../utils/generateCertificate';
import { generateODLetterPDF, downloadODLetter } from '../utils/generateODLetter';
import { checkTimetableClash } from '../utils/checkClash';
import { firstName } from '../utils/formatName';
import {
  Calendar, Award, Clock, CheckCircle, Download, Eye,
  BarChart3, FileText, ExternalLink, CalendarDays, Star, AlertTriangle, Sparkles
} from 'lucide-react';
import EventCard from '../components/EventCard';
import TimetableGrid from '../components/TimetableGrid';
import InterestsModal from '../components/InterestsModal';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { success, error: showError } = useNotification();

  const [registrations, setRegistrations] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [suggestedEvents, setSuggestedEvents] = useState([]);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [downloadingCert, setDownloadingCert] = useState(null);
  const [downloadingOD, setDownloadingOD] = useState(null);
  const [timetableDirty, setTimetableDirty] = useState(false);

  useEffect(() => {
    if (user) {
      Promise.all([
        api.fetchUserRegistrations(user.id),
        api.fetchUserCertificates(user.id),
        api.fetchEvents()
      ]).then(([regs, certs, events]) => {
        setRegistrations(regs);
        setCertificates(certs);

        const counts = {};
        getRegistrations().forEach(r => { counts[r.eventId] = (counts[r.eventId] || 0) + 1; });
        const allEvents = events
          .map(e => ({ ...e, registrationCount: counts[e.id] || 0 }))
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (user.interests?.length > 0) {
           const registeredEventIds = regs.map(r => r.eventId);
           const suggestions = allEvents.filter(e => {
             if (e.status !== 'open' || registeredEventIds.includes(e.id)) return false;
             return user.interests.includes(e.category);
           });
           setSuggestedEvents(suggestions.slice(0, 3));
        } else if (user.department) {
           const registeredEventIds = regs.map(r => r.eventId);
           const targetDept = user.department.toLowerCase();
           
           const suggestions = allEvents.filter(e => {
             if (e.status !== 'open' || registeredEventIds.includes(e.id)) return false;
             if (!e.department) return false;
             const evtDept = e.department.toLowerCase();
             
             return evtDept === targetDept || evtDept.includes(targetDept) || targetDept.includes(evtDept) || 
                    (targetDept === 'cs' && evtDept.includes('computer')) ||
                    (evtDept === 'cs' && targetDept.includes('computer'));
           });
           
           setSuggestedEvents(suggestions.slice(0, 3));
        }
        
        setLoading(false);
      });
    }
  }, [user]);

  const handleDownloadCert = async (cert) => {
    setDownloadingCert(cert.id);
    try {
      const doc = await generateCertificatePDF(cert);
      downloadCertificate(doc, cert.certificateNumber);
      success('Certificate downloaded!');
    } catch {
      showError('Failed to generate certificate');
    } finally {
      setDownloadingCert(null);
    }
  };

  const handleRequestOD = async (reg) => {
    try {
      await api.updateODStatus(reg.id, 'pending');
      success('OD Request sent to Organizer!');
      setRegistrations(regs => regs.map(r => r.id === reg.id ? { ...r, odStatus: 'pending' } : r));
    } catch {
      showError('Failed to request OD');
    }
  };

  const handleDownloadOD = async (event, regId) => {
    setDownloadingOD(regId);
    try {
      const doc = await generateODLetterPDF({ user, event });
      downloadODLetter(doc, user.name, event.title);
      success('OD Letter downloaded successfully!');
    } catch {
      showError('Failed to generate OD Letter');
    } finally {
      setDownloadingOD(null);
    }
  };

  const now = new Date();

  // Upcoming: not marked completed and not yet over (open or closed for registration)
  const upcoming = registrations.filter(r =>
    r.event &&
    r.event.status !== 'completed' &&
    new Date(r.event.endDate || r.event.date) >= now
  );

  // Completed: marked completed, or already over
  const completed = registrations.filter(r => r.event && !upcoming.includes(r));

  const all = registrations.filter(r => r.event);

  const tabData = { all, upcoming, completed, certificates };
  const tabs = [
    { key: 'all', label: 'All Events', icon: Calendar, count: all.length },
    { key: 'upcoming', label: 'Upcoming', icon: Clock, count: upcoming.length },
    { key: 'completed', label: 'Completed', icon: CheckCircle, count: completed.length },
    { key: 'certificates', label: 'Certificates', icon: Award, count: certificates.length },
    { key: 'timetable', label: 'My Timetable', icon: CalendarDays, count: '⚙️' },
  ];

  const switchTab = (key) => {
    if (activeTab === 'timetable' && timetableDirty && key !== 'timetable') {
      if (!window.confirm('You have unsaved changes to your timetable! Switch tabs without saving?')) return;
      setTimetableDirty(false);
    }
    setActiveTab(key);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-surface-950 bg-surface-50 pt-20">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-surface-950 bg-surface-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold dark:text-white text-surface-900 mb-2">
                Welcome back, {firstName(user.name)}! 👋
              </h1>
              <p className="dark:text-surface-400 text-surface-500">
                Track your events and download certificates
              </p>
            </div>
            <button onClick={() => setShowInterestsModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-primary-500 bg-primary-500/10 hover:bg-primary-500/20 transition">
              <Sparkles className="w-4 h-4" /> Update Interests
            </button>
          </div>
        </motion.div>

                {/* Suggested Events */}
        {suggestedEvents.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold dark:text-white text-surface-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> 
              Suggested for You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {suggestedEvents.map((evt, i) => (
                <EventCard key={evt.id} event={evt} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {tabs.map((tab, i) => (
            <motion.button
              key={tab.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => switchTab(tab.key)}
              className={`p-5 rounded-2xl border text-left transition-all card-hover ${
                activeTab === tab.key
                  ? 'dark:bg-primary-500/10 bg-primary-50 border-primary-500/30 shadow-lg shadow-primary-500/10'
                  : 'dark:bg-surface-900/50 bg-white dark:border-white/5 border-surface-200'
              }`}
            >
              <tab.icon className={`w-6 h-6 mb-3 ${activeTab === tab.key ? 'text-primary-500' : 'dark:text-surface-400 text-surface-500'}`} />
              <p className="text-2xl font-bold dark:text-white text-surface-900">{tab.count}</p>
              <p className="text-xs dark:text-surface-400 text-surface-500 font-medium mt-0.5">{tab.label}</p>
            </motion.button>
          ))}
        </div>

        {/* Tabs content */}
        <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 overflow-hidden">
          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b dark:border-white/10 border-surface-200">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent dark:text-surface-400 text-surface-500 hover:text-primary-500'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? 'bg-primary-500/10 text-primary-500' : 'dark:bg-surface-800 bg-surface-100 dark:text-surface-400 text-surface-500'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'timetable' ? (
              <TimetableGrid setDirty={setTimetableDirty} />
            ) : activeTab === 'certificates' ? (
              certificates.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 mx-auto dark:text-surface-700 text-surface-300 mb-4" />
                  <h3 className="text-lg font-bold dark:text-white text-surface-900 mb-2">No certificates yet</h3>
                  <p className="dark:text-surface-400 text-surface-500 text-sm">Complete events to earn certificates</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {certificates.map((cert, i) => (
                    <motion.div
                      key={cert.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-5 rounded-xl dark:bg-surface-800/30 bg-surface-50 border dark:border-white/5 border-surface-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold dark:text-white text-surface-900">{cert.eventName}</h4>
                          <p className="text-xs dark:text-surface-400 text-surface-500 mt-0.5">
                            {new Date(cert.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <Award className="w-8 h-8 text-amber-400" />
                      </div>
                      <p className="text-xs dark:text-surface-500 text-surface-400 font-mono mb-4">{cert.certificateNumber}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadCert(cert)}
                          disabled={downloadingCert === cert.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white gradient-bg hover:opacity-90 transition disabled:opacity-50"
                        >
                          {downloadingCert === cert.id ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <><Download className="w-3.5 h-3.5" /> Download PDF</>
                          )}
                        </button>
                        <Link
                          to={`/verify?cert=${cert.certificateNumber}`}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold dark:text-surface-300 text-surface-600 border dark:border-white/10 border-surface-200 hover:border-primary-500/30 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Verify
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              tabData[activeTab].length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto dark:text-surface-700 text-surface-300 mb-4" />
                  <h3 className="text-lg font-bold dark:text-white text-surface-900 mb-2">No events here</h3>
                  <p className="dark:text-surface-400 text-surface-500 text-sm mb-4">Browse and register for events</p>
                  <Link to="/events" className="text-primary-500 font-medium hover:text-primary-400">
                    Explore Events →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {tabData[activeTab].map((reg, i) => {
                    const e = reg.event;
                    if (!e) return null;
                    const cert = certificates.find(c => c.eventId === e.id);
                    return (
                      <motion.div
                        key={reg.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 p-4 rounded-xl dark:bg-surface-800/30 bg-surface-50 border dark:border-white/5 border-surface-100 hover:border-primary-500/20 transition"
                      >
                        <img src={e.poster} alt={e.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold dark:text-white text-surface-900 truncate">{e.title}</h4>
                          <div className="flex items-center gap-3 mt-1 text-xs dark:text-surface-400 text-surface-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md font-semibold uppercase text-[10px] ${
                              e.status === 'completed' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 hover:bg-emerald-600' :
                              e.status === 'open' ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/40 hover:bg-cyan-600' : 'bg-blue-500 text-white shadow-sm shadow-blue-500/40 hover:bg-blue-600'
                            }`}>{e.status}</span>
                            {reg.attended && <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Attended</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {activeTab === 'upcoming' && checkTimetableClash(e.date, e.endDate, user?.classes) && (
                            <>
                              {reg.odStatus === 'approved' ? (
                                <button
                                  onClick={() => handleDownloadOD(e, reg.id)}
                                  disabled={downloadingOD === reg.id}
                                  className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-success-500 bg-success-500/10 hover:bg-success-500/20 transition disabled:opacity-50"
                                  title="Download Approved OD Letter"
                                >
                                  {downloadingOD === reg.id ? (
                                    <div className="w-3.5 h-3.5 border-[1.5px] border-success-500/30 border-t-success-500 rounded-full animate-spin" />
                                  ) : (
                                    <><Download className="w-3.5 h-3.5" /> OD Letter</>
                                  )}
                                </button>
                              ) : reg.odStatus === 'pending' ? (
                                <span className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-surface-400 bg-surface-500/10" title="OD Request Pending Organizer Approval">
                                  <Clock className="w-3.5 h-3.5" /> OD Pending
                                </span>
                              ) : reg.odStatus === 'rejected' ? (
                                <span className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-500/10" title="OD Request Rejected">
                                  <AlertTriangle className="w-3.5 h-3.5" /> OD Rejected
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleRequestOD(reg)}
                                  className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition"
                                  title="Request On-Duty (OD) Letter for clashing class slots"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" /> Request OD
                                </button>
                              )}
                            </>
                          )}
                          {cert && (
                            <button onClick={() => handleDownloadCert(cert)}
                              className="p-2 rounded-lg text-primary-500 hover:bg-primary-500/10 transition" title="Download Certificate">
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <Link to={`/events/${e.id}`} className="p-2 rounded-lg dark:text-surface-400 text-surface-500 hover:text-primary-500 transition">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>
      <InterestsModal isOpen={showInterestsModal} onClose={() => setShowInterestsModal(false)} />
    </div>
  );
}
