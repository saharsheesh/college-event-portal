const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Class times in minutes from midnight. Older saved classes only have whole
// hours, so fall back to those.
export function classStartMin(c) {
  return c.startMin ?? c.startHour * 60;
}

export function classEndMin(c) {
  return c.endMin ?? c.endHour * 60;
}

// True when the event overlaps any weekly class, checked to the minute in
// local time. Events without a real duration are treated as one hour long.
export function checkTimetableClash(eventDate, eventEndDate, userClasses) {
  if (!userClasses || !Array.isArray(userClasses) || userClasses.length === 0) return false;

  const start = new Date(eventDate);
  let end = new Date(eventEndDate || eventDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);

  // Walk each calendar day the event touches and compare that day's classes
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  while (day < end) {
    const dayName = DAY_NAMES[day.getDay()];
    for (const c of userClasses) {
      if (c.day !== dayName) continue;
      const classStart = new Date(day);
      classStart.setMinutes(classStartMin(c));
      const classEnd = new Date(day);
      classEnd.setMinutes(classEndMin(c));
      if (classStart < end && classEnd > start) return true;
    }
    day.setDate(day.getDate() + 1);
  }
  return false;
}
