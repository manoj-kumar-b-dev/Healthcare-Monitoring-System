import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Share2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

const LocationDisplay = () => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          if (data.display_name) setAddress(data.display_name);
        } catch (err) {
          console.warn('Reverse geocoding failed', err);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to retrieve location');
        setLoading(false);
      },
      {
        enableHighAccuracy: true, // Request GPS-level accuracy
        timeout: 10000,           // Max wait time (ms)
        maximumAge: 0             // No cached position
      }
    );
  };

  useEffect(() => { fetchLocation(); }, []);

  const handleShare = () => {
    if (!location) return;
    const mapUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

    if (navigator.share) {
      navigator.share({ title: 'Emergency Location', text: 'My current location:', url: mapUrl }).catch(console.error);
    } else {
      navigator.clipboard.writeText(mapUrl);
      toast.success('Location link copied to clipboard!');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm">Live Location</h3>
        </div>
        <button
          onClick={fetchLocation}
          aria-label="Refresh location"
          className="p-1.5 text-slate-400 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {error ? (
          <div className="flex items-start gap-3 text-sm bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Location Unavailable</p>
              <p className="text-xs mt-0.5 opacity-80">{error}. Please enable location services.</p>
            </div>
          </div>
        ) : loading && !location ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-sm font-medium">Acquiring GPS coordinates...</p>
          </div>
        ) : location ? (
          <div className="space-y-3">
            {/* Address */}
            <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">
                  {address || 'Address unavailable'}
                </p>
                <p className="text-xs text-slate-400 font-mono mt-1.5 bg-slate-200 px-2 py-0.5 rounded inline-block">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 hover:border-blue-300 rounded-xl text-sm font-semibold hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-all"
            >
              <Share2 className="w-4 h-4" />
              Share Location
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LocationDisplay;
