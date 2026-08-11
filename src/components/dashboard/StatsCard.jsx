import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';

const StatsCard = ({ title, value, change, changeType, icon }) => {
  const tone =
    changeType === 'positive'
      ? 'text-emerald-600'
      : changeType === 'negative'
        ? 'text-red-600'
        : 'text-ink-500';

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className="stat-card group">
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">{title}</p>
          <p className="font-display text-2xl sm:text-[1.7rem] font-semibold text-ink-950 mt-2.5 tracking-tight truncate">
            {value}
          </p>
          <div className="flex items-center mt-2.5 gap-1.5">
            <span className={`text-xs font-semibold ${tone}`}>{change}</span>
            <span className="text-xs text-ink-400">vs last period</span>
          </div>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-50 to-teal-50 border border-brand-100/70 flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform">
          <SafeIcon icon={icon} className="w-5 h-5 text-brand-700" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
