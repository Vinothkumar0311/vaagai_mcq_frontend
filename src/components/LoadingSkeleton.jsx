import React from 'react';

export const LoadingSkeleton = ({ type = 'card', count = 1 }) => {
  const items = Array.from({ length: count });

  const renderSkeleton = () => {
    switch (type) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
              <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
              <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            </div>
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
        );
      case 'table':
        return (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-slate-300 dark:bg-slate-700 rounded-lg w-full"></div>
            {items.map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg flex-1"></div>
                <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg flex-1"></div>
                <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg w-24"></div>
              </div>
            ))}
          </div>
        );
      case 'test-taking':
        return (
          <div className="space-y-6 animate-pulse max-w-3xl mx-auto">
            <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded-lg w-1/3"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2"></div>
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-full"></div>
              <div className="space-y-3 pt-4">
                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl w-full"></div>
                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl w-full"></div>
                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl w-full"></div>
                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl w-full"></div>
              </div>
            </div>
          </div>
        );
      case 'card':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((_, i) => (
              <div key={i} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 animate-pulse shadow-sm">
                <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/4"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-full"></div>
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-full pt-2"></div>
              </div>
            ))}
          </div>
        );
    }
  };

  return renderSkeleton();
};

export default LoadingSkeleton;
