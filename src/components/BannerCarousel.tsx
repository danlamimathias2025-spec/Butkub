import { memo } from 'react';
import { motion } from 'motion/react';

const BANNERS = [
  { id: 1, color: 'from-green-600 to-green-900', title: 'Bitkub Academy', subtitle: 'Learn & Earn Free KUB' },
  { id: 2, color: 'from-blue-600 to-indigo-900', title: 'New Listing', subtitle: 'Trade SOL/THB Now' },
  { id: 3, color: 'from-purple-600 to-pink-900', title: 'Referral Program', subtitle: 'Get 20% Cashback' },
];

const BannerCarousel = memo(() => {
  return (
    <div className="px-5 py-2 overflow-x-auto no-scrollbar flex gap-3">
      {BANNERS.map((banner) => (
        <motion.div
          key={banner.id}
          whileTap={{ scale: 0.98 }}
          className={`min-w-[280px] h-32 rounded-2xl bg-gradient-to-br ${banner.color} p-5 flex flex-col justify-end relative overflow-hidden border border-white/10 shadow-lg`}
        >
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest mb-1">PROMOTION</p>
          <h3 className="text-lg font-bold text-white leading-tight">{banner.title}</h3>
          <p className="text-xs text-white/80">{banner.subtitle}</p>
        </motion.div>
      ))}
    </div>
  );
});

export default BannerCarousel;
