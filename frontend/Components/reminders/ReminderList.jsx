import React, { useState, useEffect, useCallback } from 'react';
import ReminderCard from './ReminderCard';
import AddReminderForm from './AddReminderForm';
import { api } from '../../services/api';
import { toast } from 'react-toastify';
import {
  Plus, Search, X, Pill, Filter,
  CheckCircle2, AlertTriangle, PauseCircle, Archive, List,
} from 'lucide-react';

// ─── Filter Tab config ─────────────────────────────────────────────────────────

const FILTER_TABS = [
  { id: 'Active',    label: 'Active',    Icon: CheckCircle2, color: 'text-blue-600',    activeBg: 'bg-blue-600' },
  { id: 'Overdue',   label: 'Overdue',   Icon: AlertTriangle, color: 'text-rose-600',   activeBg: 'bg-rose-600' },
  { id: 'Completed', label: 'Completed', Icon: Archive,       color: 'text-emerald-600', activeBg: 'bg-emerald-600' },
  { id: 'Suspended', label: 'Suspended', Icon: PauseCircle,   color: 'text-amber-600',  activeBg: 'bg-amber-500' },
  { id: 'All',       label: 'All',       Icon: List,          color: 'text-slate-600',  activeBg: 'bg-slate-700' },
];

// ─── Skeleton loader (matches ReminderCard proportions) ──────────────────────

const CardSkeleton = () => (
  <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden animate-pulse">
    <div className="h-1.5 bg-slate-200 w-full" />
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-slate-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
          <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
        </div>
        <div className="h-6 w-16 bg-slate-100 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-14 bg-slate-100 rounded-xl" />
        <div className="h-14 bg-slate-100 rounded-xl" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-7 w-20 bg-slate-100 rounded-lg" />
        <div className="h-7 w-20 bg-slate-100 rounded-lg" />
      </div>
      <div className="h-12 bg-slate-50 rounded-xl border border-slate-100" />
      <div className="space-y-1.5">
        <div className="h-1.5 bg-slate-200 rounded-full" />
        <div className="h-3 bg-slate-100 rounded-lg w-1/3" />
      </div>
    </div>
    <div className="flex gap-2 px-5 pb-4 pt-3 border-t border-slate-100">
      <div className="flex-1 h-9 bg-slate-100 rounded-xl" />
      <div className="flex-1 h-9 bg-slate-100 rounded-xl" />
      <div className="w-9 h-9 bg-slate-100 rounded-xl" />
    </div>
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ filter, onClearFilter, onAdd }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4 border border-slate-200">
      <Pill className="w-10 h-10 text-slate-300" />
    </div>
    <h3 className="text-base font-bold text-slate-700 mb-1">
      {filter !== 'All' ? `No ${filter} reminders` : 'No reminders yet'}
    </h3>
    <p className="text-sm text-slate-400 max-w-xs mb-5">
      {filter !== 'All'
        ? `You don't have any ${filter.toLowerCase()} medicine reminders.`
        : 'Add your first medicine reminder to start tracking your medication schedule.'}
    </p>
    {filter !== 'All' ? (
      <button
        onClick={onClearFilter}
        className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-100 transition-all"
      >
        Show all reminders
      </button>
    ) : (
      <button
        onClick={onAdd}
        id="empty-add-reminder-btn"
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/25 transition-all"
      >
        <Plus className="w-4 h-4" />
        Add First Reminder
      </button>
    )}
  </div>
);

// ─── Confirm delete modal ─────────────────────────────────────────────────────

