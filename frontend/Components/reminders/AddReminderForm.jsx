import React, { useState } from 'react';

const AddReminderForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    medicineName: initialData?.medicineName || '',
    dosage: initialData?.dosage || '',
    frequency: initialData?.frequency || 'Once Daily',
    time: initialData?.time || ['08:00'],
    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'Active'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const frequencies = [
    'Once Daily',
    'Twice Daily',
    'Three Times Daily',
    'Four Times Daily',
    'Weekly',
    'As Needed'
  ];

  // Generate time options in 30-minute intervals
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      timeOptions.push(timeStr);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleTimeChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setFormData(prev => ({
      ...prev,
      time: selectedOptions
    }));
    if (errors.time) {
      setErrors(prev => ({
        ...prev,
        time: null
      }));
    }
  };

  const addTimeField = () => {
    setFormData(prev => ({
      ...prev,
      time: [...prev.time, '08:00']
    }));
  };

  const removeTimeField = (index) => {
    setFormData(prev => ({
      ...prev,
      time: prev.time.filter((_, i) => i !== index)
    }));
  };

  const updateTimeField = (index, value) => {
    setFormData(prev => {
      const newTime = [...prev.time];
      newTime[index] = value;
      return { ...prev, time: newTime };
    });
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.medicineName.trim()) {
      newErrors.medicineName = 'Medicine name is required';
    }

    if (!formData.dosage.trim()) {
      newErrors.dosage = 'Dosage is required';
    } else if (!/^[\d\.]+\s*(mg|g|ml|tablet|capsule|pill)$/i.test(formData.dosage)) {
      newErrors.dosage = 'Please enter valid dosage (e.g., 500mg, 1 tablet)';
    }

    if (!formData.frequency) {
      newErrors.frequency = 'Frequency is required';
    }

    if (!formData.time || formData.time.length === 0) {
      newErrors.time = 'At least one time is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate)
      };

      await onSubmit(submitData);
      // Reset form on success (parent handles closing)
      setFormData({
        medicineName: '',
        dosage: '',
        frequency: 'Once Daily',
        time: ['08:00'],
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: '',
        status: 'Active'
      });
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Medicine Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Medicine Name *
        </label>
        <input
          type="text"
          name="medicineName"
          value={formData.medicineName}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.medicineName ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="e.g., Paracetamol"
        />
        {errors.medicineName && (
          <p className="mt-1 text-sm text-red-600">{errors.medicineName}</p>
        )}
      </div>

      {/* Dosage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dosage *
        </label>
        <input
          type="text"
          name="dosage"
          value={formData.dosage}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.dosage ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="e.g., 500mg or 1 tablet"
        />
        {errors.dosage && (
          <p className="mt-1 text-sm text-red-600">{errors.dosage}</p>
        )}
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Frequency *
        </label>
        <select
          name="frequency"
          value={formData.frequency}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.frequency ? 'border-red-500' : 'border-gray-300'}`}
        >
          {frequencies.map(freq => (
            <option key={freq} value={freq}>{freq}</option>
          ))}
        </select>
        {errors.frequency && (
          <p className="mt-1 text-sm text-red-600">{errors.frequency}</p>
        )}
      </div>

      {/* Reminder Times */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reminder Times *
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.time.map((t, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <select
                value={t}
                onChange={(e) => updateTimeField(idx, e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {timeOptions.map(timeOpt => (
                  <option key={timeOpt} value={timeOpt}>{timeOpt}</option>
                ))}
              </select>
              {formData.time.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTimeField(idx)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addTimeField}
            className="px-3 py-2 text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50"
          >
            + Add Time
          </button>
        </div>
        {errors.time && (
          <p className="mt-1 text-sm text-red-600">{errors.time}</p>
        )}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date *
          </label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.startDate ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date *
          </label>
          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.endDate ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (Optional)
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          placeholder="Any additional instructions..."
        />
        <p className="mt-1 text-xs text-gray-500">
          {formData.notes.length}/500 characters
        </p>
      </div>

      {/* Status (only shown in edit mode) */}
      {initialData && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : (initialData ? 'Update Reminder' : 'Add Reminder')}
        </button>
      </div>
    </form>
  );
};

export default AddReminderForm;
