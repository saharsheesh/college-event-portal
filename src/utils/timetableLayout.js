// Reads a VIT/FFCS timetable screenshot. Works on plain pixel data plus OCR
// word boxes, so it has no browser dependencies.
//
// How it works: OCR is only trusted for the table's labels (MON..SUN, THEORY/LAB
// and the header times), which are printed on plain backgrounds and read well.
// From those we find the centre of every cell. A cell counts as registered when
// its background is coloured (VTOP highlights registered slots), and the slot
// itself comes from the cell's position in the standard FFCS grid. Course codes
// are read from the highlighted cells only to label the classes.

import { COLUMN_COUNT, DAY_NAMES, slotAt, cellsToClasses, isKnownSlot } from './ffcsSlots';

const DAY_PREFIXES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Smoothly scales the image (bilinear), so small screenshots keep readable text
function upscale(image, scale) {
  const { width: w, height: h, data } = image;
  const W = Math.round(w * scale);
  const H = Math.round(h * scale);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    const fy = Math.min(h - 1, Math.max(0, (y + 0.5) / scale - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < W; x++) {
      const fx = Math.min(w - 1, Math.max(0, (x + 0.5) / scale - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(w - 1, x0 + 1), tx = fx - x0;
      const o = (y * W + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const a = data[(y0 * w + x0) * 4 + ch], b = data[(y0 * w + x1) * 4 + ch];
        const c = data[(y1 * w + x0) * 4 + ch], d = data[(y1 * w + x1) * 4 + ch];
        out[o + ch] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
      }
      out[o + 3] = 255;
    }
  }
  return { width: W, height: H, data: out };
}

// Converts the image to black text on white, ignoring coloured cell
// backgrounds and long table lines, and scales it up for better OCR.
export function binarize(image, scale) {
  const { width: w, height: h, data } = scale === 1 ? image : upscale(image, scale);
  const ink = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = max === 0 ? 0 : (max - min) / max;
    // Dark pixels are text; mid-grey only counts when it isn't a coloured background
    ink[p] = lum < 120 || (lum < 170 && sat < 0.25) ? 1 : 0;
  }
  // Blank out long horizontal/vertical runs: those are table borders, not text
  const minRun = Math.max(40, Math.round(w / 40));
  const erase = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let start = 0;
    for (let x = 0; x <= w; x++) {
      if (x < w && ink[y * w + x]) continue;
      if (x - start >= minRun) for (let k = start; k < x; k++) erase[y * w + k] = 1;
      start = x + 1;
    }
  }
  const minRunV = Math.max(20, Math.round(minRun / 2));
  for (let x = 0; x < w; x++) {
    let start = 0;
    for (let y = 0; y <= h; y++) {
      if (y < h && ink[y * w + x]) continue;
      if (y - start >= minRunV) for (let k = start; k < y; k++) erase[k * w + x] = 1;
      start = y + 1;
    }
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const v = ink[p] && !erase[p] ? 0 : 255;
    out[p * 4] = out[p * 4 + 1] = out[p * 4 + 2] = v;
    out[p * 4 + 3] = 255;
  }
  return { width: w, height: h, data: out };
}

const center = (b) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });
const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const clean = (text) => text.toUpperCase().replace(/[^A-Z0-9:;.-]/g, '');

function findDays(words) {
  const days = new Array(7).fill(null);
  for (const w of words) {
    const t = clean(w.text);
    const d = DAY_PREFIXES.findIndex(p => t.startsWith(p));
    if (d === -1 || t.length > 4) continue;
    const c = center(w.bbox);
    // Day labels sit in the leftmost column; keep the leftmost match
    if (!days[d] || c.x < days[d].x) days[d] = c;
  }
  const found = days.map((d, i) => d && { i, y: d.y, x: d.x }).filter(Boolean);
  if (found.length < 3) return null;
  // Fill in any day OCR missed from the spacing of the ones it found
  const gaps = [];
  for (let k = 1; k < found.length; k++) {
    gaps.push((found[k].y - found[k - 1].y) / (found[k].i - found[k - 1].i));
  }
  const gap = median(gaps);
  if (!(gap > 0)) return null;
  const ys = days.map((d, i) => {
    if (d) return d.y;
    const ref = found.reduce((a, b) => (Math.abs(b.i - i) < Math.abs(a.i - i) ? b : a));
    return ref.y + (i - ref.i) * gap;
  });
  return { ys, gap, labelX: median(found.map(f => f.x)) };
}

