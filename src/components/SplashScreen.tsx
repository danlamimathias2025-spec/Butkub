import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function SplashScreen() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 bg-[#0D1117] z-[1000] flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="relative mb-8">
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-32 h-32 rounded-full border-2 border-[#00D632]/10 flex items-center justify-center"
          >
            <div className="w-24 h-24 rounded-full border border-[#00D632]/30 flex items-center justify-center bg-[#00D632]/5 shadow-[0_0_50px_rgba(0,214,50,0.1)]">
              <span className="text-4xl font-black text-[#00D632] tracking-tighter">BK</span>
            </div>
          </motion.div>
          
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-4 bg-[#00D632]/5 blur-3xl rounded-full"
          />
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-3xl font-black text-white tracking-tighter mb-2 italic">
            BITKUB <span className="text-[#00D632]">NEXT</span>
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mb-12">
            The Future of Digital Assets
          </p>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-16 flex flex-col items-center">
        <div className="w-48 h-[2px] bg-gray-800 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-1/2 h-full bg-[#00D632] shadow-[0_0_10px_#00D632]"
          />
        </div>
        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">
          Loading Secure Environment{dots}
        </p>
      </div>

      <div className="absolute bottom-8">
        <p className="text-[8px] text-gray-800 font-bold uppercase tracking-widest">
          Splendid Design &copy; 2026
        </p>
      </div>
    </motion.div>
  );
}
