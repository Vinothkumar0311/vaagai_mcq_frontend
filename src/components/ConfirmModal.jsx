import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  onConfirm,
  onCancel,
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  type = 'danger' // 'danger' | 'warning' | 'info'
}) => {
  if (!isOpen) return null;

  const getTheme = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle className="text-amber-500" size={24} />,
          iconBg: 'bg-amber-100 dark:bg-amber-950/30',
          btnBg: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 shadow-amber-500/25',
        };
      case 'info':
        return {
          icon: <AlertTriangle className="text-blue-500" size={24} />,
          iconBg: 'bg-blue-100 dark:bg-blue-950/30',
          btnBg: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 shadow-primary-600/25',
        };
      case 'danger':
      default:
        return {
          icon: <Trash2 className="text-red-500" size={24} />,
          iconBg: 'bg-red-100 dark:bg-red-950/30',
          btnBg: 'bg-red-500 hover:bg-red-600 focus:ring-red-500 shadow-red-500/25',
        };
    }
  };

  const theme = getTheme();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onCancel}
      />

      {/* Content Container */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 text-left shadow-2xl border border-slate-100 dark:border-slate-800 transition-all duration-300 scale-100">
        
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="flex gap-4 items-start mt-2">
          <div className={`shrink-0 p-3 rounded-2xl ${theme.iconBg}`}>
            {theme.icon}
          </div>
          <div className="flex-1 space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {message}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className={`px-5 py-2.5 ${theme.btnBg} text-white font-semibold text-sm rounded-xl shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};
