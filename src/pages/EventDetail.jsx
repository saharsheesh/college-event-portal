import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/useAuth';
import { checkTimetableClash } from '../utils/checkClash';
import { useNotification } from '../context/useNotification';
import * as api from '../services/api';
import { DEPARTMENTS, YEARS } from '../utils/seedData';
import {
  Calendar, MapPin, Users, Clock, Tag, ArrowLeft, IndianRupee,
  UserPlus, Star, Send, Timer, CheckCircle, XCircle, AlertCircle, UsersRound,
  AlertTriangle, CheckCircle2
} from 'lucide-react';

function timeUntil(targetDate) {
  const diff = new Date(targetDate) - new Date();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(() => timeUntil(targetDate));

  useEffect(() => {
    const calc = () => timeUntil(targetDate);
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-3">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="text-center">
          <div className="w-14 h-14 rounded-xl dark:bg-surface-800/50 bg-surface-100 border dark:border-white/10 border-surface-200 flex items-center justify-center">
            <span className="text-xl font-bold dark:text-white text-surface-900">{String(value).padStart(2, '0')}</span>
          </div>
          <span className="text-[10px] uppercase font-medium dark:text-surface-500 text-surface-400 mt-1 block">{unit}</span>
        </div>
      ))}
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  // Remount per event and per account so the form and registration state start fresh
  return <EventDetailPage key={`${id}-${user?.id ?? 'guest'}`} id={id} />;
}

