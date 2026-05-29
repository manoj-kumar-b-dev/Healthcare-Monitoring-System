import React, { useState, useEffect } from 'react';
import ReminderCard from './ReminderCard';
import AddReminderForm from './AddReminderForm';
import { api } from '../../services/api';
import { toast } from 'react-toastify';

const ReminderList = ({ onReminderChange }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [filter, setFilter] = useState('Active'); // Active, Completed, All
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReminders = async () => {
    try {
      setLoading(true);
      console.log('[ReminderList] Fetching reminders with filter:', filter);
      const params = filter !== 'All' ? { status: filter } : {};
      const response = await api.reminders.getAll(params);
      const remindersList = response.data.data || [];
      setReminders(remindersList);
      setError(null);
      console.log('[ReminderList] Reminders loaded:', remindersList.length, 'items');
    } catch (err) {
      console.error('[ReminderList] Error fetching reminders:', err);
      setError(err.response?.data?.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [filter]);

  const handleAddReminder = async (formData) => {
    try {
      if (editingReminder) {
        console.log('[ReminderList] Updating reminder:', editingReminder._id);
        await api.reminders.update(editingReminder._id, formData);
        toast.success('Reminder updated successfully');
      } else {
        console.log('[ReminderList] Creating new reminder');
        await api.reminders.create(formData);
        toast.success('Reminder created successfully');
      }
      fetchReminders();
      // Notify parent component to refresh stats
      if (onReminderChange) {
        console.log('[ReminderList] Invoking onReminderChange callback');
        onReminderChange();
      }
      setShowAddForm(false);
      setEditingReminder(null);
    } catch (err) {
      console.error('[ReminderList] Error saving reminder:', err);
      toast.error(err.response?.data?.message || 'Failed to save reminder');
    }
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) {
      return;
    }
    try {
      console.log('[ReminderList] Deleting reminder:', id);
      await api.reminders.delete(id);
      console.log('[ReminderList] Reminder deleted successfully');
      toast.success('Reminder deleted successfully');
      fetchReminders();
      // Notify parent component to refresh stats
      if (onReminderChange) {
        console.log('[ReminderList] Invoking onReminderChange callback after delete');
        onReminderChange();
      }
    } catch (err) {
      console.error('[ReminderList] Failed to delete reminder:', err);
      toast.error('Failed to delete reminder');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      console.log('[ReminderList] Updating reminder status:', id, 'to', status);
      await api.reminders.updateStatus(id, status);
      console.log('[ReminderList] Reminder status updated successfully');
      toast.success(`Reminder marked as ${status.toLowerCase()}`);
      fetchReminders();
      // Notify parent component to refresh stats
      if (onReminderChange) {
        console.log('[ReminderList] Invoking onReminderChange callback after status change');
        onReminderChange();
      }
    } catch (err) {
      console.error('[ReminderList] Failed to update status:', err);
      toast.error('Failed to update status');
    }
  };

  const filteredReminders = reminders.filter(reminder =>
    reminder.medicineName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count stats
  const stats = {
    total: reminders.length,
    active: reminders.filter(r => r.status === 'Active').length,
    overdue: reminders.filter(r => r.isOverdue).length
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Medicine Reminders</h2>
          <p className="text-gray-500">
            {stats.active} active, {stats.overdue} overdue, {reminders.length} total
          </p>
        </div>
        <button
          onClick={() => {
            setEditingReminder(null);
            setShowAddForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Reminder
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {['Active', 'Completed', 'All'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === filterOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption}
              {filterOption === 'Active' && ` (${stats.active})`}
              {filterOption === 'Completed' && ` (${stats.total - stats.active})`}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicines..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {editingReminder ? 'Edit Reminder' : 'Add New Reminder'}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingReminder(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>
            <AddReminderForm
              onSubmit={handleAddReminder}
              onCancel={() => {
                setShowAddForm(false);
                setEditingReminder(null);
              }}
              initialData={editingReminder}
            />
          </div>
        </div>
      )}

      {/* Reminders Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchReminders}
            className="mt-2 text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <p className="text-gray-500">
            {filter !== 'All'
              ? `No ${filter.toLowerCase()} reminders found.`
              : 'No reminders yet. Add your first medicine reminder!'}
          </p>
          {filter !== 'All' && (
            <button
              onClick={() => setFilter('All')}
              className="mt-2 text-blue-600 hover:underline"
            >
              Show all reminders
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReminders.map(reminder => (
            <ReminderCard
              key={reminder._id}
              reminder={reminder}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReminderList;
