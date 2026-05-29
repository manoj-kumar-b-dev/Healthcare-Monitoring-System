import React, { useState } from 'react';
import { PhoneCall, AlertTriangle, X, ShieldAlert, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../services/api';
import useGeolocation from '../../hooks/useGeolocation';

/**
 * EmergencyButton
 *
 * OPTIMIZATIONS applied:
 *  1. useGeolocation() pre-watches GPS position from component mount.
 *     At click time, location is already cached → 0ms GPS delay.
 *  2. API call fires immediately with cached location, no async GPS wait.
 *  3. Toast shown immediately when API returns 202 Accepted — user is not
 *     blocked waiting for email/SMS delivery confirmation.
 *  4. isSending spinner only covers the short API round-trip (< 1s),
 *     not the full notification delivery time.
 */
const EmergencyButton = ({ currentVitals }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending,   setIsSending]   = useState(false);

  // Pre-cached location — no GPS delay at click time
  const { getLocation, locationReady } = useGeolocation();

  const handleEmergencyAlert = async () => {
    setIsSending(true);

    try {
      // ── Get pre-cached location synchronously (0ms) ───────────────────────
      // Falls back to null if GPS isn't available — SOS still fires without it.
      const locationObj = getLocation();

      if (!locationObj) {
        console.warn('[EmergencyButton] Location not yet cached — sending without GPS coords.');
      }

      const alertData = {
        emergencyType: 'Critical Health Alert',
        vitals:        currentVitals,
        location:      locationObj,
      };

      console.log('[EmergencyButton] 🚨 Sending SOS with location:', locationObj);

      // ── API call — backend responds with 202 Accepted immediately ─────────
      const response = await api.alerts.triggerEmergency(alertData);

      if (response.data.success) {
        // Show confirmation toast immediately — emails/SMS fire in background
        toast.error(
          `🚨 Emergency Alert Sent! Notifying ${response.data.contacts} contact(s).`,
          { autoClose: 6000, theme: 'colored' }
        );
      } else {
        throw new Error(response.data.message || 'Failed to send alert');
      }

    } catch (error) {
      console.error('[EmergencyButton] SOS Error:', error);

      const msg = error.response?.data?.message || error.message || 'Unknown error';

      if (error.response?.status === 400 && msg.includes('contacts')) {
        // Specific message for no-contacts case
        toast.error('⚠️ No emergency contacts configured. Please add contacts in your profile.', {
          autoClose: 8000,
          theme: 'colored',
        });
      } else {
        toast.error(`Failed to send emergency alert: ${msg}`, { theme: 'colored' });
      }
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
        id="emergency-sos-btn"
        className="group relative flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-lg text-white overflow-hidden transition-all duration-300
          bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700
          shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0"
      >
        {/* Shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        <ShieldAlert className="w-6 h-6 relative z-10 animate-pulse" />
        <span className="relative z-10 tracking-wide">EMERGENCY ALERT</span>
        {/* Location ready indicator */}
        {locationReady && (
          <span className="absolute top-1 right-2 flex items-center gap-0.5 text-[10px] text-white/70 z-10">
            <MapPin className="w-2.5 h-2.5" />
            GPS
          </span>
        )}
      </button>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => !isSending && setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors"
              aria-label="Close modal"
              id="emergency-modal-close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-24 h-24 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mb-6 shadow-lg shadow-red-100">
                <AlertTriangle className="w-12 h-12 text-red-500 animate-pulse" />
              </div>

              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Confirm Emergency</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-2 max-w-xs">
                This will <strong className="text-slate-700">immediately notify</strong> all your
                emergency contacts with your current location and vital signs.
              </p>

              {/* Location status */}
              <div className={`flex items-center gap-1.5 text-xs mb-6 px-3 py-1.5 rounded-full ${
                locationReady
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <MapPin className="w-3 h-3" />
                {locationReady ? 'GPS location ready' : 'Acquiring GPS…'}
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSending}
                  id="emergency-cancel-btn"
                  className="flex-1 py-3 px-4 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmergencyAlert}
                  disabled={isSending}
                  id="emergency-confirm-btn"
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-red-200 transition-all"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Sending…</span>
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
