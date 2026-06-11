import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import StatsCard from '../../components/StatsCard';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { Users, FileSpreadsheet, FileText, ArrowRight, PlusCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminApi.getStats();
        setStats(data);
      } catch (err) {
        toast.error('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  return (
    <div className="space-y-8">
      {/* Top Welcome Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Admin Console</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Overview of examination systems, question database, and student results.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard 
          title="Active Examiners" 
          value={stats?.totalUsers || 0} 
          icon={Users} 
          color="blue" 
        />
        <StatsCard 
          title="Total Examinations" 
          value={stats?.totalTests || 0} 
          icon={FileText} 
          color="indigo" 
        />
        <StatsCard 
          title="Submissions Evaluated" 
          value={stats?.totalResults || 0} 
          icon={FileSpreadsheet} 
          color="green" 
        />
      </div>

      {/* Grid for Quick Actions & Recent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Recent Results */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">Recent Student Submissions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time graded exams completed by examiners.</p>
            </div>
            <Link to="/admin/results" className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {stats?.recentResults?.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <CheckCircle2 className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={32} />
                <p>No examination results submitted yet.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 font-semibold uppercase tracking-wider text-xs">
                    <th className="pb-3 pl-2">Student</th>
                    <th className="pb-3">Assessment</th>
                    <th className="pb-3 text-right">Score</th>
                    <th className="pb-3 text-right pr-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {stats?.recentResults?.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{res.userName}</div>
                        <div className="text-xs text-slate-400">{res.userEmail}</div>
                      </td>
                      <td className="py-4 font-medium text-slate-700 dark:text-slate-350 truncate max-w-xs">{res.testName}</td>
                      <td className="py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${res.score / res.total >= 0.7 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'}`}>
                          {res.score}/{res.total}
                        </span>
                      </td>
                      <td className="py-4 text-right text-xs text-slate-500 dark:text-slate-400 pr-2">
                        {new Date(res.submittedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Quick Actions Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-1">Administrative Shortcuts</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Create, modify, and monitor examinations instantly.</p>
            
            <div className="space-y-4">
              <Link 
                to="/admin/tests" 
                className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-primary-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/25 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">Launch New Assessment</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Schedule date, time limits, and assign attendees.</p>
                </div>
              </Link>

              <Link 
                to="/admin/results" 
                className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/25 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Export Excel Sheet</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Download full analytical report of grader sheets.</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/35 border border-slate-100 dark:border-slate-800/40 rounded-2xl text-xs text-slate-500 dark:text-slate-400 flex gap-2">
            <span className="font-bold text-primary-600 dark:text-primary-400">System tip:</span>
            <span>You can upload questions immediately after creating any test container.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
