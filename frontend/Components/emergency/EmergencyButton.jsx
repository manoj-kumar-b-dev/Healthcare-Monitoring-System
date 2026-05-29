import React, { useState } from 'react';
import { PhoneCall, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../services/api';

const EmergencyButton = ({ currentVitals }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleEmergencyAlert = async () => {
    setIsSending(true);
    try {
      let locationObj = null;
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        locationObj = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      } catch (locErr) {
        console.warn('Could not retrieve location', locErr);
      }

      const alertData = { 
        emergencyType: 'Critical Health Alert',
        vitals: currentVitals, 
        location: locationObj 
      };
      
      console.log('SENDING EMERGENCY ALERT TO CONTACTS', alertData);

      const response = await api.alerts.triggerEmergency(alertData);

      if (response.data.success) {
        toast.error('Emergency Alert Sent Successfully!', { icon: '🚨', autoClose: 5000, theme: 'colored' });
      } else {
        throw new Error(response.data.message || 'Failed to send alert');
      }
    } catch (error) {
      console.error('Emergency Alert Error:', error);
      toast.error('Failed to send emergency alert: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    } finally {
      setIsSending(false);
      setIsModalOpen(false);
    }
  };

  return (
    <>
      {/* Emergency Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        aria-label="Trigger Emergency Alert"
        className="group relative flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-lg text-white overflow-hidden transition-all duration-300
          bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700
          shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0"
      >
        {/* Shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        <ShieldAlert className="w-6 h-6 relative z-10 animate-pulse" />
        <span className="relative z-10 tracking-wide">EMERGENCY ALERT</span>
      </button>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => !isSending && setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-24 h-24 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mb-6 shadow-lg shadow-red-100">
                <AlertTriangle className="w-12 h-12 text-red-500 animate-pulse" />
              </div>

              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Confirm Emergency</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs">
                This will <strong className="text-slate-700">immediately notify</strong> all your emergency contacts with your current location and vital signs.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSending}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmergencyAlert}
                  disabled={isSending}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-red-200 transition-all"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    'Confirm Alert'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyButton;
