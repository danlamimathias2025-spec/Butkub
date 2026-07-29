import { memo } from 'react';
import { Home, BarChart3, Repeat, Wallet, User } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { TabType } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const BottomNav = memo(({ activeTab, setActiveTab }: BottomNavProps) => {
  const { t } = useLanguage();
  const tabs: { name: TabType; icon: any; translationKey: string }[] = [
    { name: 'Home', icon: Home, translationKey: 'home' },
    { name: 'Market', icon: BarChart3, translationKey: 'market' },
    { name: 'Trade', icon: Repeat, translationKey: 'trade' },
    { name: 'Wallet', icon: Wallet, translationKey: 'wallet' },
    { name: 'Account', icon: User, translationKey: 'account' },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 h-20 bg-gray-900/60 backdrop-blur-2xl rounded-3xl border border-gray-700/50 shadow-2xl flex items-center justify-around px-2 z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.name;
        
        return (
          <motion.button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center justify-center flex-1 relative group"
          >
            <div className={cn(
              "transition-all duration-300",
              isActive ? "text-[#00D632] filter drop-shadow-[0_0_8px_rgba(0,214,50,0.4)]" : "text-gray-500"
            )}>
              {tab.name === 'Trade' ? (
                <div className="w-12 h-12 bg-[#00D632] rounded-full -mt-10 shadow-[0_8px_20px_rgba(0,214,50,0.4)] flex items-center justify-center text-black border-4 border-[#0D1117] transform group-active:scale-90 transition-transform">
                  <Icon className="w-6 h-6 stroke-[3]" />
                </div>
              ) : (
                <Icon className="w-6 h-6" />
              )}
            </div>
            <span className={cn(
              "text-[10px] mt-1 font-bold transition-all duration-300",
              isActive ? "text-[#00D632]" : "text-gray-500"
            )}>
              {t(tab.translationKey)}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
});

export default BottomNav;