function findColumns(words, headerBottom, width, labelX) {
  const xs = [];
  for (const w of words) {
    const raw = clean(w.text);
    const t = raw.replace(/O/g, '0');
    const c = center(w.bbox);
    if (c.x <= labelX) continue;
    const isTime = /^\d{1,2}[:;.]\d{2}$/.test(t) && c.y < headerBottom;
    const isLunch = /^LUN/.test(raw);
    // Unhighlighted cells print their slot code (A1, TB1, L31, ...), which
    // marks the column centre as well as the header times do
    const isSlot = c.y > headerBottom && (isKnownSlot(raw) || /^L\d{1,2}$/.test(raw));
    if (isTime || isLunch || isSlot) xs.push(c.x);
  }
  xs.sort((a, b) => a - b);
  const tol = width / 50;
  const clusters = [];
  for (const x of xs) {
    const last = clusters[clusters.length - 1];
    if (last && x - last.max <= tol) {
      last.sum += x; last.n++; last.max = x;
    } else {
      clusters.push({ sum: x, n: 1, max: x });
    }
  }
  let cols = clusters.map(c => c.sum / c.n);
  // Fill single missing columns from the typical spacing
  // Drop stray single readings when there are too many clusters
  if (cols.length > COLUMN_COUNT) {
    const kept = clusters.filter(c => c.n > 1);
    if (kept.length >= COLUMN_COUNT - 3) cols = kept.map(c => c.sum / c.n);
  }
  if (cols.length >= COLUMN_COUNT - 3 && cols.length < COLUMN_COUNT) {
    const spacing = median(cols.slice(1).map((x, i) => x - cols[i]));
    const filled = [cols[0]];
    for (let i = 1; i < cols.length; i++) {
      const steps = Math.round((cols[i] - filled[filled.length - 1]) / spacing);
      for (let s = 1; s < steps; s++) filled.push(filled[filled.length - 1] + spacing);
      filled.push(cols[i]);
    }
    cols = filled;
  }
  return cols.length === COLUMN_COUNT ? cols : null;
}

function findRows(words, days, firstColumnX) {
  const theory = new Array(7).fill(null);
  const lab = new Array(7).fill(null);
  for (const w of words) {
    const t = clean(w.text);
    const c = center(w.bbox);
    if (c.x >= firstColumnX) continue;
    const isTheory = /^TH[E3][O0Q]?R?Y?/.test(t) && t.length >= 4;
    const isLab = /^L[A4][B8]$/.test(t);
    if (!isTheory && !isLab) continue;
    // Attach the label to the nearest day, ignoring the header rows above Monday
    let best = -1;
    for (let d = 0; d < 7; d++) {
      if (Math.abs(c.y - days.ys[d]) < days.gap * 0.6 && (best === -1 || Math.abs(c.y - days.ys[d]) < Math.abs(c.y - days.ys[best]))) best = d;
    }
    if (best === -1) continue;
    if (isTheory && c.y <= days.ys[best] + days.gap * 0.1) theory[best] = c.y;
    if (isLab && c.y >= days.ys[best] - days.gap * 0.1) lab[best] = c.y;
  }
  const theoryOffset = median(theory.map((y, d) => y !== null && y - days.ys[d]).filter(v => v !== false)) || -days.gap / 4;
  const labOffset = median(lab.map((y, d) => y !== null && y - days.ys[d]).filter(v => v !== false)) || days.gap / 4;
  return days.ys.map((dy, d) => ({
    theory: theory[d] ?? dy + theoryOffset,
    lab: lab[d] ?? dy + labOffset,
  }));
}

// Share of clearly coloured pixels in a box: highlighted cells score high,
// white cells and grey headers score ~0
function colouredShare(image, cx, cy, halfW, halfH) {
  const { width, height, data } = image;
  let hits = 0, total = 0;
  const x0 = Math.max(0, Math.round(cx - halfW)), x1 = Math.min(width - 1, Math.round(cx + halfW));
  const y0 = Math.max(0, Math.round(cy - halfH)), y1 = Math.min(height - 1, Math.round(cy + halfH));
  const step = Math.max(1, Math.round(Math.min(halfW, halfH) / 8));
  for (let y = y0; y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      total++;
      if (max > 110 && (max - min) / max > 0.3) hits++;
    }
  }
  return total ? hits / total : 0;
}

// Course codes look like BCSE302L; fix the usual OCR letter/digit mix-ups
function readCourse(text) {
  const t = text.toUpperCase().replace(/\s+/g, '');
  const m = t.match(/([A-Z0-9]{4})([0-9OZSIBLG]{3})([LPEJ])/);
  if (!m) return null;
  const letters = m[1].replace(/0/g, 'O').replace(/5/g, 'S').replace(/8/g, 'B').replace(/1/g, 'I').replace(/2/g, 'Z');
  const digits = m[2].replace(/O/g, '0').replace(/Z/g, '2').replace(/S/g, '5').replace(/[IL]/g, '1').replace(/B/g, '8').replace(/G/g, '6');
  if (!/^[A-Z]{4}$/.test(letters)) return null;
  return letters + digits + m[3];
}

