import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { FileText, Calendar, Clock, Mail, ChevronLeft, Save, FileSpreadsheet, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export const CreateTest = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState('30');
  const [emailsInput, setEmailsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);

  const [newClassInput, setNewClassInput] = useState('');

  const handleAddNewClass = () => {
    const trimmed = newClassInput.trim();
    if (!trimmed) return;
    
    // Add to classes list if not already present
    if (!classes.includes(trimmed)) {
      setClasses(prev => [...prev, trimmed].sort());
    }
    
    // Auto-select the newly added class
    if (!selectedClasses.includes(trimmed)) {
      setSelectedClasses(prev => [...prev, trimmed]);
    }
    
    setNewClassInput('');
  };

  React.useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await adminApi.getDistinctClasses();
        setClasses(data);
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      }
    };
    fetchClasses();
  }, []);

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const extractedEmails = new Set();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Iterate through all sheets and extract cell strings matching email format
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          sheetData.forEach(row => {
            if (Array.isArray(row)) {
              row.forEach(cell => {
                if (cell && typeof cell === 'string') {
                  const trimmed = cell.trim().toLowerCase();
                  if (emailRegex.test(trimmed)) {
                    extractedEmails.add(trimmed);
                  }
                }
              });
            }
          });
        });

        if (extractedEmails.size === 0) {
          toast.error("No valid email addresses found in the uploaded Excel file.");
          return;
        }

        const emailListStr = Array.from(extractedEmails).join('\n');
        setEmailsInput(prev => {
          const existing = prev.trim();
          return existing ? `${existing}\n${emailListStr}` : emailListStr;
        });

        toast.success(`Successfully imported ${extractedEmails.size} unique emails from Excel!`);
        // Reset file input value so same file can be uploaded again if needed
        e.target.value = '';
      } catch (err) {
        console.error(evt, err);
        toast.error("Failed to parse Excel file. Make sure it is a valid .xlsx or .xls file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !date || !duration) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    // Parse examiner emails
    const emailsList = emailsInput
      .split(/[\n,]+/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

    try {
      const newTest = await adminApi.createTest({
        name,
        date,
        duration: parseInt(duration, 10),
        examineeEmails: emailsList,
        allowedClasses: selectedClasses
      });

      toast.success(`Test Container ${newTest.id} Created!`);
      // Navigate to tests listing
      navigate('/admin/tests');
    } catch (err) {
      toast.error(err.message || 'Failed to create assessment container.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back navigation */}
      <button 
        onClick={() => navigate('/admin/tests')}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
      >
        <ChevronLeft size={16} /> Back to Tests
      </button>

      {/* Main container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create Examination</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure duration, schedule dates, and authorize student access.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          {/* Test Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Test Name / Title <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1 relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FileText size={18} />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 text-slate-800 dark:text-slate-100"
                placeholder="e.g., Core Java & OOP Concepts Midterm"
              />
            </div>
          </div>

          {/* Grid for Date & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scheduled Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Scheduled Date & Time <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar size={18} />
                </div>
                <input
                  type="datetime-local"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Test Duration */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Duration (Minutes) <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Clock size={18} />
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  max="480"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 text-slate-800 dark:text-slate-100"
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          {/* Allowed Classes Multi-Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Allowed Classes (Optional)
            </label>
            <p className="text-xs text-slate-450 dark:text-slate-500">
              Filter test questions based on the examiner's class. Leave empty to serve all questions.
            </p>

            <div className="flex gap-2 max-w-md">
              <div className="relative flex-1 rounded-xl shadow-sm">
                <input
                  type="text"
                  value={newClassInput}
                  onChange={(e) => setNewClassInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewClass();
                    }
                  }}
                  placeholder="Enter class name (e.g. 10th, 12th)"
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-600/45 text-slate-800 dark:text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={handleAddNewClass}
                className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 transition-all duration-200 active:scale-95"
              >
                <Plus size={14} />
                Add Class
              </button>
            </div>

            {classes.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No classes listed yet. Type a class and click "Add Class" above.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1.5">
                {classes.map((className) => {
                  const isSelected = selectedClasses.includes(className);
                  return (
                    <button
                      type="button"
                      key={className}
                      onClick={() => {
                        setSelectedClasses(prev => 
                          isSelected 
                            ? prev.filter(c => c !== className)
                            : [...prev, className]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 ${isSelected ? 'bg-primary-600 border-primary-650 text-white shadow-md shadow-primary-600/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                      {className}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assigned Examiner Emails */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Assign Student/Examiner Emails
                </label>
                <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">Authorize emails to attempt this test.</p>
              </div>
              
              {/* Excel Upload Option */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-650 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/30 rounded-xl text-xs font-bold transition-all cursor-pointer select-none">
                <FileSpreadsheet size={14} />
                Import Emails (Excel)
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="relative rounded-xl shadow-sm">
              <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <textarea
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                rows={4}
                className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 text-slate-800 dark:text-slate-100"
                placeholder="examiner1@example.com&#10;student@vaagai.com, vinoth@domain.com"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 active:scale-98 transition-all disabled:opacity-50"
          >
            <Save size={16} />
            {submitting ? 'Creating Assessment...' : 'Save & Initialize Test Container'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTest;
