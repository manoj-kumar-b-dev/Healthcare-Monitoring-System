import React from 'react';

const ReminderCard = ({ reminder, onEdit, onDelete, onStatusChange }) => {
  const { _id, medicineName, dosage, frequency, time, startDate, endDate, notes, status, nextNotification, isOverdue } = reminder;

  // Format dates
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format next notification time
  const formatNextNotification = (date) => {
    if (!date) return 'No upcoming';
    const now = new Date();
    const diff = new Date(date) - now;

    if (diff < 0) return 'Overdue';
    if (diff < 3600000) { // less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `In ${minutes} min`;
    }

    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate days remaining
  const getDaysRemaining = () => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className={`bg-white rounded-xl shadow-md p-5 border-l-4 transition-all ${isOverdue ? 'border-red-500' : 'border-blue-500'} hover:shadow-lg`}>
      {/* Header: Medicine name and status */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {medicineName}
          </h3>
          <p className="text-sm text-gray-500">{dosage}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>

      {/* Frequency and Timing */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-gray-600">{frequency}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {time.map((t, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Next Notification */}
      <div className="mb-3 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Next dose</span>
          <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
            {formatNextNotification(nextNotification)}
          </span>
        </div>
      </div>

      {/* Date Range */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
        <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
        <span className={daysRemaining < 7 ? 'text-orange-500 font-medium' : ''}>
          {daysRemaining > 0 ? `${daysRemaining} days left` : 'Ended'}
        </span>
      </div>

      {/* Notes */}
      {notes && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 italic">"{notes}"</p>
        </div>
      )}

      {/* Overdue Warning */}
      {isOverdue && status === 'Active' && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">This dose is overdue!</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={() => onEdit(reminder)}
          className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onStatusChange(_id, 'Completed')}
          className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
        >
          Completed
        </button>
        <button
          onClick={() => onDelete(_id)}
          className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default ReminderCard;
