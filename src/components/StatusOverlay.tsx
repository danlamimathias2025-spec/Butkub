import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface StatusOverlayProps {
  type: 'success' | 'error';
  title: string;
  message?: string;
  isOpen: boolean;
  onClose: () => void;
  autoCloseDuration?: number;
}

const StatusOverlay: React.FC<StatusOverlayProps> = ({
  type,
  title,
  message,
  isOpen,
  onClose,
  autoCloseDuration = 3000
}) => {
  useEffect(() => {
    if (isOpen && autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDuration, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-gray-900 border border-gray-800 rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 15, stiffness: 200 }}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center mb-6",
                  type === 'success' ? "bg-[#00D632]/10 text-[#00D632]" : "bg-red-500/10 text-red-500"
                )}
              >
                {type === 'success' ? (
                  <CheckCircle2 className="w-10 h-10" />
                ) : (
                  <XCircle className="w-10 h-10" />
                )}
              </motion.div>

              <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
              {message && (
                <p className="text-gray-400 text-sm leading-relaxed max-w-[240px]">
                  {message}
                </p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className={cn(
                  "mt-8 w-full py-4 rounded-2xl font-bold text-sm transition-all",
                  type === 'success' 
                    ? "bg-[#00D632] text-black hover:bg-[#00D632]/90" 
                    : "bg-red-500 text-white hover:bg-red-500/90"
                )}
              >
                Continue
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StatusOverlay;
