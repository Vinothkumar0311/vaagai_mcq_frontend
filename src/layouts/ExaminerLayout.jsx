import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';
import { 
  LayoutDashboard, 
  BookOpen, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  User as UserIcon,
  Award
} from 'lucide-react';

export const ExaminerLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/examiner', icon: LayoutDashboard },
    { name: 'My Assessments', path: '/examiner/tests', icon: BookOpen },
  ];

  const handleLogout = () => {
    logout();
    navigate('/examiner/login');
  };

  // Hide header and sidebar during an active exam to prevent distraction/cheating
  const isTakingTest = location.pathname.includes('/examiner/test/');

  if (isTakingTest) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-darkBg transition-colors duration-300">
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-darkBg flex transition-colors duration-300">
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-darkCard border-r border-slate-200/60 dark:border-white/5 transform lg:transform-none lg:opacity-100 transition-all duration-300 flex flex-col justify-between ${sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0'}`}>
        <div>
          {/* Brand Logo / Title */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200/60 dark:border-white/5 bg-[#f8fafc]/50 dark:bg-darkCard/50">
            <Link to="/examiner" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-primary-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-primary-600/35">V</div>
              <span className="font-bold text-lg text-slate-800 dark:text-slate-200 tracking-tight font-outfit">Vaagai MCQ</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-950 dark:hover:text-slate-100'}`}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile section & logout */}
        <div className="p-4 border-t border-slate-200/60 dark:border-white/5 space-y-2">
          {/* Examiner role tag */}
          <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold">
            <Award size={14} />
            <span>Examiner Assessment Profile</span>
          </div>

          <div className="flex items-center gap-3 p-2">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-full ring-2 ring-primary-600/25" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center font-bold"><UserIcon size={16} /></div>
            )}
            <div className="flex-1 overflow-hidden">
              <h4 className="text-sm font-semibold truncate text-slate-805 dark:text-slate-200">{user?.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden"></div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white/85 dark:bg-darkBg/80 backdrop-blur-md border-b border-slate-200/60 dark:border-white/5 sticky top-0 z-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
              <Menu size={22} />
            </button>
            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-200 font-outfit">
              {menuItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400 transition-colors duration-200"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="p-6 md:p-8 flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ExaminerLayout;
