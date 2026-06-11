import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { examinerApi } from '../../services/api';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { Award, BookOpen, Clock, Calendar, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const Dashboard = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const data = await examinerApi.getTests(user.email);
        setTests(data);
      } catch (err) {
        toast.error('Failed to load assigned assessments.');
      } finally {
        setLoading(false);
      }
    };
    if (user?.email) {
      fetchTests();
    }
  }, [user]);

  if (loading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  const upcomingTests = tests.filter(t => !t.hasAttempted);
  const completedTests = tests.filter(t => t.hasAttempted);

  // Math for stats
  const totalAttempted = completedTests.length;
  const averagePercent = totalAttempted > 0 
    ? (completedTests.reduce((acc, curr) => acc + (curr.score / curr.total), 0) / totalAttempted * 100).toFixed(0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-outfit">
          Welcome, {user?.name || 'Examiner'}!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Review scheduled assessments, check historical grades, and launch exams.</p>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Card */}
        <div className="p-6 premium-card flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-450">Assigned Assessments</p>
            <h3 className="text-3xl font-extrabold mt-1 text-slate-900 dark:text-white tracking-tight font-outfit">{upcomingTests.length} Pending</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <BookOpen size={22} />
          </div>
        </div>

        {/* Completed Card */}
        <div className="p-6 premium-card flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-450">Completed Exams</p>
            <h3 className="text-3xl font-extrabold mt-1 text-slate-900 dark:text-white tracking-tight font-outfit">{completedTests.length} Submitted</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Award size={22} />
          </div>
        </div>

        {/* Avg Performance */}
        <div className="p-6 premium-card flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-450">Average Percentage</p>
            <h3 className="text-3xl font-extrabold mt-1 text-slate-900 dark:text-white tracking-tight font-outfit">{averagePercent}%</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/20 border border-primary-100/30 dark:border-primary-900/30 text-primary-600 dark:text-primary-450 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Pending Assessments list */}
        <div className="lg:col-span-2 premium-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white font-outfit">Active Examination Schedules</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Assigned assessments available for attendance.</p>
              </div>
              <Link to="/examiner/tests" className="text-sm font-semibold text-primary-600 dark:text-primary-405 hover:underline flex items-center gap-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>

            {upcomingTests.length === 0 ? (
              <div className="py-12 text-center text-slate-450 dark:text-slate-500">
                <Award className="mx-auto text-slate-305 dark:text-slate-700 mb-2" size={32} />
                <p>Excellent! No outstanding assessments to complete.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {upcomingTests.slice(0, 3).map((test) => (
                  <div 
                    key={test.id} 
                    className="p-5 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-900 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm hover:border-slate-205 dark:hover:border-slate-800 transition-all duration-200"
                  >
                    <div className="space-y-1.5 flex-1">
                      <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-md border border-primary-100/40 dark:border-primary-900/20 uppercase">
                        {test.id}
                      </span>
                      <h4 className="font-bold text-slate-850 dark:text-slate-200 tracking-tight font-outfit">{test.name}</h4>
                      <div className="flex gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Calendar size={13} /> {new Date(test.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                        <span className="flex items-center gap-1"><Clock size={13} /> {test.duration} mins</span>
                      </div>
                    </div>
                    <Link
                      to={`/examiner/test/${test.id}`}
                      className="w-full sm:w-auto text-center px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-600/15 transition-all duration-200 flex items-center justify-center gap-1.5"
                    >
                      Attend Test <ArrowRight size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Tips and Instructions */}
        <div className="premium-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2 font-outfit">Assessment Guidelines</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              To ensure system integrity and fairness, the examinations are configured with the following restrictions:
            </p>
            
            <ul className="space-y-4 text-xs font-medium text-slate-700 dark:text-slate-350">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0 animate-pulse" />
                <span><strong>Fullscreen Enforcement:</strong> The test window will switch to full-screen mode on launch. Exiting fullscreen might trigger warnings.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0 animate-pulse" />
                <span><strong>Single Attempt Limit:</strong> Once started, you must complete the test. Retakes or page reloads are strictly locked.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0 animate-pulse" />
                <span><strong>Auto-Submit Timer:</strong> The exam will auto-submit as soon as the countdown timer hits 0:00. Make sure to monitor your remaining time.</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 p-4 bg-primary-50/50 dark:bg-primary-950/10 border border-primary-100/40 dark:border-primary-900/10 rounded-2xl text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-primary-600 dark:text-primary-405">Environment:</span> All test randomized order algorithms are run in background. Good luck!
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
