import { useState, useEffect, useRef, useMemo } from 'react';
import { Info, Plus, Trash2, CalendarDays, UploadCloud, ScanLine, CheckCircle2, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import * as api from '../services/api';
import { useNotification } from '../context/useNotification';
import { DAY_NAMES as DAYS, formatMinutes, parseSlotText } from '../utils/ffcsSlots';
import { classStartMin, classEndMin } from '../utils/checkClash';
import { scanTimetableImage } from '../utils/scanTimetable';

// 8 AM to 7 PM
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

function formatHour(hour) {
  return formatMinutes(hour * 60);
}

export default function TimetableGrid({ setDirty }) {
  const { user, updateUser } = useAuth();
  const { success, error: showError, warning } = useNotification();

  const [classes, setClasses] = useState(user?.classes || []);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [day, setDay] = useState('Monday');
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(9);
  const [title, setTitle] = useState('');

  // Import State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedImage, setScannedImage] = useState(null);
  const [slotText, setSlotText] = useState('');

  const initialClassesRef = useRef(JSON.stringify(user?.classes || []));

  useEffect(() => {
    if (setDirty) {
      setDirty(JSON.stringify(classes) !== initialClassesRef.current);
    }
  }, [classes, setDirty]);

  // Revoke the preview image URL when it's replaced or the component unmounts
  useEffect(() => () => { if (scannedImage) URL.revokeObjectURL(scannedImage); }, [scannedImage]);

  // Which classes fall in each hour cell of the visual map
  const localComputedTimetable = useMemo(() => {
    const computed = {};
    DAYS.forEach(d => { computed[d] = {}; });
    classes.forEach(c => {
      const start = classStartMin(c);
      const end = classEndMin(c);
      HOURS.forEach(h => {
        if (start < (h + 1) * 60 && end > h * 60) (computed[c.day][h] ??= []).push(c);
      });
    });
    return computed;
  }, [classes]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    // Let the same file be picked again later
    e.target.value = '';
    if (!file) return;

    setScannedImage(URL.createObjectURL(file));
    setIsScanning(true);
    setScanProgress(0);
    try {
      const { classes: found } = await scanTimetableImage(file, p => setScanProgress(Math.round(p)));
      if (found.length === 0) {
        showError('No registered (highlighted) slots were found in that image.');
        setScannedImage(null);
        return;
      }
      setClasses(found);
      success(`Imported ${found.length} class${found.length !== 1 ? 'es' : ''} from your timetable. Check them, then save.`);
    } catch (err) {
      console.error(err);
      showError(err.message || 'Could not read that image.');
      setScannedImage(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSlotImport = (e) => {
    e.preventDefault();
    const { classes: found, unknown } = parseSlotText(slotText);
    if (found.length === 0) {
      showError('No valid FFCS slots found. Use slot names like A2+TA2 or L21+L22.');
      return;
    }
    if (unknown.length) warning(`Ignored unknown slot${unknown.length !== 1 ? 's' : ''}: ${unknown.join(', ')}`);
    setClasses(found);
    setScannedImage(null);
    success(`Imported ${found.length} class${found.length !== 1 ? 'es' : ''} from your slots. Check them, then save.`);
  };

  const handleAddClass = (e) => {
    e.preventDefault();

    const start = parseInt(startHour);
    const end = parseInt(endHour);
    if (start >= end) {
      showError('End time must be after start time.');
      return;
    }

    const overlap = classes.find(c => c.day === day && start * 60 < classEndMin(c) && end * 60 > classStartMin(c));

    if (overlap) {
      showError(`Overlaps with your existing class: ${overlap.title || 'Busy Slot'}`);
      return;
    }

    const newClass = {
      id: Math.random().toString(36).slice(2, 11),
      day,
      startHour: start,
      endHour: end,
      startMin: start * 60,
      endMin: end * 60,
      title: title.trim() || 'Class Slot'
    };

    setClasses([...classes, newClass]);
    setTitle('');
  };

  const removeClass = (id) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  const clearAll = () => {
    setClasses([]);
    setScannedImage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Busy hours per day, kept alongside the exact classes for simple lookups
      const flatTimetable = {};
      DAYS.forEach(d => { flatTimetable[d] = []; });
      classes.forEach(c => {
        for (let h = Math.floor(classStartMin(c) / 60); h * 60 < classEndMin(c); h++) {
          if (!flatTimetable[c.day].includes(h)) flatTimetable[c.day].push(h);
        }
      });

      const updatedUser = await api.updateUserProfile(user.id, {
        classes,
        timetable: flatTimetable
      });

      updateUser(updatedUser);

      initialClassesRef.current = JSON.stringify(classes);
      if (setDirty) setDirty(false);

      success('Your smart timetable has been updated!');
    } catch {
      showError('Failed to save timetable.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold dark:text-white text-surface-900">Manage Timetable</h2>
          <p className="dark:text-surface-400 text-surface-500 text-sm mt-1">
            Build your schedule to accurately detect event clashes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {classes.length > 0 && (
            <button onClick={clearAll} className="px-4 py-2 dark:bg-surface-800 bg-surface-100 hover:bg-red-500/10 dark:text-surface-400 text-surface-500 hover:text-red-400 rounded-xl font-semibold transition text-sm">
              Clear All
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-500/25 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : '💾 Save Timetable'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Smart Importer & Manual Form */}
        <div className="lg:col-span-1 space-y-6">

          {/* Smart Importer Zone */}
          <div className="bg-gradient-to-br from-primary-500/10 to-accent-500/10 backdrop-blur-md rounded-2xl border border-primary-500/20 p-5 overflow-hidden relative">
            <div className="flex items-center gap-2 mb-4">
              <ScanLine className="w-5 h-5 text-primary-400" />
              <h3 className="font-bold dark:text-white text-surface-900 text-sm">Import VTOP Screenshot</h3>
            </div>
            <p className="text-xs dark:text-surface-400 text-surface-500 mb-4">
              Upload a screenshot of your VTOP/FFCS timetable grid. Highlighted slots are read as your classes.
            </p>

            {scannedImage && !isScanning ? (
              <div className="text-center space-y-3">
                <div className="relative h-24 w-full rounded-xl overflow-hidden border dark:border-white/10 border-surface-200">
                  <img src={scannedImage} alt="Scanned" className="w-full h-full object-cover opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-[2px]">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Timetable Imported</p>
                <label className="inline-block text-xs font-semibold text-primary-500 hover:text-primary-400 cursor-pointer">
                  Upload a different image
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            ) : isScanning ? (
              <div className="text-center space-y-4 py-3">
                <div className="relative h-24 w-full justify-center flex items-center">
                  {scannedImage && <img src={scannedImage} alt="Scanning..." className="absolute inset-0 w-full h-full object-cover opacity-20 rounded-xl blur-sm" />}
                  <ScanLine className="w-10 h-10 text-primary-400 animate-pulse relative z-10" />
                </div>
                <div>
                  <div className="font-medium text-xs text-primary-400 mb-2 uppercase tracking-widest flex items-center justify-between">
                    <span>{scanProgress < 30 ? 'Loading reader...' : 'Reading timetable...'}</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full dark:bg-surface-900 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-primary-500/30 border-dashed rounded-xl cursor-pointer dark:bg-surface-900/40 bg-white/60 hover:bg-primary-500/10 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-2 text-primary-400" />
                  <p className="mb-1 text-sm font-semibold dark:text-white text-surface-900">Upload Timetable</p>
                  <p className="text-xs dark:text-surface-400 text-surface-500">PNG or JPG screenshot</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          {/* Slot list import */}
          <form onSubmit={handleSlotImport} className="dark:bg-surface-800/50 bg-white backdrop-blur-md rounded-2xl border dark:border-surface-700/50 border-surface-200 p-5 space-y-3">
            <h3 className="font-bold dark:text-white text-surface-900 flex items-center gap-2 text-sm">
              <ClipboardList size={16} className="text-primary-400" />
              Enter FFCS Slots
            </h3>
            <textarea
              value={slotText}
              onChange={(e) => setSlotText(e.target.value)}
              rows={3}
              placeholder={'A2+TA2 BCSE355L\nL21+L22 BCSE302P'}
              className="w-full px-3 py-2 rounded-xl dark:bg-surface-900/50 bg-surface-50 border dark:border-surface-600/50 border-surface-200 dark:text-white text-surface-900 focus:outline-none focus:border-primary-500/50 text-sm font-mono resize-none"
            />
            <p className="text-[11px] dark:text-surface-500 text-surface-400">One course per line or comma; the course code is optional.</p>
            <button type="submit" disabled={!slotText.trim()} className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition font-medium text-sm disabled:opacity-50">
              Import Slots
            </button>
          </form>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px dark:bg-surface-700/50 bg-surface-200"></div>
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px dark:bg-surface-700/50 bg-surface-200"></div>
          </div>

          {/* Manual Entry Form */}
          <div className="dark:bg-surface-800/50 bg-white backdrop-blur-md rounded-2xl border dark:border-surface-700/50 border-surface-200 p-5">
            <h3 className="font-bold dark:text-white text-surface-900 mb-4 flex items-center gap-2 text-sm">
              <Plus size={16} className="text-accent-400" />
              Manual Entry
            </h3>

            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-xs font-medium dark:text-surface-400 text-surface-500 mb-1">Class Title</label>
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Physics Lab"
                  className="w-full px-3 py-2 rounded-xl dark:bg-surface-900/50 bg-surface-50 border dark:border-surface-600/50 border-surface-200 dark:text-white text-surface-900 focus:outline-none focus:border-accent-500/50 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium dark:text-surface-400 text-surface-500 mb-1">Day</label>
                <select
                  value={day} onChange={(e) => setDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl dark:bg-surface-900/50 bg-surface-50 border dark:border-surface-600/50 border-surface-200 dark:text-white text-surface-900 focus:outline-none focus:border-accent-500/50 text-sm appearance-none"
                >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium dark:text-surface-400 text-surface-500 mb-1">Start</label>
                  <select
                    value={startHour} onChange={(e) => setStartHour(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl dark:bg-surface-900/50 bg-surface-50 border dark:border-surface-600/50 border-surface-200 dark:text-white text-surface-900 focus:outline-none focus:border-accent-500/50 text-sm appearance-none"
                  >
                    {HOURS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium dark:text-surface-400 text-surface-500 mb-1">End</label>
                  <select
                    value={endHour} onChange={(e) => setEndHour(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl dark:bg-surface-900/50 bg-surface-50 border dark:border-surface-600/50 border-surface-200 dark:text-white text-surface-900 focus:outline-none focus:border-accent-500/50 text-sm appearance-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 9).map(h => (
                      <option key={h} value={h}>{formatHour(h)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl dark:bg-surface-700/50 bg-surface-200 dark:text-white text-surface-900 hover:bg-accent-500 hover:text-white transition font-medium text-sm border dark:border-surface-600 border-surface-300">
                Add Slot
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Active Classes & Visual Grid */}
        <div className="lg:col-span-3 space-y-6">

          {/* Visual Grid Map */}
          <div className="dark:bg-surface-800/30 bg-white backdrop-blur-md rounded-2xl border dark:border-surface-700/50 border-surface-200 overflow-hidden shadow-inner flex flex-col">
            <div className="p-3 border-b dark:border-surface-700/50 border-surface-200 dark:bg-surface-800/50 bg-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold dark:text-white text-surface-900 text-sm">Visual Map</h3>
            </div>

            <div className="overflow-x-auto p-2 flex-1 relative">
              <table className="w-full text-xs text-left h-full">
                <thead>
                  <tr>
                    <th className="px-3 py-2 dark:text-surface-400 text-surface-500 font-medium whitespace-nowrap min-w-[70px]">Day</th>
                    {HOURS.map(hour => (
                      <th key={hour} className="px-1 py-2 text-surface-500 font-medium text-center min-w-[50px]">
                        {formatHour(hour).replace(':00', '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-surface-700/30 divide-surface-200">
                  {DAYS.map(day => (
                    <tr key={day} className="dark:hover:bg-surface-800/20 hover:bg-surface-50 transition-colors h-10">
                      <td className="px-3 text-[11px] font-bold dark:text-surface-300 text-surface-600 uppercase tracking-wider">
                        {day.substring(0, 3)}
                      </td>
                      {HOURS.map(hour => {
                        const cellClasses = localComputedTimetable[day]?.[hour];
                        // Imported classes show their slot (A2, L21+L22); manual ones their title
                        const firstTitle = cellClasses?.[0]?.title || '';
                        const label = firstTitle.match(/\(([^)]+)\)$/)?.[1] || firstTitle;
                        return (
                          <td key={`${day}-${hour}`} className="p-0.5">
                            <div className="w-full h-10 relative">
                              {cellClasses && (
                                <div
                                  className="absolute inset-0 rounded pl-1.5 flex items-center bg-emerald-500/20 border-l-[3px] border-emerald-500 cursor-default"
                                  title={cellClasses.map(c => `${c.title}: ${formatMinutes(classStartMin(c))} - ${formatMinutes(classEndMin(c))}`).join('\n')}
                                >
                                  <div className="text-[9px] font-bold dark:text-emerald-300 text-emerald-700 uppercase tracking-wide truncate flex-1 leading-tight">
                                    {label}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active List */}
          <div className="dark:bg-surface-800/50 bg-white backdrop-blur-md rounded-2xl border dark:border-surface-700/50 border-surface-200 p-5">
            <h3 className="font-bold dark:text-white text-surface-900 mb-4 flex items-center gap-2 text-sm">
              Active Classes Roster ({classes.length})
            </h3>
            {classes.length === 0 ? (
              <div className="text-center py-6 text-surface-500">
                <Info className="w-8 h-8 opacity-50 mx-auto mb-2" />
                <p className="text-sm">No classes added yet. Use the importer or manual entry.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                {[...classes]
                  .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || classStartMin(a) - classStartMin(b))
                  .map(c => (
                  <div key={c.id} className="flex flex-col gap-1 p-3 rounded-xl dark:bg-surface-900/60 bg-surface-50 border dark:border-surface-700/50 border-surface-200 group relative">
                    <span className="font-bold dark:text-white text-surface-900 text-sm truncate pr-6" title={c.title}>{c.title}</span>
                    <span className="text-[11px] dark:text-surface-400 text-surface-500 font-medium">
                      {c.day.substring(0, 3)} • {formatMinutes(classStartMin(c))} - {formatMinutes(classEndMin(c))}
                    </span>
                    <button
                      onClick={() => removeClass(c.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-surface-500 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition"
                      title="Remove class"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}