import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { Search, Download, FileSpreadsheet, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const Results = () => {
  const [results, setResults] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  const fetchFilters = async () => {
    try {
      const testsList = await adminApi.getTests();
      setTests(testsList);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getResults(search, selectedTestId, page, 10);
      setResults(data.results || []);
      setPagination(data.pagination || { totalPages: 1, total: 0 });
    } catch (err) {
      toast.error('Failed to query examiner grader sheets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [search, selectedTestId, page]);

  // Client side Excel download for mock mode, or direct API download for live server mode
  const handleExportExcel = () => {
    const isMock = import.meta.env.VITE_USE_MOCK_API === 'true';

    if (isMock) {
      try {
        if (results.length === 0) {
          toast.error('No results available to export.');
          return;
        }

        const dataToExport = results.map(r => ({
          'Result ID': r.id,
          'Test ID': r.testId,
          'Test Name': r.testName,
          'Examiner Name': r.userName,
          'Examiner Email': r.userEmail,
          'Score': r.score,
          'Total Questions': r.total,
          'Percentage (%)': ((r.score / r.total) * 100).toFixed(2),
          'Time Taken (sec)': r.timeTaken,
          'Submitted At': new Date(r.submittedAt).toLocaleString()
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Examiner Scores');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        saveAs(data, `Vaagai_MCQ_Report_${selectedTestId || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Excel Report downloaded successfully!');
      } catch (err) {
        toast.error('Failed to export Excel report: ' + err.message);
      }
    } else {
      // Live server download
      const exportUrl = adminApi.exportResultsUrl(selectedTestId);
      if (exportUrl) {
        window.open(exportUrl, '_blank');
        toast.success('Streaming reports from database server...');
      } else {
        toast.error('Export configuration error.');
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Title & Export Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Results & Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review student performance, search grades, and download spreadsheets.</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/25 active:scale-98 transition-all shrink-0"
        >
          <Download size={18} />
          Export Reports (Excel)
        </button>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        
        {/* Search */}
        <div className="relative rounded-xl shadow-sm md:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 text-slate-800 dark:text-slate-100"
            placeholder="Search by student name or email..."
          />
        </div>

        {/* Test Dropdown filter */}
        <select
          value={selectedTestId}
          onChange={(e) => { setSelectedTestId(e.target.value); setPage(1); }}
          className="block w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 text-slate-700 dark:text-slate-300"
        >
          <option value="">All Examinations</option>
          {tests.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
          ))}
        </select>

      </div>

      {/* Main Results Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        {loading ? (
          <LoadingSkeleton type="table" count={5} />
        ) : results.length === 0 ? (
          <div className="py-16 text-center">
            <HelpCircle className="mx-auto text-slate-350 dark:text-slate-650 mb-3 animate-pulse" size={36} />
            <h3 className="font-bold text-slate-700 dark:text-slate-350">No Grader Sheets Found</h3>
            <p className="text-slate-450 dark:text-slate-500 text-sm mt-1 max-w-sm mx-auto">Modify your filters or wait for examiners to submit assessments.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-xs">
                    <th className="pb-3 pl-2">Student</th>
                    <th className="pb-3">Assessment Title</th>
                    <th className="pb-3 text-center">Correct / Total</th>
                    <th className="pb-3 text-center">Percentage</th>
                    <th className="pb-3 text-center">Duration</th>
                    <th className="pb-3 text-right pr-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {results.map((res) => {
                    const percent = ((res.score / res.total) * 100);
                    const minutes = Math.floor(res.timeTaken / 60);
                    const seconds = res.timeTaken % 60;
                    return (
                      <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-4 pl-2">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{res.userName}</div>
                          <div className="text-xs text-slate-400">{res.userEmail}</div>
                        </td>
                        <td className="py-4 font-medium text-slate-700 dark:text-slate-350">{res.testName}</td>
                        <td className="py-4 text-center font-bold text-slate-800 dark:text-slate-100">{res.score} / {res.total}</td>
                        <td className="py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${percent >= 70 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' : percent >= 40 ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450'}`}>
                            {percent.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-4 text-center text-slate-650 dark:text-slate-400 font-medium">
                          {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
                        </td>
                        <td className="py-4 text-right text-xs text-slate-450 pr-2">
                          {new Date(res.submittedAt).toLocaleString(undefined, {dateStyle: 'short', timeStyle: 'short'})}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Panel */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-4">
                <p className="text-xs text-slate-400">
                  Showing <strong>{results.length}</strong> of <strong>{pagination.total}</strong> results
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 text-slate-600 dark:text-slate-400"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={page === pagination.totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 text-slate-600 dark:text-slate-400"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
