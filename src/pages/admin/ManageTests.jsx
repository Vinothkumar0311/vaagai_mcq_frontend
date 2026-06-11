import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { 
  Plus, 
  Trash2, 
  Eye, 
  CheckCircle, 
  Calendar, 
  Clock, 
  HelpCircle,
  Play
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../../components/ConfirmModal';

export const ManageTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteTestId, setConfirmDeleteTestId] = useState(null);

  const fetchTests = async () => {
    try {
      const data = await adminApi.getTests();
      setTests(data);
    } catch (err) {
      toast.error('Failed to load examinations list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleTogglePublish = async (test) => {
    const nextStatus = test.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    
    if (nextStatus === 'PUBLISHED' && (!test._count?.questions || test._count.questions === 0)) {
      toast.error('Cannot publish a test with 0 questions. Please upload questions first!');
      return;
    }

    try {
      await adminApi.updateTest(test.id, { status: nextStatus });
      toast.success(`Test is now ${nextStatus}`);
      fetchTests();
    } catch (err) {
      toast.error(err.message || 'Failed to update test status.');
    }
  };

  const handleTogglePublishResults = async (test) => {
    const nextVal = !test.publishResults;
    try {
      await adminApi.updateTest(test.id, { publishResults: nextVal });
      toast.success(nextVal ? 'Results published successfully!' : 'Results unpublished.');
      fetchTests();
    } catch (err) {
      toast.error(err.message || 'Failed to update results publishing state.');
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmDeleteTestId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTestId) return;
    try {
      await adminApi.deleteTest(confirmDeleteTestId);
      toast.success('Test deleted successfully.');
      fetchTests();
    } catch (err) {
      toast.error(err.message || 'Failed to delete test.');
    } finally {
      setConfirmDeleteTestId(null);
    }
  };

  if (loading) {
    return <LoadingSkeleton type="table" count={5} />;
  }

  return (
    <div className="space-y-8">
      {/* Top Title & Add Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manage Tests</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Create and configure test containers. Manage publishing and assign examiners.</p>
        </div>
        <Link
          to="/admin/tests/create"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 active:scale-98 transition-all shrink-0"
        >
          <Plus size={18} />
          Create Test Container
        </Link>
      </div>

      {tests.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900">
          <HelpCircle className="mx-auto text-slate-300 dark:text-slate-700 mb-3 animate-bounce" size={40} />
          <h3 className="font-bold text-slate-700 dark:text-slate-300">No Assessment Containers Yet</h3>
          <p className="text-slate-450 dark:text-slate-500 text-sm mt-1 max-w-sm mx-auto">Click "Create Test Container" to initialize your first exam schedules.</p>
        </div>
      ) : (
        /* Grid of test containers styled professionally */
        <div className="grid grid-cols-1 gap-6">
          {tests.map((test) => (
            <div 
              key={test.id} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700/60 transition-all duration-200"
            >
              <div className="space-y-3 flex-1">
                {/* Header title & status badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700/40 text-slate-700 dark:text-slate-300 rounded-lg">
                    {test.id}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{test.name}</h3>
                  
                  {/* Status Pill */}
                  <button 
                    onClick={() => handleTogglePublish(test)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold select-none cursor-pointer transition-all hover:scale-102 active:scale-98 ${test.status === 'PUBLISHED' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30'}`}
                  >
                    {test.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT (Click to Publish)'}
                  </button>

                  {/* Results Publishing Pill */}
                  <button 
                    onClick={() => handleTogglePublishResults(test)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold select-none cursor-pointer transition-all hover:scale-102 active:scale-98 ${test.publishResults ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}
                  >
                    {test.publishResults ? 'RESULTS: PUBLISHED' : 'RESULTS: UNPUBLISHED (Click to Publish)'}
                  </button>
                </div>

                {/* Scheduling / Duration info */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(test.date).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14} /> {test.duration} Minutes</span>
                  <span className="flex items-center gap-1.5"><HelpCircle size={14} /> {test._count?.questions || 0} Questions</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end flex-wrap border-t md:border-t-0 border-slate-100 dark:border-slate-800/40 pt-4 md:pt-0">
                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteClick(test.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 text-rose-500 rounded-xl text-xs font-bold transition-all hover:bg-rose-50 dark:hover:bg-rose-950/10"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Confirm Delete Test Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteTestId}
        title="Delete Test Container?"
        message="Are you absolutely sure you want to delete this test? All questions, assignments, and historical grades will be permanently deleted."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteTestId(null)}
        confirmText="Delete Test"
        type="danger"
      />
    </div>
  );
};

export default ManageTests;
