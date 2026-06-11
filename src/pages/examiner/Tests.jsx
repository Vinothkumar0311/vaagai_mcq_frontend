import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { examinerApi } from '../../services/api';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { Calendar, Clock, Award, Play, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const Tests = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // pending or completed

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const data = await examinerApi.getTests(user.email);
        setTests(data);
      } catch (err) {
        toast.error('Failed to query assessments lists.');
      } finally {
        setLoading(false);
      }
    };
    if (user?.email) {
      fetchTests();
    }
  }, [user]);

  if (loading) {
    return <LoadingSkeleton type="card" count={3} />;
  }

  const pendingTests = tests.filter(t => !t.hasAttempted);
  const completedTests = tests.filter(t => t.hasAttempted);
  const currentTests = activeTab === 'pending' ? pendingTests : completedTests;

  return (
    <div className="space-y-8">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-outfit">My Assessments</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Access scheduled evaluations or review graded reports.</p>
        </div>

        {/* Custom Tab Pill */}
        <div className="flex bg-slate-100 dark:bg-darkCard/60 p-1.5 rounded-2xl border border-slate-200/40 dark:border-white/5 self-start">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'pending' ? 'bg-white dark:bg-darkBg text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/20 dark:border-white/5' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
          >
            Pending ({pendingTests.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'completed' ? 'bg-white dark:bg-darkBg text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/20 dark:border-white/5' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
          >
            Completed ({completedTests.length})
          </button>
        </div>
      </div>

      {currentTests.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-darkCard">
          <AlertCircle className="mx-auto text-slate-350 dark:text-slate-700 mb-3 animate-pulse" size={38} />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 font-outfit">
            {activeTab === 'pending' ? 'No Outstanding Assessments' : 'No Graded Sheets Completed'}
          </h3>
          <p className="text-slate-450 dark:text-slate-505 text-sm mt-1 max-w-sm mx-auto">
            {activeTab === 'pending' 
              ? 'You have completed all pending assessments assigned to you.' 
              : 'You will see grading sheets once you start and submit active exams.'}
          </p>
        </div>
      ) : (
        /* List in cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentTests.map((test) => (
            <div 
              key={test.id} 
              className="premium-card p-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200/40 dark:border-slate-700/40 rounded-md">
                    {test.id}
                  </span>
                  
                  {activeTab === 'completed' && (
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${test.resultsPublished ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {test.resultsPublished ? `Score: ${test.score}/${test.total}` : 'Results Pending'}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-12 font-outfit tracking-tight">
                  {test.name}
                </h3>

                {/* Info */}
                <div className="flex items-center gap-4 text-xs font-medium text-slate-550 dark:text-slate-405">
                  <span className="flex items-center gap-1"><Calendar size={13} /> {new Date(test.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                  <span className="flex items-center gap-1"><Clock size={13} /> {test.duration} mins</span>
                </div>
              </div>

              {/* Attendance action buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                {activeTab === 'pending' ? (
                  <Link
                    to={`/examiner/test/${test.id}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-600/15 active:scale-98 transition-all duration-200"
                  >
                    <Play size={13} /> Start Assessment
                  </Link>
                ) : test.resultsPublished ? (
                  <Link
                    to={`/examiner/result/${test.id}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all duration-200"
                  >
                    Review Responses <ArrowRight size={13} />
                  </Link>
                ) : (
                  <button
                    onClick={() => toast.error('Results for this assessment have not been published by the administrator yet.')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-650 rounded-xl text-xs font-bold cursor-not-allowed"
                  >
                    Review Responses <ArrowRight size={13} />
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tests;
