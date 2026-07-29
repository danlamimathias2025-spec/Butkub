import { memo } from 'react';
import { Bell, QrCode, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '@/src/lib/utils';

interface TopNavProps {
  onNotificationsClick?: () => void;
}

const TopNav = memo(({ onNotificationsClick }: TopNavProps) => {
  const { language, setLanguage } = useLanguage();

  return (
    <nav className="flex items-center justify-between px-5 pt-3 pb-2 bg-[#0D1117] sticky top-0 z-50">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600 flex items-center justify-center">
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 bg-[#00D632] rounded-full p-0.5 border-2 border-[#0D1117]">
          <ShieldCheck className="w-2 h-2 text-white" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-[#00D632] rounded flex items-center justify-center transform rotate-45">
             <span className="text-[10px] font-black text-black transform -rotate-45">B</span>
          </div>
          <span className="text-white font-bold tracking-tight text-base uppercase">Bitkub</span>
        </div>
        <div className="flex bg-gray-800/50 rounded-full p-0.5 text-[8px] font-medium border border-gray-700">
          <button 
            onClick={() => setLanguage('TH')}
            className={cn(
              "px-2 py-0.5 rounded-full transition-all",
              language === 'TH' ? "bg-gray-700 text-white font-bold" : "text-gray-500"
            )}
          >
            TH
          </button>
          <button 
            onClick={() => setLanguage('EN')}
            className={cn(
              "px-2 py-0.5 rounded-full transition-all",
              language === 'EN' ? "bg-gray-700 text-white font-bold" : "text-gray-500"
            )}
          >
            EN
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <motion.button 
          whileTap={{ scale: 0.95 }} 
          onClick={onNotificationsClick}
          className="p-2 rounded-full hover:bg-gray-800 text-gray-400"
        >
          <Bell className="w-5 h-5" />
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} className="p-2 rounded-full hover:bg-gray-800 text-gray-400">
          <QrCode className="w-5 h-5" />
        </motion.button>
      </div>
    </nav>
  );
});

export default TopNav;
