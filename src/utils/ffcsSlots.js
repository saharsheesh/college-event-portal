// VIT FFCS slot grid (the same layout VTOP shows on the timetable page).
// Columns 0-13 match the timetable image left to right: five morning columns,
// one extra lab column (12:31-13:20), lunch, then the afternoon columns.

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const COLUMN_COUNT = 14;
export const LUNCH_COLUMN = 6;

const THEORY_TIMES = [
  ['08:00', '08:50'], ['09:00', '09:50'], ['10:00', '10:50'], ['11:00', '11:50'], ['12:00', '12:50'],
  null, null,
  ['14:00', '14:50'], ['15:00', '15:50'], ['16:00', '16:50'], ['17:00', '17:50'], ['18:00', '18:50'],
  ['18:51', '19:00'], ['19:01', '19:50'],
];

const LAB_TIMES = [
  ['08:00', '08:50'], ['08:51', '09:40'], ['09:51', '10:40'], ['10:41', '11:30'], ['11:40', '12:30'], ['12:31', '13:20'],
  null,
  ['14:00', '14:50'], ['14:51', '15:40'], ['15:51', '16:40'], ['16:41', '17:30'], ['17:40', '18:30'], ['18:31', '19:20'],
  null,
];

// Theory slot names per day (Monday first), by column
const THEORY_GRID = [
  ['A1', 'F1', 'D1', 'TB1', 'TG1', null, null, 'A2', 'F2', 'D2', 'TB2', 'TG2', null, 'V3'],
  ['B1', 'G1', 'E1', 'TC1', 'TAA1', null, null, 'B2', 'G2', 'E2', 'TC2', 'TAA2', null, 'V4'],
  ['C1', 'A1', 'F1', 'V1', 'V2', null, null, 'C2', 'A2', 'F2', 'TD2', 'TBB2', null, 'V5'],
  ['D1', 'B1', 'G1', 'TE1', 'TCC1', null, null, 'D2', 'B2', 'G2', 'TE2', 'TCC2', null, 'V6'],
  ['E1', 'C1', 'TA1', 'TF1', 'TD1', null, null, 'E2', 'C2', 'TA2', 'TF2', 'TDD2', null, 'V7'],
  ['V8', 'X11', 'X12', 'Y11', 'Y12', null, null, 'X21', 'Z21', 'Y21', 'W21', 'W22', null, 'V9'],
  ['V10', 'Y11', 'Y12', 'X11', 'X12', null, null, 'Y21', 'Z21', 'X21', 'W21', 'W22', null, 'V11'],
];

// Lab slots run L1-L6 / L31-L36 on Monday, L7-L12 / L37-L42 on Tuesday, and so on
const LAB_MORNING_START = [1, 7, 13, 19, 25, 71, 83];
const LAB_AFTERNOON_START = [31, 37, 43, 49, 55, 77, 89];

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// The slot and time for one cell of the grid, or null for blank/lunch cells
export function slotAt(dayIndex, kind, column) {
  const times = (kind === 'lab' ? LAB_TIMES : THEORY_TIMES)[column];
  if (!times) return null;
  let slot;
  if (kind === 'lab') {
    slot = column < LUNCH_COLUMN
      ? `L${LAB_MORNING_START[dayIndex] + column}`
      : `L${LAB_AFTERNOON_START[dayIndex] + column - LUNCH_COLUMN - 1}`;
  } else {
    slot = THEORY_GRID[dayIndex][column];
  }
  if (!slot) return null;
  return { slot, day: DAY_NAMES[dayIndex], startMin: toMinutes(times[0]), endMin: toMinutes(times[1]) };
}

// Every time a slot meets in the week, e.g. A2 -> Monday 14:00 and Wednesday 15:00
const SLOT_TIMES = (() => {
  const map = {};
  for (let d = 0; d < DAY_NAMES.length; d++) {
    for (const kind of ['theory', 'lab']) {
      for (let c = 0; c < COLUMN_COUNT; c++) {
        const cell = slotAt(d, kind, c);
        if (cell) (map[cell.slot] ??= []).push(cell);
      }
    }
  }
  return map;
})();

export function isKnownSlot(slot) {
  return Boolean(SLOT_TIMES[slot]);
}

export function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const newId = () => Math.random().toString(36).slice(2, 11);

// Turns found cells [{ slot, day, startMin, endMin, course }] into timetable
// classes, joining back-to-back cells of the same course (e.g. a two-slot lab)
export function cellsToClasses(cells) {
  const sorted = [...cells].sort((a, b) =>
    DAY_NAMES.indexOf(a.day) - DAY_NAMES.indexOf(b.day) || a.startMin - b.startMin
  );
  const merged = [];
  for (const cell of sorted) {
    const prev = merged[merged.length - 1];
    // Without course codes, still join back-to-back lab slots (L21+L22 is one lab)
    const sameCourse = prev && (prev.course
      ? prev.course === cell.course
      : !cell.course && prev.slots[0].startsWith('L') && cell.slot.startsWith('L'));
    if (prev && prev.day === cell.day && sameCourse && cell.startMin - prev.endMin <= 15) {
      prev.endMin = Math.max(prev.endMin, cell.endMin);
      prev.slots.push(cell.slot);
    } else {
      merged.push({ day: cell.day, startMin: cell.startMin, endMin: cell.endMin, course: cell.course || '', slots: [cell.slot] });
    }
  }
  return merged.map(c => ({
    id: newId(),
    day: c.day,
    startMin: c.startMin,
    endMin: c.endMin,
    // Whole hours are kept for the hour-based visual map
    startHour: Math.floor(c.startMin / 60),
    endHour: Math.ceil(c.endMin / 60),
    title: c.course ? `${c.course} (${c.slots.join('+')})` : `Class (${c.slots.join('+')})`,
  }));
}

// Parses slot lists typed or pasted by the student, e.g.
//   "A2+TA2 BCSE355L, L21+L22 BCSE302P"  or just  "A2+TA2, L21+L22"
// Returns { classes, unknown } where unknown lists tokens that aren't FFCS slots.
export function parseSlotText(text) {
  const cells = [];
  const unknown = [];
  const seen = new Set();
  // Each comma/newline/semicolon separated part may carry its own course code
  for (const part of text.toUpperCase().split(/[,;\n]+/)) {
    const course = part.match(/\b[A-Z]{4}\d{3}[A-Z]\b/)?.[0] || '';
    const tokens = part.replace(/\b[A-Z]{4}\d{3}[A-Z]\b/g, ' ').split(/[\s+/&-]+/).filter(Boolean);
    for (const token of tokens) {
      if (!isKnownSlot(token)) {
        unknown.push(token);
        continue;
      }
      if (seen.has(token)) continue;
      seen.add(token);
      SLOT_TIMES[token].forEach(t => cells.push({ ...t, course }));
    }
  }
  return { classes: cellsToClasses(cells), unknown };
}
