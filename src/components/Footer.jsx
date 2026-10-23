import { Calendar, Globe, Mail, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t dark:border-white/5 border-surface-200 dark:bg-surface-950 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">EventHub</span>
            </div>
            <p className="text-sm dark:text-surface-400 text-surface-500 leading-relaxed">
              Your one-stop platform for college event registration, management, and e-certificate generation.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold dark:text-white text-surface-900 mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { to: '/', label: 'Home' },
                { to: '/events', label: 'Events' },
                { to: '/verify', label: 'Verify Certificate' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm dark:text-surface-400 text-surface-500 hover:text-primary-500 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold dark:text-white text-surface-900 mb-4">Categories</h4>
            <ul className="space-y-2.5">
              {['Tech', 'Cultural', 'Sports', 'Workshop', 'Hackathon'].map(cat => (
                <li key={cat}>
                  <Link to={`/events?category=${cat}`} className="text-sm dark:text-surface-400 text-surface-500 hover:text-primary-500 transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold dark:text-white text-surface-900 mb-4">Contact</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-sm dark:text-surface-400 text-surface-500">
                <Mail className="w-4 h-4" /> events@college.edu
              </li>
              <li className="flex items-center gap-2 text-sm dark:text-surface-400 text-surface-500">
                <Globe className="w-4 h-4" /> Open Source
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t dark:border-white/5 border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm dark:text-surface-500 text-surface-400">
            © {new Date().getFullYear()} EventHub. All rights reserved.
          </p>
          <p className="text-sm dark:text-surface-500 text-surface-400 flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-accent-500 fill-accent-500" /> for students
          </p>
        </div>
      </div>
    </footer>
  );
}