const DeleteModal = ({ medicineName, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Delete Reminder?</h3>
          <p className="text-sm text-slate-500">This action cannot be undone.</p>
        </div>
      </div>
      <p className="text-sm text-slate-600 mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
        You are about to delete <strong className="text-slate-900">{medicineName}</strong>.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          id="confirm-delete-btn"
          onClick={onConfirm}
          className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/25 transition-all"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─── ReminderList ─────────────────────────────────────────────────────────────

const ReminderList = ({ onReminderChange }) => {
  const [reminders,       setReminders]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [showAddForm,     setShowAddForm]      = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [filter,          setFilter]          = useState('Active');
  const [searchTerm,      setSearchTerm]      = useState('');
  const [deleteTarget,    setDeleteTarget]    = useState(null); // { id, medicineName }

  // ── data fetch ────────────────────────────────────────────────────────────

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter === 'Overdue' ? {} : filter !== 'All' ? { status: filter } : {};
      const response = await api.reminders.getAll(params);
      let list = response.data.data || [];
      if (filter === 'Overdue') list = list.filter(r => r.isOverdue && r.status === 'Active');
      setReminders(list);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = async (formData) => {
    if (editingReminder) {
      await api.reminders.update(editingReminder._id, formData);
      toast.success('Reminder updated');
    } else {
      await api.reminders.create(formData);
      toast.success('Reminder added');
    }
    fetchReminders();
    onReminderChange?.();
    setShowAddForm(false);
    setEditingReminder(null);
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setShowAddForm(true);
  };

  const requestDelete = (id) => {
    const r = reminders.find(r => r._id === id);
    setDeleteTarget({ id, medicineName: r?.medicineName || 'this reminder' });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.reminders.delete(deleteTarget.id);
      toast.success('Reminder deleted');
      fetchReminders();
      onReminderChange?.();
    } catch {
      toast.error('Failed to delete reminder');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.reminders.updateStatus(id, status);
      toast.success(`Marked as ${status.toLowerCase()}`);
      fetchReminders();
      onReminderChange?.();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // ── computed ──────────────────────────────────────────────────────────────

  const counts = {
    Active:    reminders.filter(r => r.status === 'Active').length,
    Overdue:   reminders.filter(r => r.isOverdue && r.status === 'Active').length,
    Completed: reminders.filter(r => r.status === 'Completed').length,
    Suspended: reminders.filter(r => r.status === 'Suspended').length,
    All:       reminders.length,
  };

  const filtered = reminders.filter(r =>
    r.medicineName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAdd = () => {
    setEditingReminder(null);
    setShowAddForm(true);
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Toolbar: filter tabs + search + add ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Filter tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map(({ id, label, Icon, activeBg }) => (
            <button
              key={id}
              id={`filter-tab-${id.toLowerCase()}`}
              onClick={() => setFilter(id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold uppercase tracking-wide border-b-2 whitespace-nowrap transition-all ${
                filter === id
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {counts[id] > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  filter === id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {counts[id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + Add button row */}
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="search-reminders"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search medicines…"
              className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            id="add-reminder-btn"
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/25 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Medicine</span>
          </button>
        </div>
      </div>

      {/* ── Results count ── */}
      {!loading && !error && (
        <p className="text-xs font-semibold text-slate-400 px-1">
          {filtered.length > 0
            ? `Showing ${filtered.length} reminder${filtered.length !== 1 ? 's' : ''}${searchTerm ? ` for "${searchTerm}"` : ''}`
            : ''
          }
        </p>
      )}

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
          </div>
          <p className="font-bold text-slate-800 mb-1">Failed to load reminders</p>
          <p className="text-sm text-rose-600 mb-4">{error}</p>
          <button
            onClick={fetchReminders}
            className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <EmptyState
              filter={filter}
              onClearFilter={() => setFilter('All')}
              onAdd={openAdd}
            />
          ) : (
            filtered.map(reminder => (
              <ReminderCard
                key={reminder._id}
                reminder={reminder}
                onEdit={handleEdit}
                onDelete={requestDelete}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full my-6">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Pill className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingReminder ? 'Edit Reminder' : 'New Medicine Reminder'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingReminder ? `Editing ${editingReminder.medicineName}` : 'Fill in the details below'}
                  </p>
                </div>
              </div>
              <button
                id="close-modal-btn"
                onClick={() => { setShowAddForm(false); setEditingReminder(null); }}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6">
              <AddReminderForm
                onSubmit={handleSave}
                onCancel={() => { setShowAddForm(false); setEditingReminder(null); }}
                initialData={editingReminder}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <DeleteModal
          medicineName={deleteTarget.medicineName}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default ReminderList;
