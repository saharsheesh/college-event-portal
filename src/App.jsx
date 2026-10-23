import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { initializeDB } from './services/database';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotificationToast from './components/NotificationToast';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import StudentDashboard from './pages/StudentDashboard';
import AdminPanel from './pages/AdminPanel';
import VerifyCertificate from './pages/VerifyCertificate';

// Initialize database with seed data
initializeDB();

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <div className="min-h-screen flex flex-col dark:bg-surface-950 bg-surface-50 dark:text-surface-100 text-surface-900 transition-colors">
              <Navbar />
              <NotificationToast />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/events/:id" element={<EventDetail />} />
                  <Route path="/verify" element={<VerifyCertificate />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute requiredRole="student">
                        <StudentDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminPanel />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
              <Footer />
            </div>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