function EventDetailPage({ id }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError, warning } = useNotification();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const [regForm, setRegForm] = useState(() => ({
    department: user?.department || '',
    year: user?.year || '',
    phone: user?.phone || '',
    teamName: '',
    teamMembers: [''],
  }));

  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadEvent = useCallback(async () => {
    try {
      const evt = await api.fetchEvent(id);
      setEvent(evt);
      setIsRegistered(user ? await api.checkRegistration(user.id, id) : false);
    } catch {
      showError('Event not found');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  }, [id, user, showError, navigate]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const validateRegForm = () => {
    if (!regForm.department || !regForm.year) return 'Please select your department and year';
    if (!/^\d{10}$/.test(regForm.phone.trim())) return 'Please enter a valid 10-digit phone number';
    if (event.teamEvent) {
      if (!regForm.teamName.trim()) return 'Please enter a team name';
      // The registering student counts as one member
      const teamSize = 1 + regForm.teamMembers.filter(m => m.trim()).length;
      if (event.minTeamSize && teamSize < event.minTeamSize) {
        return `Team needs at least ${event.minTeamSize} members (you have ${teamSize})`;
      }
      if (event.maxTeamSize && teamSize > event.maxTeamSize) {
        return `Team can have at most ${event.maxTeamSize} members`;
      }
    }
    return null;
  };

  const handleRegister = async ({ paid = paymentDone } = {}) => {
    if (!user) {
      warning('Please login to register');
      navigate('/login');
      return;
    }
    if (user.role !== 'student') {
      showError('Only student accounts can register for events');
      return;
    }
    const formError = validateRegForm();
    if (formError) {
      showError(formError);
      setShowPayment(false);
      return;
    }
    if (event.isPaid && !paid) {
      setShowPayment(true);
      return;
    }
    setRegistering(true);
    try {
      await api.registerForEvent({
        eventId: event.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        department: regForm.department,
        year: regForm.year,
        phone: regForm.phone.trim(),
        teamName: event.teamEvent ? regForm.teamName.trim() : null,
        teamMembers: event.teamEvent ? regForm.teamMembers.filter(m => m.trim()) : [],
        paymentStatus: event.isPaid ? 'paid' : 'free',
      });
      setIsRegistered(true);
      setShowRegForm(false);
      setShowPayment(false);
      success('Registration successful! 🎉');
      loadEvent();
    } catch (err) {
      showError(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handlePayment = () => {
    setRegistering(true);
    setTimeout(() => {
      setRegistering(false);
      setPaymentDone(true);
      success('Payment successful! ₹' + event.price);
      // Pass the flag directly: the state update above isn't visible to this closure yet
      handleRegister({ paid: true });
    }, 1500);
  };

  const handleRetroactiveClaim = async () => {
    if (!user) {
      warning('Please login to claim certificate');
      navigate('/login');
      return;
    }
    if (user.role !== 'student') {
      showError('Only student accounts can claim certificates');
      return;
    }
    setClaiming(true);
    try {
      await api.claimRetroactiveCertificate(user.id, event.id);
      success('Certificate Claimed! Redirecting to Dashboard...');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      showError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const addTeamMember = () => {
    if (regForm.teamMembers.length < (event?.maxTeamSize || 10) - 1) {
      setRegForm(f => ({ ...f, teamMembers: [...f.teamMembers, ''] }));
    }
  };

  const updateTeamMember = (i, val) => {
    const updated = [...regForm.teamMembers];
    updated[i] = val;
    setRegForm(f => ({ ...f, teamMembers: updated }));
  };

  const handleFeedback = async () => {
    if (!rating) { showError('Please select a rating'); return; }
    setSubmittingFeedback(true);
    try {
      await api.submitFeedback(event.id, {
        userId: user.id,
        name: user.name,
        rating,
        comment: feedbackText,
        date: new Date().toISOString(),
      });
      success('Feedback submitted! Thank you.');
      setRating(0);
      setFeedbackText('');
      loadEvent();
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-surface-950 bg-surface-50 pt-20">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) return null;

  const eventDate = new Date(event.date);
  const isDeadlinePassed = new Date(event.registrationDeadline) < new Date();
  
  const hasClash = user ? checkTimetableClash(event.date, event.endDate, user.classes) : false;

  const isFull = event.registrationCount >= event.maxParticipants;
  const spotsLeft = Math.max(0, event.maxParticipants - event.registrationCount);
  const hasTimetable = user?.classes?.length > 0;
  const avgRating = event.ratings.length ? (event.ratings.reduce((a, b) => a + b, 0) / event.ratings.length).toFixed(1) : null;
  const alreadyFeedbacked = event.feedback?.some(f => f.userId === user?.id);

  return (
    <div className="min-h-screen dark:bg-surface-950 bg-surface-50 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <button onClick={() => navigate('/events')}
          className="inline-flex items-center gap-1.5 text-sm dark:text-surface-400 text-surface-500 hover:text-primary-500 transition mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Poster */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl overflow-hidden border dark:border-white/5 border-surface-200">
              <img src={event.poster} alt={event.title} className="w-full h-64 sm:h-80 object-cover" />
            </motion.div>

            {/* Details */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-3 py-1 text-xs font-semibold uppercase rounded-lg ${
                  event.status === 'open' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 hover:bg-emerald-600' :
                  event.status === 'completed' ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/40 hover:bg-blue-600' : 'bg-red-500 text-white shadow-sm shadow-red-500/40 hover:bg-red-600'
                }`}>{event.status}</span>
                
                {hasClash ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-500 text-white flex items-center gap-1">
                    <AlertTriangle size={14} /> Class Timetable Clash
                  </span>
                ) : event.status === 'open' && hasTimetable ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white flex items-center gap-1">
                    <CheckCircle2 size={14} /> Free Time Slot
                  </span>
                ) : null}

                <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-primary-500/10 text-primary-400">{event.category}</span>
                {event.teamEvent && <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-orange-500/10 text-orange-400">Team Event</span>}
                {event.isPaid && (
                  <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-accent-500/10 text-accent-400">
                    <IndianRupee className="w-3 h-3" />{event.price}
                  </span>)}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold dark:text-white text-surface-900 mb-4">{event.title}</h1>
              <p className="dark:text-surface-300 text-surface-600 leading-relaxed mb-6">{event.description}</p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Calendar, label: 'Date', value: eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  { icon: Clock, label: 'Time', value: eventDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) },
                  { icon: MapPin, label: 'Venue', value: event.venue },
                  { icon: Users, label: 'Capacity', value: `${event.registrationCount} / ${event.maxParticipants}` },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl dark:bg-surface-800/30 bg-surface-50">
                    <item.icon className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs dark:text-surface-500 text-surface-400 font-medium">{item.label}</p>
                      <p className="text-sm dark:text-white text-surface-900 font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {avgRating && (
                <div className="mt-6 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-5 h-5 ${s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'dark:text-surface-700 text-surface-300'}`} />
                    ))}
                  </div>
                  <span className="text-sm font-medium dark:text-white text-surface-900">{avgRating}</span>
                  <span className="text-sm dark:text-surface-400 text-surface-500">({event.ratings.length} reviews)</span>
                </div>
              )}
            </motion.div>

            {/* Feedback Section (completed events) */}
            {event.status === 'completed' && user && isRegistered && (
              <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-6">
                <h3 className="text-lg font-bold dark:text-white text-surface-900 mb-4">
                  {alreadyFeedbacked ? 'Your Feedback' : 'Rate this Event'}
                </h3>
                {alreadyFeedbacked ? (
                  <p className="text-sm dark:text-surface-400 text-surface-500">Thanks for your feedback! ✅</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setRating(s)}
                          className="p-1 transition hover:scale-110">
                          <Star className={`w-7 h-7 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'dark:text-surface-700 text-surface-300'}`} />
                        </button>
                      ))}
                    </div>
                    <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                      placeholder="Share your experience..."
                      className="w-full p-3 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                    <button onClick={handleFeedback} disabled={submittingFeedback}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold gradient-bg">
                      <Send className="w-4 h-4" /> Submit Feedback
                    </button>
                  </div>
                )}

                {event.feedback?.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-semibold dark:text-surface-300 text-surface-700">Reviews</h4>
                    {event.feedback.map((fb, i) => (
                      <div key={i} className="p-3 rounded-xl dark:bg-surface-800/30 bg-surface-50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium dark:text-white text-surface-900">{fb.name}</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-3 h-3 ${s <= fb.rating ? 'text-amber-400 fill-amber-400' : 'dark:text-surface-700 text-surface-300'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs dark:text-surface-400 text-surface-500">{fb.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Countdown */}
            {event.status === 'open' && (
              <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Timer className="w-5 h-5 text-primary-500" />
                  <h3 className="font-semibold dark:text-white text-surface-900">Event Starts In</h3>
                </div>
                <CountdownTimer targetDate={event.date} />
              </div>
            )}

            {/* Registration */}
            <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-6">
              <h3 className="font-semibold dark:text-white text-surface-900 mb-4">Registration</h3>

              {isRegistered ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-400">Registered!</p>
                    <p className="text-xs dark:text-surface-400 text-surface-500">You're all set for this event</p>
                  </div>
                </div>
              ) : event.status === 'completed' && !isRegistered ? (
                 <div className="space-y-4">
                   <p className="text-sm font-medium dark:text-surface-400 text-surface-500">
                     This event is already completed.
                   </p>
                   <button onClick={handleRetroactiveClaim} disabled={claiming}
                     className="w-full py-3.5 rounded-xl text-white font-bold bg-primary-600 hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/30 transition-all flex items-center justify-center gap-2">
                     {claiming ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Claim Certificate'}
                   </button>
                   <p className="text-[11px] text-center dark:text-surface-500 text-surface-400 leading-tight">
                     Click here if you attended but did not register through the portal.
                   </p>
                 </div>
              ) : isDeadlinePassed ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">Registration deadline has passed</p>
                </div>
              ) : isFull ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-400">Event is full</p>
                </div>
              ) : event.status !== 'open' ? (
                <p className="text-sm dark:text-surface-400 text-surface-500">Registration is closed</p>
              ) : !showRegForm ? (
                <button onClick={() => setShowRegForm(true)}
                  className="w-full py-3 rounded-xl text-white font-semibold gradient-bg shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all flex items-center justify-center gap-2">
                  <UserPlus className="w-5 h-5" /> Register Now
                </button>
              ) : showPayment ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl dark:bg-surface-800/30 bg-surface-50 text-center">
                    <p className="text-sm dark:text-surface-400 text-surface-500 mb-2">Amount to Pay</p>
                    <p className="text-3xl font-bold dark:text-white text-surface-900 flex items-center justify-center gap-1">
                      <IndianRupee className="w-6 h-6" />{event.price}
                    </p>
                  </div>
                  <button onClick={handlePayment} disabled={registering}
                    className="w-full py-3 rounded-xl text-white font-semibold bg-emerald-500 hover:bg-emerald-600 transition flex items-center justify-center gap-2">
                    {registering ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Pay & Register'}
                  </button>
                  <button onClick={() => setShowPayment(false)}
                    className="w-full py-2 text-sm dark:text-surface-400 text-surface-500 hover:text-primary-500 transition">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Department</label>
                    <select value={regForm.department} onChange={e => setRegForm(f => ({ ...f, department: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm appearance-none" required>
                      <option value="">Select</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Year</label>
                    <select value={regForm.year} onChange={e => setRegForm(f => ({ ...f, year: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm appearance-none" required>
                      <option value="">Select</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Phone</label>
                    <input type="tel" value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm" required />
                  </div>

                  {event.teamEvent && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium dark:text-surface-400 text-surface-500 block">Team Name</label>
                      <input type="text" value={regForm.teamName}
                        onChange={e => setRegForm(f => ({ ...f, teamName: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm"
                        placeholder="Enter team name" />
                      <label className="text-xs font-medium dark:text-surface-400 text-surface-500 block mt-2">
                        Team Members ({event.minTeamSize}-{event.maxTeamSize} members)
                      </label>
                      {regForm.teamMembers.map((member, i) => (
                        <input key={i} type="text" value={member}
                          onChange={e => updateTeamMember(i, e.target.value)}
                          className="w-full px-3 py-2 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm"
                          placeholder={`Member ${i + 2} name`} />
                      ))}
                      <button type="button" onClick={addTeamMember}
                        className="text-xs text-primary-500 font-medium hover:text-primary-400">
                        + Add Member
                      </button>
                    </div>
                  )}

                  <button onClick={() => handleRegister()} disabled={registering}
                    className="w-full py-3 rounded-xl text-white font-semibold gradient-bg shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all flex items-center justify-center gap-2 mt-2">
                    {registering ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                      <><UserPlus className="w-5 h-5" /> {event.isPaid ? 'Proceed to Pay' : 'Confirm Registration'}</>
                    )}
                  </button>
                  <button onClick={() => setShowRegForm(false)}
                    className="w-full py-2 text-sm dark:text-surface-400 text-surface-500 hover:text-primary-500">Cancel</button>
                </div>
              )}

              {/* Deadline info */}
              {event.status === 'open' && !isDeadlinePassed && (
                <p className="mt-4 text-xs dark:text-surface-500 text-surface-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Deadline: {new Date(event.registrationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Capacity */}
            <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium dark:text-surface-300 text-surface-700">Capacity</span>
                <span className="text-sm font-bold dark:text-white text-surface-900">{event.registrationCount}/{event.maxParticipants}</span>
              </div>
              <div className="h-3 rounded-full dark:bg-surface-800 bg-surface-100 overflow-hidden">
                <div className="h-full rounded-full gradient-bg transition-all duration-700"
                  style={{ width: `${Math.min((event.registrationCount / event.maxParticipants) * 100, 100)}%` }} />
              </div>
              <p className="mt-2 text-xs dark:text-surface-500 text-surface-400">
                {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
