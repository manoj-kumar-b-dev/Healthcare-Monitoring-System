import React, { useState, useEffect } from 'react';
import ReminderList from '../Components/reminders/ReminderList';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useSocket } from '../context/SocketContext';
import { showBrowserNotification, playNotificationSound, requestNotificationPermission } from '../utils/notifications';

const Reminders = () => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    suspended: 0,
    overdue: 0,
    dueToday: 0
  });
  const [todaysReminders, setTodaysReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    fetchDashboardData();

    // Request browser notification permission
    requestNotificationPermission();

    // Listen for real-time reminder notifications
    if (socket) {
      socket.on('reminder:triggered', (data) => {
        toast.info(`Medicine Reminder: ${data.message}`, {
          icon: '💊',
          autoClose: 10000
        });

        // Play sound alert
        playNotificationSound();

        // Show browser notification if permitted
        showBrowserNotification(`Time for ${data.medicineName}`, {
          body: `${data.dosage} at ${data.time}`,
          tag: `reminder-${data.reminderId}`
        });

        // Refresh today's reminders
        fetchDashboardData();
      });
    }

    return () => {
      if (socket) {
        socket.off('reminder:triggered');
      }
    };
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('[Reminders] Fetching dashboard data (stats + todays reminders)...');
      const [statsRes, todayRes] = await Promise.all([
        api.reminders.getStats(),
        api.reminders.getToday()
      ]);
      
      const newStats = statsRes.data.data;
      setStats(newStats);
      setTodaysReminders(todayRes.data.data || []);
      
      console.log('[Reminders] Dashboard data updated:', newStats);
    } catch (error) {
      console.error('[Reminders] Error fetching reminder data:', error);
      toast.error('Failed to refresh reminder data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Medicine Reminders</h1>
        <p className="text-gray-500 mt-1">
          Never miss a dose - manage your medication schedule
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Total Reminders</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">Suspended</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.suspended}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">Due Today</p>
          <p className="text-2xl font-bold text-purple-600">{stats.dueToday}</p>
        </div>
      </div>

      {/* Today's Medicines Section */}
      {todaysReminders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Today's Medicines
          </h2>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="space-y-3">
              {todaysReminders.map(reminder => (
                <div
                  key={reminder._id}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      {reminder.medicineName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{reminder.medicineName}</p>
                      <p className="text-sm text-gray-500">{reminder.dosage}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-600">
                      {reminder.time.map(formatTime).join(', ')}
                    </p>
                    <p className="text-xs text-gray-500">{reminder.frequency}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Reminder List */}
      <ReminderList onReminderChange={fetchDashboardData} />
    </div>
  );
};

export default Reminders;
