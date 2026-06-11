import React, { useState, useEffect, useRef } from 'react';
import { adminApi } from '../../services/api';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Edit, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  UserCheck, 
  HelpCircle,
  FileSpreadsheet,
  X,
  Loader2,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../../components/ConfirmModal';

export const ManageEmails = () => {
  const [registrations, setRegistrations] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [confirmDeleteRefNo, setConfirmDeleteRefNo] = useState(null);
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    refNo: '',
    email: '',
    name: '',
    class: '',
    schoolName: '',
    place: '',
    mobileNumber: ''
  });

  const fileInputRef = useRef(null);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getRegistrations(search, selectedClass, page, limit);
      setRegistrations(data.registrations);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      toast.error('Failed to load examiner registry.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await adminApi.getDistinctClasses();
      setClasses(data);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [search, selectedClass, page]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setFormData({
      refNo: '',
      email: '',
      name: '',
      class: '',
      schoolName: '',
      place: '',
      mobileNumber: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (reg) => {
    setIsEditing(true);
    setFormData({
      refNo: reg.refNo,
      email: reg.email,
      name: reg.name || '',
      class: reg.class || '',
      schoolName: reg.schoolName || '',
      place: reg.place || '',
      mobileNumber: reg.mobileNumber || ''
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.refNo || !formData.email) {
      toast.error('Registration Number (Ref No) and Email are required.');
      return;
    }

    try {
      setModalLoading(true);
      if (isEditing) {
        await adminApi.updateRegistration(formData.refNo, formData);
        toast.success('Examiner details updated successfully.');
      } else {
        await adminApi.addRegistration(formData);
        toast.success('Examiner registered successfully.');
      }
      setShowModal(false);
      fetchRegistrations();
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Operation failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteClick = (refNo) => {
    setConfirmDeleteRefNo(refNo);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteRefNo) return;
    try {
      await adminApi.deleteRegistration(confirmDeleteRefNo);
      toast.success('Registration deleted successfully.');
      fetchRegistrations();
      fetchClasses();
    } catch (err) {
      toast.error(err.message || 'Failed to delete registration.');
    } finally {
      setConfirmDeleteRefNo(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportLoading(true);
      const data = await adminApi.importRegistrations(file);
      toast.success(data.message || 'Imported registrations successfully!');
      setPage(1);
      fetchRegistrations();
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Excel import failed.');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manage Examiner Registry</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage examiner accounts, edit profile information, and bulk import Excel registers.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />
          <button
            onClick={handleImportClick}
            disabled={importLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-55 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold shadow-sm active:scale-98 transition-all disabled:opacity-50"
          >
            {importLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            <span>Bulk Import (Excel)</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 active:scale-98 transition-all"
          >
            <Plus size={16} />
            <span>Add Examiner</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 border border-slate-205/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by ref no, name, email, school, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
        <div className="relative min-w-[200px] flex items-center">
          <Filter className="absolute left-3 text-slate-400 pointer-events-none" size={16} />
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-800 dark:text-slate-100 appearance-none cursor-pointer"
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Data */}
      {loading ? (
        <LoadingSkeleton type="table" count={5} />
      ) : registrations.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900">
          <HelpCircle className="mx-auto text-slate-350 dark:text-slate-700 mb-3 animate-pulse" size={40} />
          <h3 className="font-bold text-slate-750 dark:text-slate-300">No Examiners Found</h3>
          <p className="text-slate-450 dark:text-slate-500 text-sm mt-1 max-w-sm mx-auto">Create a single entry manually or upload the excel registration sheet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ref No</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">School Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mobile Number</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {registrations.map((reg) => (
                  <tr key={reg.refNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-bold px-2 py-1 bg-slate-105 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700/40 text-slate-700 dark:text-slate-300 rounded-lg">
                        {reg.refNo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {reg.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 font-mono text-xs">
                      {reg.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-350">
                      {reg.class ? (
                        <span className="px-2.5 py-0.5 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-450 border border-primary-100/50 dark:border-primary-900/30 rounded-full text-xs font-semibold">
                          {reg.class}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Universal</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {reg.schoolName || '—'}
                      </div>
                      <div className="truncate text-xs text-slate-400 mt-0.5">
                        {reg.place || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                      {reg.mobileNumber || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(reg)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-primary-500/50 hover:text-primary-600 text-slate-600 dark:text-slate-400 rounded-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-850"
                      >
                        <Edit size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(reg.refNo)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 text-rose-500 rounded-lg transition-all hover:bg-rose-50 dark:hover:bg-rose-950/10"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 bg-slate-50 dark:bg-slate-850/50 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'Edit Examiner Registration' : 'Register New Examiner'}
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
                  Fill in the details to configure the examinee's login credential profile.
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Ref No *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    value={formData.refNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, refNo: e.target.value }))}
                    placeholder="e.g. REF001"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-850 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="examiner@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-850 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Examiner Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Class
                  </label>
                  <input
                    type="text"
                    value={formData.class}
                    onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                    placeholder="e.g. Grade 10"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-850 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-850 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    School Name
                  </label>
                  <input
                    type="text"
                    value={formData.schoolName}
                    onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                    placeholder="e.g. Vaagai School"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-850 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Place
                  </label>
                  <input
                    type="text"
                    value={formData.place}
                    onChange={(e) => setFormData(prev => ({ ...prev, place: e.target.value }))}
                    placeholder="e.g. Chennai"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-850 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold active:scale-98 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-[2] flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 active:scale-98 transition-all disabled:opacity-50"
                >
                  {modalLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span>{isEditing ? 'Save Changes' : 'Register Examiner'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Registration Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteRefNo}
        title="Delete Registration?"
        message={`Are you sure you want to delete examiner registration profile "${confirmDeleteRefNo}"? This will revoke their platform access permissions.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteRefNo(null)}
        confirmText="Delete Registration"
        type="danger"
      />
    </div>
  );
};

export default ManageEmails;
