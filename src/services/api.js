import * as db from './database';

// Simulate async API calls
const delay = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms));

// Auth
export async function login(email, password) {
  await delay(300);
  const user = db.getUserByEmail(email);
  if (!user) throw new Error('No account found with this email');
  if (user.password !== password) throw new Error('Incorrect password');
  db.setCurrentUser(user);
  return db.toSafeUser(user);
}

export async function signup(userData) {
  await delay(300);
  const user = db.createUser(userData);
  db.setCurrentUser(user);
  db.addNotification({
    userId: user.id,
    title: 'Welcome!',
    message: `Welcome to EventHub, ${user.name}! Start exploring events now.`,
    type: 'success',
  });
  return db.toSafeUser(user);
}

export async function logout() {
  await delay(100);
  db.setCurrentUser(null);
}

// Returns the logged-in user, refreshed from the database so stale sessions
// (e.g. after the local data was reset) don't linger
export function getSession() {
  const session = db.getCurrentUser();
  if (!session) return null;
  const user = db.getUserById(session.id);
  if (!user) {
    db.setCurrentUser(null);
    return null;
  }
  db.setCurrentUser(user);
  return db.toSafeUser(user);
}


export async function updateUserProfile(id, updates) {
  await delay(200);
  return db.toSafeUser(db.updateUser(id, updates));
}

// Events
export async function fetchEvents() {
  await delay(200);
  return db.getEvents();
}

export async function fetchEvent(id) {
  await delay(100);
  const event = db.getEventById(id);
  if (!event) throw new Error('Event not found');
  const registrations = db.getRegistrationsByEvent(id);
  return { ...event, registrationCount: registrations.length };
}

export async function createEvent(eventData) {
  await delay(300);
  return db.createEvent(eventData);
}

export async function updateEvent(id, updates) {
  await delay(300);
  return db.updateEvent(id, updates);
}

export async function deleteEvent(id) {
  await delay(200);
  db.deleteEvent(id);
}

export async function submitFeedback(eventId, feedbackData) {
  await delay(200);
  return db.addEventFeedback(eventId, feedbackData);
}

// Registrations
export async function registerForEvent(regData) {
  await delay(400);
  const reg = db.createRegistration(regData);
  const event = db.getEventById(regData.eventId);
  db.addNotification({
    userId: regData.userId,
    title: 'Registration Confirmed!',
    message: `You have successfully registered for ${event.title}.`,
    type: 'success',
  });
  return reg;
}

export async function fetchUserRegistrations(userId) {
  await delay(200);
  const regs = db.getRegistrationsByUser(userId);
  return regs.map(reg => {
    const event = db.getEventById(reg.eventId);
    return { ...reg, event };
  });
}

export async function fetchEventRegistrations(eventId) {
  await delay(200);
  return db.getRegistrationsByEvent(eventId);
}

export async function fetchAllRegistrations() {
  await delay(200);
  const regs = db.getRegistrations();
  return regs.map(reg => ({
    ...reg,
    event: db.getEventById(reg.eventId)
  }));
}

export async function updateODStatus(regId, status) {
  await delay(200);
  return db.updateRegistration(regId, { odStatus: status });
}

export async function markAttendance(regId, attended) {
  await delay(200);
  return db.updateRegistration(regId, { attended });
}

export async function checkRegistration(userId, eventId) {
  await delay(100);
  return db.isUserRegistered(userId, eventId);
}

// Certificates
export async function fetchAllCertificates() {
  await delay(100);
  return db.getCertificates();
}

export async function fetchUserCertificates(userId) {
  await delay(200);
  return db.getCertificatesByUser(userId);
}

export async function generateCertificate(certData) {
  await delay(500);
  const existing = db.getCertificateFor(certData.userId, certData.eventId);
  if (existing) return existing;
  const cert = db.createCertificate({
    ...certData,
    certificateNumber: certData.certificateNumber || db.nextCertificateNumber(certData.eventName),
  });
  db.addNotification({
    userId: certData.userId,
    title: 'Certificate Available',
    message: `Your certificate for ${certData.eventName} is ready for download.`,
    type: 'info',
  });
  return cert;
}

export async function claimRetroactiveCertificate(userId, eventId) {
  await delay(500);
  const cert = db.retroactiveClaim(userId, eventId);
  db.addNotification({
    userId,
    title: 'Certificate Available',
    message: `Your certificate for ${cert.eventName} is ready for download.`,
    type: 'info',
  });
  return cert;
}

export async function verifyCertificate(certNumber) {
  await delay(300);
  const cert = db.getCertificateByNumber(certNumber);
  if (!cert) return { valid: false, message: 'Certificate not found' };
  return { valid: true, certificate: cert };
}

// Notifications
export async function fetchNotifications(userId) {
  await delay(100);
  return db.getNotificationsByUser(userId).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

export async function readNotification(id) {
  await delay(50);
  db.markNotificationRead(id);
}

export async function readAllNotifications(userId) {
  await delay(100);
  db.markAllNotificationsRead(userId);
}

// Admin Analytics
export async function fetchAnalytics() {
  await delay(300);
  const events = db.getEvents();
  const registrations = db.getRegistrations();
  const users = db.getUsers().filter(u => u.role === 'student');
  const certs = db.getCertificates();

  const categoryStats = {};
  events.forEach(e => {
    if (!categoryStats[e.category]) categoryStats[e.category] = 0;
    categoryStats[e.category]++;
  });

  // Count per month, then order the months chronologically for the chart
  const monthCounts = {};
  registrations.forEach(r => {
    const d = new Date(r.registeredAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });
  const monthlyRegs = {};
  Object.keys(monthCounts).sort().forEach(key => {
    const [y, m] = key.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' });
    monthlyRegs[label] = monthCounts[key];
  });

  return {
    totalEvents: events.length,
    totalStudents: users.length,
    totalRegistrations: registrations.length,
    totalCertificates: certs.length,
    openEvents: events.filter(e => e.status === 'open').length,
    completedEvents: events.filter(e => e.status === 'completed').length,
    categoryStats,
    monthlyRegs,
  };
}
