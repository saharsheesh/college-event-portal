import { AnimatePresence, motion } from 'framer-motion';
import { useNotification } from '../context/useNotification';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
};

const iconColorMap = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-amber-400',
};

export default function NotificationToast() {
  const { toasts, removeToast } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = iconMap[toast.type] || Info;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl ${colorMap[toast.type]}`}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColorMap[toast.type]}`} />
              <p className="text-sm font-medium flex-1 dark:text-surface-100 text-surface-800">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
