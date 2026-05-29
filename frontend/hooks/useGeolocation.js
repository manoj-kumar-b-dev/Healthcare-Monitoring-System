import { useEffect, useRef, useState } from 'react';

/**
 * useGeolocation
 *
 * Pre-fetches and continuously watches the user's GPS position in the background.
 * Location is stored in a ref (not state) to avoid re-renders on every GPS update.
 *
 * WHY: Previously, EmergencyButton fetched location AFTER the SOS button was clicked,
 * adding 2–5 seconds of GPS acquisition time before the API call could even start.
 * By watching position proactively on mount, getLocation() returns the cached
 * coordinates synchronously at click time — 0ms delay.
 *
 * @returns {{ getLocation: () => {latitude, longitude}|null, locationReady: boolean }}
 */
const useGeolocation = () => {
  const locationRef  = useRef(null);  // cached coordinates — ref avoids re-renders
  const watchIdRef   = useRef(null);  // geolocation watcher ID for cleanup
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('[useGeolocation] Geolocation not supported by browser.');
      return;
    }

    const onSuccess = (position) => {
      locationRef.current = {
        latitude:  position.coords.latitude,
        longitude: position.coords.longitude,
      };
      if (!locationReady) setLocationReady(true);
    };

    const onError = (err) => {
      // Non-fatal — SOS can still fire without location
      console.warn('[useGeolocation] Position error:', err.message);
    };

    const options = {
      enableHighAccuracy: true,
      timeout:            8000,
      maximumAge:         30_000, // accept a position up to 30s old for speed
    };

    // One-shot initial fetch to populate the cache quickly
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);

    // Then watch for updates in the background (e.g. user is moving)
    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      ...options,
      maximumAge: 10_000, // fresher updates for the watcher
    });

    // Cleanup watcher on component unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []); // only run once on mount

  /**
   * Returns the most recently cached {latitude, longitude} or null.
   * Synchronous — no GPS delay at call time.
   */
  const getLocation = () => locationRef.current;

  return { getLocation, locationReady };
};

export default useGeolocation;
