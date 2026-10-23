import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/useAuth';
import { useNotification } from '../context/useNotification';
import * as api from '../services/api';
import { exportToCSV } from '../utils/exportCSV';
import { CATEGORIES } from '../utils/seedData';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Plus, Edit, Trash2, Users, Calendar, Award, TrendingUp,
  Download, Check, X, Eye, ChevronDown, FileText, BarChart3,
  MapPin, Clock, IndianRupee, Save, AlertTriangle
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// <input type="datetime-local"> works in local time without a zone, while events
// store UTC ISO strings, so convert both ways
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value) {
  return value ? new Date(value).toISOString() : '';
}

async function fetchAdminData() {
  const [evts, ana, allRegs] = await Promise.all([api.fetchEvents(), api.fetchAnalytics(), api.fetchAllRegistrations()]);
  return { evts, ana, allRegs };
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { success, error: showError } = useNotification();

  const [activeView, setActiveView] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [globalRegistrations, setGlobalRegistrations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Event form
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Tech', date: '', endDate: '',
    venue: '', maxParticipants: 100, registrationDeadline: '', isPaid: false,
    price: 0, teamEvent: false, maxTeamSize: 4, minTeamSize: 2,
    poster: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop',
    status: 'open',
  });

  // Participant view
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const applyData = useCallback(({ evts, ana, allRegs }) => {
    const counts = {};
    allRegs.forEach(r => { counts[r.eventId] = (counts[r.eventId] || 0) + 1; });
    setEvents(evts.map(e => ({ ...e, registrationCount: counts[e.id] || 0 })));
    setGlobalRegistrations(allRegs);
    setAnalytics(ana);
    setLoading(false);
  }, []);

  const loadData = useCallback(() => fetchAdminData().then(applyData), [applyData]);

  useEffect(() => {
    fetchAdminData().then(applyData);
  }, [applyData]);

  const pendingODs = globalRegistrations.filter(r => r.odStatus === 'pending');

  const handleHandleOD = async (regId, status) => {
    try {
      await api.updateODStatus(regId, status);
      success(`OD Request ${status}!`);
      loadData();
    } catch {
      showError('Failed to process OD Request');
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.venue.trim()) return 'Venue is required';
    if (!form.date) return 'Start date is required';
    if (!form.registrationDeadline) return 'Registration deadline is required';
    if (form.endDate && new Date(form.endDate) <= new Date(form.date)) return 'End date must be after the start date';
    if (new Date(form.registrationDeadline) > new Date(form.date)) return 'Registration deadline must be before the event starts';
    if (!(form.maxParticipants > 0)) return 'Max participants must be at least 1';
    if (form.isPaid && !(form.price > 0)) return 'Paid events need a price above 0';
    if (form.teamEvent && (form.minTeamSize < 1 || form.minTeamSize > form.maxTeamSize)) return 'Team size range is invalid';
    return null;
  };

  const handleSaveEvent = async () => {
    const formError = validateForm();
    if (formError) {
      showError(formError);
      return;
    }
    const data = {
      ...form,
      title: form.title.trim(),
      venue: form.venue.trim(),
      date: localInputToIso(form.date),
      // Default to a two-hour event when no end time is given
      endDate: form.endDate
        ? localInputToIso(form.endDate)
        : new Date(new Date(form.date).getTime() + 2 * 60 * 60 * 1000).toISOString(),
      registrationDeadline: localInputToIso(form.registrationDeadline),
      price: form.isPaid ? form.price : 0,
    };
    try {
      if (editingEvent) {
        await api.updateEvent(editingEvent.id, data);
        success('Event updated!');
      } else {
        await api.createEvent({ ...data, createdBy: user.id });
        success('Event created!');
      }
      setShowForm(false);
      setEditingEvent(null);
      resetForm();
      loadData();
    } catch (err) {
      showError(err.message);
    }
  };

  const handleEditEvent = (evt) => {
    setEditingEvent(evt);
    setForm({
      title: evt.title, description: evt.description, category: evt.category,
      date: isoToLocalInput(evt.date), endDate: isoToLocalInput(evt.endDate),
      venue: evt.venue, maxParticipants: evt.maxParticipants,
      registrationDeadline: isoToLocalInput(evt.registrationDeadline),
      isPaid: evt.isPaid, price: evt.price, teamEvent: evt.teamEvent,
      maxTeamSize: evt.maxTeamSize || 4, minTeamSize: evt.minTeamSize || 2,
      poster: evt.poster, status: evt.status,
    });
    setShowForm(true);
    setActiveView('events');
  };

  const handleDeleteEvent = async (id) => {
    try {
      await api.deleteEvent(id);
      success('Event deleted');
      setConfirmDelete(null);
      if (selectedEvent?.id === id) {
        setSelectedEvent(null);
        setParticipants([]);
      }
      loadData();
    } catch (err) {
      showError(err.message);
    }
  };

  const handleViewParticipants = async (evt) => {
    const regs = await api.fetchEventRegistrations(evt.id);
    setParticipants(regs);
    setSelectedEvent(evt);
    setActiveView('participants');
  };

  const handleMarkAttendance = async (regId, attended) => {
    await api.markAttendance(regId, attended);
    const regs = await api.fetchEventRegistrations(selectedEvent.id);
    setParticipants(regs);
    success(attended ? 'Marked as attended' : 'Attendance removed');
  };

  // Marks the event completed (if it isn't already) and issues certificates to
  // every attendee who doesn't have one yet; safe to run again after more
  // attendance is marked
  const handleMarkComplete = async (evt) => {
    try {
      if (evt.status !== 'completed') {
        await api.updateEvent(evt.id, { status: 'completed' });
      }
      const regs = await api.fetchEventRegistrations(evt.id);
      const owned = new Set((await api.fetchAllCertificates()).filter(c => c.eventId === evt.id).map(c => c.userId));
      const toIssue = regs.filter(r => r.attended && !owned.has(r.userId));
      for (const reg of toIssue) {
        await api.generateCertificate({
          eventId: evt.id,
          userId: reg.userId,
          name: reg.name,
          eventName: evt.title,
          eventDate: evt.date,
        });
      }
      success(evt.status === 'completed'
        ? `${toIssue.length} new certificate${toIssue.length !== 1 ? 's' : ''} issued.`
        : `Event completed! ${toIssue.length} certificate${toIssue.length !== 1 ? 's' : ''} generated.`);
      loadData();
    } catch (err) {
      showError(err.message);
    }
  };

  const handleExportCSV = () => {
    if (participants.length === 0) return;
    const data = participants.map(p => ({
      Name: p.name,
      Email: p.email,
      Department: p.department,
      Year: p.year,
      Phone: p.phone,
      'Team Name': p.teamName || '-',
      'Registered At': new Date(p.registeredAt).toLocaleDateString(),
      Attended: p.attended ? 'Yes' : 'No',
      'Payment Status': p.paymentStatus,
    }));
    exportToCSV(data, `${selectedEvent.title}_Participants`);
    success('CSV exported!');
  };

  const resetForm = () => {
    setForm({
      title: '', description: '', category: 'Tech', date: '', endDate: '',
      venue: '', maxParticipants: 100, registrationDeadline: '', isPaid: false,
      price: 0, teamEvent: false, maxTeamSize: 4, minTeamSize: 2,
      poster: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop',
      status: 'open',
    });
  };

  const update = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm(f => ({ ...f, [field]: val }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-surface-950 bg-surface-50 pt-20">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Chart data
  const categoryChartData = analytics ? {
    labels: Object.keys(analytics.categoryStats),
    datasets: [{
      data: Object.values(analytics.categoryStats),
      backgroundColor: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'],
      borderWidth: 0,
    }],
  } : null;

  const regChartData = analytics ? {
    labels: Object.keys(analytics.monthlyRegs),
    datasets: [{
      label: 'Registrations',
      data: Object.values(analytics.monthlyRegs),
      backgroundColor: '#6366f180',
      borderColor: '#6366f1',
      borderWidth: 2,
      borderRadius: 8,
    }],
  } : null;

  return (
    <div className="min-h-screen dark:bg-surface-950 bg-surface-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold dark:text-white text-surface-900 mb-2">Admin Panel 🛡️</h1>
            <p className="dark:text-surface-400 text-surface-500">Manage events, participants, and certificates</p>
          </div>
          <button
            onClick={() => { resetForm(); setEditingEvent(null); setShowForm(true); setActiveView('events'); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold gradient-bg shadow-lg shadow-primary-500/25"
          >
            <Plus className="w-4 h-4" /> New Event
          </button>
        </motion.div>

        {/* Nav */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { key: 'events', label: 'Events', icon: Calendar },
            { key: 'participants', label: 'Participants', icon: Users },
            { key: 'od_requests', label: `OD Requests (${pendingODs.length})`, icon: AlertTriangle },
          ].map(v => (
            <button key={v.key} onClick={() => setActiveView(v.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                activeView === v.key
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                  : 'dark:bg-surface-900/50 bg-white dark:text-surface-300 text-surface-600 border dark:border-white/5 border-surface-200'
              }`}
            >
              <v.icon className="w-4 h-4" /> {v.label}
            </button>
          ))}
        </div>

        {/* Dashboard View */}
        {activeView === 'dashboard' && analytics && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Events', value: analytics.totalEvents, icon: Calendar, color: 'text-primary-500 bg-primary-500/10' },
                { label: 'Registrations', value: analytics.totalRegistrations, icon: Users, color: 'text-accent-500 bg-accent-500/10' },
                { label: 'Certificates', value: analytics.totalCertificates, icon: Award, color: 'text-success-500 bg-success-500/10' },
                { label: 'Open Events', value: analytics.openEvents, icon: TrendingUp, color: 'text-amber-500 bg-amber-500/10' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="p-5 rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${s.color} mb-3`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold dark:text-white text-surface-900">{s.value}</p>
                  <p className="text-xs dark:text-surface-400 text-surface-500 mt-0.5">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-6">
                <h3 className="font-semibold dark:text-white text-surface-900 mb-4">Events by Category</h3>
                <div className="max-w-[250px] mx-auto">
                  {categoryChartData && <Doughnut data={categoryChartData} options={{ plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 15 } } } }} />}
                </div>
              </div>
              <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-6">
                <h3 className="font-semibold dark:text-white text-surface-900 mb-4">Registrations Over Time</h3>
                {regChartData && <Bar data={regChartData} options={{
                  plugins: { legend: { display: false } },
                  scales: { x: { ticks: { color: '#94a3b8' }, grid: { display: false } }, y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b33' } } }
                }} />}
              </div>
            </div>
          </div>
        )}

        {/* Events View */}
        {activeView === 'events' && (
          <div className="space-y-6">
            {/* Event Form */}
            {showForm && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold dark:text-white text-surface-900">
                    {editingEvent ? 'Edit Event' : 'Create New Event'}
                  </h3>
                  <button onClick={() => { setShowForm(false); setEditingEvent(null); }}
                    className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-white/5 transition">
                    <X className="w-5 h-5 dark:text-surface-400 text-surface-500" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Title</label>
                    <input type="text" value={form.title} onChange={update('title')}
                      className="w-full px-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Description</label>
                    <textarea value={form.description} onChange={update('description')} rows={3}
                      className="w-full px-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Category</label>
                    <select value={form.category} onChange={update('category')}
                      className="w-full px-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm appearance-none">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Venue</label>
                    <input type="text" value={form.venue} onChange={update('venue')}
                      className="w-full px-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Start Date & Time</label>
                    <input type="datetime-local" value={form.date} onChange={update('date')}
                      className="w-full px-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">End Date & Time</label>
                    <input type="datetime-local" value={form.endDate} onChange={update('endDate')}
                      className="w-full px-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Registration Deadline</label>
                    <input type="datetime-local" value={form.registrationDeadline} onChange={update('registrationDeadline')}
                      className="w-full px-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Max Participants</label>
                    <input type="number" value={form.maxParticipants} onChange={update('maxParticipants')}
                      className="w-full px-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Poster URL</label>
                    <input type="url" value={form.poster} onChange={update('poster')}
                      className="w-full px-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm" />
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isPaid} onChange={update('isPaid')}
                        className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-500" />
                      <span className="text-sm dark:text-surface-300 text-surface-700">Paid Event</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.teamEvent} onChange={update('teamEvent')}
                        className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-500" />
                      <span className="text-sm dark:text-surface-300 text-surface-700">Team Event</span>
                    </label>
                  </div>
                  {form.isPaid && (
                    <div>
                      <label className="text-xs font-medium dark:text-surface-400 text-surface-500 mb-1 block">Price (₹)</label>
                      <input type="number" value={form.price} onChange={update('price')}
                        className="w-full px-4 py-2.5 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm" />
                    </div>
                  )}
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={handleSaveEvent}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold gradient-bg">
                    <Save className="w-4 h-4" /> {editingEvent ? 'Update' : 'Create'} Event
                  </button>
                  <button onClick={() => { setShowForm(false); setEditingEvent(null); }}
                    className="px-6 py-2.5 rounded-xl text-sm font-medium dark:text-surface-300 text-surface-600 border dark:border-white/10 border-surface-200">
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* Events Table */}
            <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-white/10 border-surface-200">
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Event</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Category</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Date</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Status</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Regs</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(evt => (
                      <tr key={evt.id} className="border-b dark:border-white/5 border-surface-100 last:border-0 hover:dark:bg-white/[0.02] hover:bg-surface-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={evt.poster} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            <span className="text-sm font-medium dark:text-white text-surface-900 truncate max-w-[200px]">{evt.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-medium px-2 py-1 rounded-md bg-primary-500/10 text-primary-400">{evt.category}</span>
                        </td>
                        <td className="px-4 py-4 text-sm dark:text-surface-300 text-surface-600">
                          {new Date(evt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-md uppercase ${
                            evt.status === 'open' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 hover:bg-emerald-600' :
                            evt.status === 'completed' ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/40 hover:bg-blue-600' : 'bg-red-500 text-white shadow-sm shadow-red-500/40 hover:bg-red-600'
                          }`}>{evt.status}</span>
                        </td>
                        <td className="px-4 py-4 text-sm dark:text-surface-300 text-surface-600">
                          {evt.registrationCount}/{evt.maxParticipants}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleViewParticipants(evt)} title="View Participants"
                              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-white/5 transition dark:text-surface-400 text-surface-500">
                              <Users className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEditEvent(evt)} title="Edit"
                              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-white/5 transition dark:text-surface-400 text-surface-500">
                              <Edit className="w-4 h-4" />
                            </button>
                            {evt.status === 'completed' ? (
                              <button onClick={() => handleMarkComplete(evt)} title="Issue certificates to attendees"
                                className="p-2 rounded-lg hover:bg-amber-500/10 transition text-amber-400">
                                <Award className="w-4 h-4" />
                              </button>
                            ) : (
                              <button onClick={() => handleMarkComplete(evt)} title="Mark Complete"
                                className="p-2 rounded-lg hover:bg-emerald-500/10 transition text-emerald-400">
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {confirmDelete === evt.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleDeleteEvent(evt.id)}
                                  className="p-2 rounded-lg bg-red-500 text-white shadow-sm shadow-red-500/40 hover:bg-red-600"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setConfirmDelete(null)}
                                  className="p-2 rounded-lg dark:bg-surface-800 bg-surface-100"><X className="w-4 h-4 dark:text-surface-400 text-surface-500" /></button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(evt.id)} title="Delete"
                                className="p-2 rounded-lg hover:bg-red-500/10 transition text-red-400">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Participants View */}
        {activeView === 'participants' && (
          <div className="space-y-6">
            {selectedEvent ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold dark:text-white text-surface-900">{selectedEvent.title}</h3>
                    <p className="text-sm dark:text-surface-400 text-surface-500">{participants.length} participants</p>
                  </div>
                  <button onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium dark:text-surface-300 text-surface-600 border dark:border-white/10 border-surface-200 hover:border-primary-500/30 transition">
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>

                <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b dark:border-white/10 border-surface-200">
                          <th className="text-left px-6 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Name</th>
                          <th className="text-left px-4 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Department</th>
                          <th className="text-left px-4 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Year</th>
                          <th className="text-left px-4 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Phone</th>
                          <th className="text-left px-4 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Registered</th>
                          <th className="text-center px-4 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map(p => (
                          <tr key={p.id} className="border-b dark:border-white/5 border-surface-100 last:border-0">
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium dark:text-white text-surface-900">{p.name}</p>
                              <p className="text-xs dark:text-surface-400 text-surface-500">{p.email}</p>
                            </td>
                            <td className="px-4 py-4 text-sm dark:text-surface-300 text-surface-600">{p.department}</td>
                            <td className="px-4 py-4 text-sm dark:text-surface-300 text-surface-600">{p.year}</td>
                            <td className="px-4 py-4 text-sm dark:text-surface-300 text-surface-600">{p.phone}</td>
                            <td className="px-4 py-4 text-sm dark:text-surface-300 text-surface-600">
                              {new Date(p.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => handleMarkAttendance(p.id, !p.attended)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                  p.attended
                                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 hover:bg-emerald-600'
                                    : 'bg-surface-500/10 dark:text-surface-400 text-surface-500 hover:bg-primary-500/10 hover:text-primary-500'
                                }`}
                              >
                                {p.attended ? '✓ Present' : 'Mark Present'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto dark:text-surface-700 text-surface-300 mb-4" />
                <h3 className="text-lg font-bold dark:text-white text-surface-900 mb-2">Select an Event</h3>
                <p className="dark:text-surface-400 text-surface-500 text-sm mb-4">Go to Events tab and click the participants icon</p>
                <button onClick={() => setActiveView('events')} className="text-primary-500 font-medium">
                  View Events →
                </button>
              </div>
            )}
          </div>
        )}

        {/* OD Requests View */}
        {activeView === 'od_requests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold dark:text-white text-surface-900">Pending OD Requests</h3>
                <p className="text-sm dark:text-surface-400 text-surface-500">{pendingODs.length} students waiting for Organizer approval</p>
              </div>
            </div>

            {pendingODs.length === 0 ? (
              <div className="text-center py-16 rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200">
                <Check className="w-16 h-16 mx-auto text-success-500 mb-4" />
                <h3 className="text-lg font-bold dark:text-white text-surface-900 mb-2">Inbox Zero</h3>
                <p className="dark:text-surface-400 text-surface-500 text-sm">All OD requests have been processed!</p>
              </div>
            ) : (
              <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-white/10 border-surface-200">
                        <th className="text-left px-6 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Student Name</th>
                        <th className="text-left px-4 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Event Details</th>
                        <th className="text-left px-4 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Clash Date</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold uppercase dark:text-surface-400 text-surface-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingODs.map(req => (
                        <tr key={req.id} className="border-b dark:border-white/5 border-surface-100 last:border-0 hover:dark:bg-white/[0.02] hover:bg-surface-50 transition">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold dark:text-white text-surface-900">{req.name}</p>
                            <p className="text-xs dark:text-surface-400 text-surface-500">{req.department} • {req.year}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {req.event?.poster && <img src={req.event.poster} alt="" className="w-8 h-8 rounded-md object-cover" />}
                              <div>
                                <p className="text-sm font-semibold dark:text-surface-300 text-surface-700">{req.event?.title || 'Unknown Event'}</p>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-500">{req.event?.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm dark:text-surface-300 text-surface-600">
                            {req.event ? new Date(req.event.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Unknown'}
                            <br/>
                            <span className="text-xs text-amber-500 font-medium">Class Clash Reported</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleHandleOD(req.id, 'rejected')} 
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition">
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                              <button onClick={() => handleHandleOD(req.id, 'approved')} 
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-success-500 bg-success-500/10 hover:bg-success-500/20 transition shadow-sm">
                                <Check className="w-3.5 h-3.5" /> Approve OD
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
