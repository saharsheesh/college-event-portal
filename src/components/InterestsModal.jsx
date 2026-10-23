import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { CATEGORIES } from '../utils/seedData';
import { useAuth } from '../context/useAuth';
import * as api from '../services/api';

export default function InterestsModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  // Mounting the dialog only while open makes it start from the saved interests each time
  return <InterestsDialog onClose={onClose} />;
}

function InterestsDialog({ onClose }) {
  const { user, updateUser } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState(user?.interests || []);

  const toggleInterest = (cat) => {
    setSelectedInterests(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const updatedUser = await api.updateUserProfile(user.id, { interests: selectedInterests });
      updateUser(updatedUser);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-lg rounded-3xl dark:bg-surface-900 bg-white border dark:border-white/10 border-surface-200 overflow-hidden shadow-2xl">
        <div className="p-8 text-center pt-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-400 flex items-center justify-center mb-6 shadow-lg shadow-primary-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold dark:text-white text-surface-900 mb-2">Build Your Feed</h2>
          <p className="dark:text-surface-400 text-surface-500 text-sm mb-8">What kind of events get you excited? Select at least one category to receive wildly targeted recommendations!</p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {CATEGORIES.map(cat => {
              const isSel = selectedInterests.includes(cat);
              return (
                <button key={cat} onClick={() => toggleInterest(cat)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isSel ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25 scale-105' : 'dark:bg-surface-800 bg-surface-100 dark:text-surface-300 text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-700'
                  }`}
                >
                  {cat} {isSel && <CheckCircle2 className="w-4 h-4" />}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 mt-4">
             {user?.interests?.length > 0 && (
               <button onClick={onClose} className="flex-1 px-6 py-3.5 rounded-xl font-bold text-sm bg-transparent dark:text-surface-400 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition">
                 Cancel
               </button>
             )}
             <button onClick={handleSave} disabled={selectedInterests.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white gradient-bg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed">
                Save Interests
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
