import { seedUsers, seedEvents, seedRegistrations, seedCertificates, seedNotifications } from '../utils/seedData';

const KEYS = {
  USERS: 'eventPortal_users',
  EVENTS: 'eventPortal_events',
  REGISTRATIONS: 'eventPortal_registrations',
  CERTIFICATES: 'eventPortal_certificates',
  NOTIFICATIONS: 'eventPortal_notifications',
  CURRENT_USER: 'eventPortal_currentUser',
  INITIALIZED: 'eventPortal_init_r15',
};

function initializeDB() {
  if (localStorage.getItem(KEYS.INITIALIZED)) return;
  localStorage.setItem(KEYS.USERS, JSON.stringify(seedUsers));
  localStorage.setItem(KEYS.EVENTS, JSON.stringify(seedEvents));
  localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify(seedRegistrations));
  localStorage.setItem(KEYS.CERTIFICATES, JSON.stringify(seedCertificates));
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(seedNotifications));
  localStorage.setItem(KEYS.INITIALIZED, 'true');
}

function getCollection(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setCollection(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

// Users
export function getUsers() { return getCollection(KEYS.USERS); }

export function getUserById(id) {
  return getUsers().find(u => u.id === id) || null;
}

export function getUserByEmail(email) {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function createUser(userData) {
  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
    throw new Error('Email already registered');
  }
  const newUser = {
    id: generateId('user'),
    ...userData,
    role: 'student',
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  setCollection(KEYS.USERS, users);
  return newUser;
}


export function updateUser(id, updates) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('User not found');
  users[idx] = { ...users[idx], ...updates };
  setCollection(KEYS.USERS, users);
  
  const curr = getCurrentUser();
  if (curr && curr.id === id) {
    setCurrentUser(users[idx]);
  }
  return users[idx];
}

// Session
export function toSafeUser(user) {
  if (!user) return null;
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function setCurrentUser(user) {
  if (user) {
    sessionStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(toSafeUser(user)));
  } else {
    sessionStorage.removeItem(KEYS.CURRENT_USER);
  }
}

export function getCurrentUser() {
  const data = sessionStorage.getItem(KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

// Events
export function getEvents() { return getCollection(KEYS.EVENTS); }

export function getEventById(id) {
  return getEvents().find(e => e.id === id) || null;
}

export function createEvent(eventData) {
  const events = getEvents();
  const newEvent = {
    id: generateId('evt'),
    ...eventData,
    ratings: [],
    feedback: [],
    createdAt: new Date().toISOString(),
  };
  events.push(newEvent);
  setCollection(KEYS.EVENTS, events);
  return newEvent;
}

export function updateEvent(id, updates) {
  const events = getEvents();
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Event not found');
  events[idx] = { ...events[idx], ...updates };
  setCollection(KEYS.EVENTS, events);
  return events[idx];
}

export function deleteEvent(id) {
  const events = getEvents().filter(e => e.id !== id);
  setCollection(KEYS.EVENTS, events);
  // Drop registrations that would otherwise point at a missing event
  setCollection(KEYS.REGISTRATIONS, getRegistrations().filter(r => r.eventId !== id));
}

export function addEventFeedback(eventId, feedbackData) {
  const events = getEvents();
  const idx = events.findIndex(e => e.id === eventId);
  if (idx === -1) throw new Error('Event not found');
  events[idx].feedback.push(feedbackData);
  events[idx].ratings.push(feedbackData.rating);
  setCollection(KEYS.EVENTS, events);
  return events[idx];
}

// Registrations
export function getRegistrations() { return getCollection(KEYS.REGISTRATIONS); }

export function getRegistrationsByEvent(eventId) {
  return getRegistrations().filter(r => r.eventId === eventId);
}

export function getRegistrationsByUser(userId) {
  return getRegistrations().filter(r => r.userId === userId);
}

export function isUserRegistered(userId, eventId) {
  return getRegistrations().some(r => r.userId === userId && r.eventId === eventId);
}

export function createRegistration(regData) {
  const registrations = getRegistrations();
  if (isUserRegistered(regData.userId, regData.eventId)) {
    throw new Error('Already registered for this event');
  }
  const event = getEventById(regData.eventId);
  if (!event) throw new Error('Event not found');
  if (event.status !== 'open') throw new Error('Registration is closed for this event');
  const currentCount = getRegistrationsByEvent(regData.eventId).length;
  if (currentCount >= event.maxParticipants) {
    throw new Error('Event is full');
  }
  if (new Date(event.registrationDeadline) < new Date()) {
    throw new Error('Registration deadline has passed');
  }
  const newReg = {
    id: generateId('reg'),
    ...regData,
    attended: false,
    registeredAt: new Date().toISOString(),
  };
  registrations.push(newReg);
  setCollection(KEYS.REGISTRATIONS, registrations);
  return newReg;
}

export function updateRegistration(id, updates) {
  const registrations = getRegistrations();
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Registration not found');
  registrations[idx] = { ...registrations[idx], ...updates };
  setCollection(KEYS.REGISTRATIONS, registrations);
  return registrations[idx];
}

// Certificates
export function getCertificates() { return getCollection(KEYS.CERTIFICATES); }

export function getCertificatesByUser(userId) {
  return getCertificates().filter(c => c.userId === userId);
}

export function getCertificateByNumber(certNumber) {
  const wanted = certNumber.trim().toUpperCase();
  return getCertificates().find(c => c.certificateNumber.toUpperCase() === wanted) || null;
}

export function getCertificateFor(userId, eventId) {
  return getCertificates().find(c => c.userId === userId && c.eventId === eventId) || null;
}

// Builds a certificate number like CERT-2026-WDB-004 that no other certificate uses
export function nextCertificateNumber(eventTitle) {
  const prefix = (eventTitle.replace(/[^A-Z]/gi, '').slice(0, 3) || 'EVT').toUpperCase();
  const base = `CERT-${new Date().getFullYear()}-${prefix}-`;
  const taken = new Set(getCertificates().map(c => c.certificateNumber));
  let n = 1;
  while (taken.has(base + String(n).padStart(3, '0'))) n++;
  return base + String(n).padStart(3, '0');
}

export function getCertificateById(id) {
  return getCertificates().find(c => c.id === id) || null;
}

export function createCertificate(certData) {
  const certs = getCertificates();
  const existing = certs.find(c => c.userId === certData.userId && c.eventId === certData.eventId);
  if (existing) return existing;
  const newCert = {
    id: generateId('cert'),
    ...certData,
    issuedAt: new Date().toISOString(),
    verified: true,
  };
  certs.push(newCert);
  setCollection(KEYS.CERTIFICATES, certs);
  return newCert;
}

export function retroactiveClaim(userId, eventId) {
  const registrations = getRegistrations();
  if (isUserRegistered(userId, eventId)) {
    throw new Error('Already registered or claimed for this event');
  }
  const event = getEventById(eventId);
  if (!event || event.status !== 'completed') {
    throw new Error('Event is not eligible for retroactive claim');
  }
  const user = getUserById(userId);
  if (!user) {
    throw new Error('Your account was not found. Please log out and log back in, then try again.');
  }

  // Force create registration
  const newReg = {
    id: generateId('reg'),
    userId,
    eventId,
    name: user.name,
    email: user.email,
    department: user.department || '',
    year: user.year || '',
    phone: user.phone || '',
    teamName: null,
    teamMembers: [],
    paymentStatus: event.isPaid ? 'paid' : 'free',
    attended: true,
    registeredAt: new Date().toISOString(),
    isRetroactive: true
  };
  registrations.push(newReg);
  setCollection(KEYS.REGISTRATIONS, registrations);

  const certData = {
    userId,
    eventId,
    name: user.name,
    eventName: event.title,
    eventDate: event.date,
    certificateNumber: nextCertificateNumber(event.title),
  };

  return createCertificate(certData);
}

// Notifications
export function getNotifications() { return getCollection(KEYS.NOTIFICATIONS); }

export function getNotificationsByUser(userId) {
  return getNotifications().filter(n => n.userId === userId);
}

export function addNotification(notifData) {
  const notifs = getNotifications();
  const newNotif = {
    id: generateId('notif'),
    ...notifData,
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifs.push(newNotif);
  setCollection(KEYS.NOTIFICATIONS, notifs);
  return newNotif;
}

export function markNotificationRead(id) {
  const notifs = getNotifications();
  const idx = notifs.findIndex(n => n.id === id);
  if (idx !== -1) {
    notifs[idx].read = true;
    setCollection(KEYS.NOTIFICATIONS, notifs);
  }
}

export function markAllNotificationsRead(userId) {
  const notifs = getNotifications();
  notifs.forEach(n => {
    if (n.userId === userId) n.read = true;
  });
  setCollection(KEYS.NOTIFICATIONS, notifs);
}

export { initializeDB, KEYS };
