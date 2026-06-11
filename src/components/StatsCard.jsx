import React from 'react';

export const StatsCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  const colorMap = {
    blue: 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 border-primary-100/30 dark:border-primary-900/30',
    green: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/30 dark:border-emerald-900/30',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100/30 dark:border-indigo-900/30',
    purple: 'bg-accent-50 dark:bg-accent-950/20 text-accent-600 dark:text-accent-400 border-accent-100/30 dark:border-accent-900/30'
  };

  return (
    <div className="p-6 premium-card flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-550 dark:text-slate-450">{title}</p>
        <h3 className="text-3xl font-extrabold mt-1 text-slate-900 dark:text-white tracking-tight font-outfit">{value}</h3>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colorMap[color] || colorMap.blue} shadow-sm transition-transform duration-300 hover:rotate-6`}>
        <Icon size={22} />
      </div>
    </div>
  );
};

export default StatsCard;