// image: original pixels { width, height, data }; words: OCR words with bbox
// in the same coordinates. Returns { classes, cellCount } or throws with a
// message that can be shown to the student.
export function extractTimetable(image, words) {
  const days = findDays(words);
  if (!days) throw new Error("Couldn't find the day labels (MON, TUE, ...). Is this a VIT timetable screenshot?");
  const headerBottom = days.ys[0] - days.gap * 0.5;
  const cols = findColumns(words, headerBottom, image.width, days.labelX);
  if (!cols) throw new Error("Couldn't line up the time columns. Try a sharper screenshot of the whole timetable grid.");
  const rows = findRows(words, days, cols[0] - (cols[1] - cols[0]) / 2);

  const cells = [];
  for (let d = 0; d < 7; d++) {
    const rowGap = Math.abs(rows[d].lab - rows[d].theory) || days.gap / 2;
    for (const kind of ['theory', 'lab']) {
      const y = rows[d][kind];
      for (let c = 0; c < COLUMN_COUNT; c++) {
        const cell = slotAt(d, kind, c);
        if (!cell) continue;
        const left = c > 0 ? cols[c] - cols[c - 1] : cols[1] - cols[0];
        const right = c < COLUMN_COUNT - 1 ? cols[c + 1] - cols[c] : left;
        const colW = Math.min(left, right);
        if (colouredShare(image, cols[c], y, colW * 0.35, rowGap * 0.3) < 0.4) continue;
        // Collect OCR text inside this cell to read its course code
        const text = words
          .filter(w => {
            const p = center(w.bbox);
            return Math.abs(p.x - cols[c]) < colW / 2 && Math.abs(p.y - y) < rowGap / 2;
          })
          .map(w => w.text)
          .join('');
        cells.push({ ...cell, ocrCourse: readCourse(text) });
      }
    }
  }

  // A slot always belongs to one course, so let all its cells vote; ties go
  // to the reading seen most often across the whole timetable
  const global = {};
  cells.forEach(c => { if (c.ocrCourse) global[c.ocrCourse] = (global[c.ocrCourse] || 0) + 1; });
  const bySlot = {};
  cells.forEach(c => (bySlot[c.slot] ??= []).push(c.ocrCourse));
  const pick = (reads) => {
    const votes = {};
    reads.filter(Boolean).forEach(r => { votes[r] = (votes[r] || 0) + 1; });
    const best = Object.keys(votes).sort((a, b) => votes[b] - votes[a] || global[b] - global[a])[0];
    return best ? { code: best, count: votes[best] } : null;
  };
  const courseFor = {};
  for (const [slot, reads] of Object.entries(bySlot)) {
    const own = pick(reads);
    // Tutorial slots share a course with their partner (TG2 goes with G2) and
    // labs come in pairs (L21+L22), so the partner's reading can fill a gap or
    // fix a one-character misread
    const lab = slot.match(/^L(\d+)$/);
    const partnerSlot = lab
      ? `L${Number(lab[1]) % 2 ? Number(lab[1]) + 1 : Number(lab[1]) - 1}`
      : /^T[A-G]\d$/.test(slot) ? slot.slice(1) : bySlot[`T${slot}`] ? `T${slot}` : null;
    const partner = partnerSlot ? pick(bySlot[partnerSlot] || []) : null;
    const nearMiss = own && partner && own.code !== partner.code &&
      [...own.code].filter((ch, i) => ch !== partner.code[i]).length <= 1;
    // Decide a near miss by which reading the rest of the timetable backs up;
    // the matching lab (BCSE307P for BCSE307L) counts as support too
    const support = (code) => Object.entries(global)
      .reduce((sum, [c, n]) => sum + (c === code ? n : c.slice(0, 7) === code.slice(0, 7) ? n / 2 : 0), 0);
    const usePartner = !own || (nearMiss && support(partner.code) > support(own.code));
    courseFor[slot] = (usePartner ? partner?.code : own.code) || '';
  }

  const classes = cellsToClasses(cells.map(c => ({ slot: c.slot, day: c.day, startMin: c.startMin, endMin: c.endMin, course: courseFor[c.slot] })));
  return { classes, cellCount: cells.length };
}

export { DAY_NAMES };
