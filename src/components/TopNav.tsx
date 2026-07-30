import { memo } from 'react';
import { Bell, QrCode, ShieldCheck, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavScroll } from '../contexts/NavScrollContext';
import { cn } from '@/src/lib/utils';

interface TopNavProps {
  onNotificationsClick?: () => void;
}

const TopNav = memo(({ onNotificationsClick }: TopNavProps) => {
  const { language, setLanguage } = useLanguage();
  const { isNavVisible } = useNavScroll();

  return (
    <motion.nav 
      initial={false}
      animate={{ 
        y: isNavVisible ? 0 : -80, 
        opacity: isNavVisible ? 1 : 0 
      }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-2 z-50 mx-4 my-2 px-4 py-2 bg-[#0D1117]/80 backdrop-blur-2xl rounded-2xl border border-gray-800/80 shadow-2xl flex items-center justify-between"
      style={{ pointerEvents: isNavVisible ? 'auto' : 'none' }}
    >
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
        <div className="flex items-center gap-1 bg-gray-800/80 rounded-full p-0.5 text-[9px] font-bold border border-gray-700/80">
          <Globe className="w-2.5 h-2.5 text-gray-400 ml-1" />
          <button 
            onClick={() => setLanguage('TH')}
            className={cn(
              "px-2 py-0.5 rounded-full transition-all",
              language === 'TH' ? "bg-[#00D632] text-black font-extrabold shadow" : "text-gray-400 hover:text-white"
            )}
          >
            TH
          </button>
          <button 
            onClick={() => setLanguage('EN')}
            className={cn(
              "px-2 py-0.5 rounded-full transition-all",
              language === 'EN' ? "bg-[#00D632] text-black font-extrabold shadow" : "text-gray-400 hover:text-white"
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
    </motion.nav>
  );
});

export default TopNav;
