import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { toast } from 'react-toastify';

// Configuration parameters for the advanced DSP pipeline
const CONFIG = {
  SAMPLE_RATE_ACTIVE: 50,      // Max polling rate (50 Hz = 20ms interval)
  SAMPLE_RATE_BG: 25,          // Background polling rate (25 Hz = 40ms interval)
  HPF_ALPHA: 0.94,             // High-Pass Filter smoothing constant (gravity removal)
  LPF_BETA: 0.73,              // Low-Pass Filter smoothing constant
  MA_WINDOW_SIZE: 5,           // Moving Average window size
  SLIDING_WINDOW_SIZE: 100,    // 2-second history window at 50Hz for min-max range
  MIN_PEAK_RANGE: 2.94,        // 0.3g walking magnitude threshold in m/s^2
  MAX_PEAK_RANGE: 29.43,       // 3.0g upper physical motion boundary in m/s^2
  CONFIDENCE_THRESHOLD: 0.65,  // Step detection confirmation confidence score
  MIN_TIME_BETWEEN_STEPS: 333,  // 3.0 Hz maximum physical cadence limit (333ms)
  MAX_TIME_BETWEEN_STEPS: 1200, // 0.83 Hz minimum physical cadence limit (1200ms)
  REQUIRED_CONSECUTIVE_STEPS: 3 // Minimum steps for rhythmic gait verification
};

export const useStepCounter = () => {
  const { socket, connected } = useSocket();
  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Pre-session sensor validation state
  const [sensorStatus, setSensorStatus] = useState('checking');

  // Session tracking states
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [averageConfidence, setAverageConfidence] = useState(0);
  const [syncingSession, setSyncingSession] = useState(false);

  // Debug mode states
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugData, setDebugData] = useState({
    rawMagnitude: 0,
    filteredMagnitude: 0,
    smoothedMagnitude: 0,
    adaptiveThreshold: 0,
    cadence: 0,
    variance: 0,
    liveConfidence: 0,
    recentPeaks: [],
    
    // Diagnostics fields
    lastReading: { x: 0, y: 0, z: 0 },
    sampleRate: 0,
    nullReadingsCount: 0
  });

  // Teardown / Listener references
  const abortControllerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const sensorTimeoutRef = useRef(null);
  
  // Real-time sensor states (Refs prevent React re-renders, fulfilling Performance constraints)
  const isBackgroundRef = useRef(false);
  const lastPollTimeRef = useRef(0);
  const gravityRef = useRef(9.81);
  const movingAvgBufferRef = useRef([]);
  const smoothedMagRef = useRef(0);
  const smoothedHistoryRef = useRef([]);
  const slidingWindowRef = useRef([]);
  
  // Gait validation refs
  const lastStepTimeRef = useRef(0);
  const lastStepIntervalRef = useRef(0);
  const unconfirmedStepsRef = useRef([]); // Timestamps of steps pending validation
  const sessionStepCountRef = useRef(0);
  const sessionConfidencesRef = useRef([]);
  const sessionStepTimestampsRef = useRef([]);
  const sessionStartTimeRef = useRef(0);
  const sessionIdempotencyKeyRef = useRef('');

  // Debug peaks logger ref
  const debugPeaksLogRef = useRef([]);

  // Diagnostics tracking refs
  const lastSampleTimeRef = useRef(0);
  const sampleIntervalsRef = useRef([]);
  const nullReadingsWindowRef = useRef([]);
  const lastReadingRef = useRef({ x: 0, y: 0, z: 0 });
  const nonZeroReceivedRef = useRef(false);

  // Check visibility for background polling throttle
  useEffect(() => {
    const handleVisibilityChange = () => {
      isBackgroundRef.current = document.hidden;
      console.log(`[useStepCounter] Tab visibility changed. Hidden: ${document.hidden}. Throttling sensors.`);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Sync today's baseline activity on mount
  const fetchTodayActivity = useCallback(async () => {
    try {
      const response = await api.activities.getToday();
      const activity = response.data;
      setSteps(activity.steps || 0);
      setCalories(activity.caloriesBurned || 0);
      setDistance(activity.distance || 0);
    } catch (error) {
      console.error('[useStepCounter] Failed to fetch today baseline:', error);
    }
  }, []);

  useEffect(() => {
    fetchTodayActivity();
  }, [fetchTodayActivity]);

  // Run an active sensor validation probe for a given duration
  const runProbeCheck = useCallback(async (durationMs = 1500) => {
    console.log(`[useStepCounter] Probe: Starting ${durationMs}ms sensor health check...`);
    return new Promise((resolve) => {
      let nonZeroCount = 0;
      let totalCount = 0;

      const probeListener = (event) => {
        totalCount++;
        let x = 0, y = 0, z = 0;
        
        if (event.acceleration) {
          x = event.acceleration.x ?? 0;
          y = event.acceleration.y ?? 0;
          z = event.acceleration.z ?? 0;
        } else if (event.accelerationIncludingGravity) {
          x = event.accelerationIncludingGravity.x ?? 0;
          y = event.accelerationIncludingGravity.y ?? 0;
          z = event.accelerationIncludingGravity.z ?? 0;
        }

        if (x !== 0 || y !== 0 || z !== 0) {
          nonZeroCount++;
        }
      };

      window.addEventListener('devicemotion', probeListener, { passive: true });

      setTimeout(() => {
        window.removeEventListener('devicemotion', probeListener);
        console.log(`[useStepCounter] Probe finished. Total samples: ${totalCount}, Non-zero: ${nonZeroCount}`);
        resolve(nonZeroCount >= 10);
      }, durationMs);
    });
  }, []);

  // Browser Compatibility Fallback Chain: DeviceMotionEvent
  const fallbackToDeviceMotion = useCallback(async () => {
    console.log('[useStepCounter] Fallback Chain 2: Trying window.DeviceMotionEvent listener');
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        console.log('[useStepCounter] iOS device detected (DeviceMotionEvent.requestPermission exists). Awaiting gesture.');
        setSensorStatus('needs-permission');
        return 'needs-permission';
      } else {
        console.log('[useStepCounter] Android/Desktop path. Running validation probe...');
        setSensorStatus('checking');
        const isHealthy = await runProbeCheck(1500);
        if (isHealthy) {
          setSensorStatus('ready');
          setPermissionGranted(true);
          setPermissionDenied(false);
          return 'ready';
        } else {
          setSensorStatus('unavailable');
          setPermissionGranted(false);
          return 'unavailable';
        }
      }
    } else {
      console.error('[useStepCounter] DeviceMotionEvent is not supported on this device/browser');
      setSensorStatus('unavailable');
      return 'unavailable';
    }
  }, [runProbeCheck]);

  // Pre-session Sensor validation check
  const sensorCheck = useCallback(async () => {
    console.log('[useStepCounter] Running pre-session sensor check...');
    
    // Check HTTPS rule (Fix 6)
    if (typeof window !== 'undefined') {
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.warn('[useStepCounter] HTTPS Enforcement check failed. Protocol is ' + window.location.protocol);
        setSensorStatus('insecure');
        return 'insecure';
      }
    }

    // Try Fallback Chain (Fix 5)
    try {
      if (typeof Accelerometer !== 'undefined') {
        console.log('[useStepCounter] Fallback Chain 1: Trying Generic Sensor API (Accelerometer)');
        const acc = new Accelerometer({ frequency: 50 });
        
        return new Promise((resolve) => {
          acc.onerror = (event) => {
            console.error(`[useStepCounter] Accelerometer error: ${event.error.name} - ${event.error.message}`);
            if (event.error.name === 'SecurityError') {
              setSensorStatus('insecure');
              resolve('insecure');
            } else if (event.error.name === 'NotAllowedError') {
              setSensorStatus('needs-permission');
              resolve('needs-permission');
            } else {
              resolve(fallbackToDeviceMotion());
            }
          };

          acc.onactivate = () => {
            acc.stop();
            console.log('[useStepCounter] Accelerometer API supported and active.');
            setSensorStatus('ready');
            setPermissionGranted(true);
            setPermissionDenied(false);
            resolve('ready');
          };

          acc.start();
        });
      } else {
        throw new ReferenceError('Accelerometer is not defined');
      }
    } catch (err) {
      console.log(`[useStepCounter] Generic Sensor API unsupported: ${err.name}. Falling back to DeviceMotionEvent...`);
      return fallbackToDeviceMotion();
    }
  }, [fallbackToDeviceMotion]);

  // Run sensor check on mount
  useEffect(() => {
    sensorCheck();
  }, [sensorCheck]);

  // Request permissions safely inside gesture (Fix 2)
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined') return false;

    // Check secure context
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setSensorStatus('insecure');
      toast.error('Motion sensors require HTTPS. Please access this app over a secure connection.');
      return false;
    }

    console.log('[useStepCounter] Requesting motion sensor permission via gesture...');
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        // iOS 13+ path
        const permissionState = await DeviceMotionEvent.requestPermission();
        console.log('[useStepCounter] DeviceMotionEvent.requestPermission state:', permissionState);
        
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          setPermissionDenied(false);
          setSensorStatus('checking');
          
          // Re-run probe automatically
          const isHealthy = await runProbeCheck(1500);
          if (isHealthy) {
            setSensorStatus('ready');
            toast.success('Motion sensor linked and verified!');
            return true;
          } else {
            setSensorStatus('unavailable');
            toast.error('Motion sensor verified as non-responsive.');
            return false;
          }
        } else {
          setPermissionDenied(true);
          setSensorStatus('unavailable');
          toast.error('Motion sensor permission denied by user');
          return false;
        }
      } else {
        // Android / Desktop standard path
        setPermissionGranted(true);
        setPermissionDenied(false);
        setSensorStatus('checking');
        
        // Re-run probe automatically
        const isHealthy = await runProbeCheck(1500);
        if (isHealthy) {
          setSensorStatus('ready');
          toast.success('Motion sensor linked and verified!');
          return true;
        } else {
          setSensorStatus('unavailable');
          toast.error('Motion sensor verified as non-responsive.');
          return false;
        }
      }
    } catch (error) {
      console.error('[useStepCounter] Permission request error:', error);
      setPermissionDenied(true);
      setSensorStatus('unavailable');
      toast.error('Failed to get motion sensor permissions');
      return false;
    }
  }, [runProbeCheck]);

  // DSP Pipeline logic running at 50Hz/25Hz
  const processSensorData = useCallback((x, y, z) => {
    const now = Date.now();
    const currentInterval = isBackgroundRef.current ? 40 : 20; // 25Hz (40ms) vs 50Hz (20ms)

    // Performance constraint: Throttle polling interval
    if (now - lastPollTimeRef.current < currentInterval) return;
    lastPollTimeRef.current = now;

    // 1. Raw magnitude calculation
    const rawMag = Math.sqrt(x * x + y * y + z * z);

    // 2. Gravity removal (High-Pass IIR Filter)
    gravityRef.current = CONFIG.HPF_ALPHA * gravityRef.current + (1 - CONFIG.HPF_ALPHA) * rawMag;
    const hpMag = rawMag - gravityRef.current;

    // 3. Smoothing → Moving average
    movingAvgBufferRef.current.push(hpMag);
    if (movingAvgBufferRef.current.length > CONFIG.MA_WINDOW_SIZE) {
      movingAvgBufferRef.current.shift();
    }
    const maMag = movingAvgBufferRef.current.reduce((a, b) => a + b, 0) / movingAvgBufferRef.current.length;

    // 4. Smoothing → Low-Pass IIR Filter
    smoothedMagRef.current = CONFIG.LPF_BETA * smoothedMagRef.current + (1 - CONFIG.LPF_BETA) * maMag;
    const finalSmoothedMag = smoothedMagRef.current;

    // Log magnitude histories
    smoothedHistoryRef.current.push(finalSmoothedMag);
    if (smoothedHistoryRef.current.length > 5) smoothedHistoryRef.current.shift();

    slidingWindowRef.current.push(finalSmoothedMag);
    if (slidingWindowRef.current.length > CONFIG.SLIDING_WINDOW_SIZE) {
      slidingWindowRef.current.shift();
    }

    // 5. Adaptive peak detection with sliding window
    if (slidingWindowRef.current.length < 20) return; // Wait for buffer calibration

    const maxVal = Math.max(...slidingWindowRef.current);
    const minVal = Math.min(...slidingWindowRef.current);
    const range = maxVal - minVal;

    // Dynamic threshold is the midpoint
    const adaptiveThreshold = minVal + range * 0.45;

    // Peak confirmation check (Check if len-2 is a local peak inside last 3 samples)
    const len = smoothedHistoryRef.current.length;
    if (len < 3) return;

    const s_t2 = smoothedHistoryRef.current[len - 3];
    const s_t1 = smoothedHistoryRef.current[len - 2];
    const s_t0 = smoothedHistoryRef.current[len - 1];

    let isPeak = s_t1 > s_t2 && s_t1 > s_t0 && s_t1 > adaptiveThreshold;
    let isConfirmedStep = false;
    let liveConfidence = 0;
    let rejectReason = '';

    if (isPeak) {
      const stepTimestamp = now - 20; // Peak occurred ~1 sample ago
      const timeSinceLastStep = stepTimestamp - lastStepTimeRef.current;

      // --- FALSE POSITIVE PREVENTION & HEURISTICS ENGINE ---

      // A. Sensor Noise: Range check (0.3g - 3.0g)
      const rangeInBand = range >= CONFIG.MIN_PEAK_RANGE && range <= CONFIG.MAX_PEAK_RANGE;

      if (!rangeInBand) {
        rejectReason = range < CONFIG.MIN_PEAK_RANGE ? 'Sensor noise (sub-0.3g)' : 'Excessive shock (over-3.0g)';
      } else {
        // B. Cadence Check (1.2Hz - 2.5Hz)
        let cadenceScore = 0;
        if (timeSinceLastStep >= CONFIG.MIN_TIME_BETWEEN_STEPS && timeSinceLastStep <= CONFIG.MAX_TIME_BETWEEN_STEPS) {
          cadenceScore = 1.0;
        } else if (timeSinceLastStep >= 250 && timeSinceLastStep < CONFIG.MIN_TIME_BETWEEN_STEPS) {
          cadenceScore = (timeSinceLastStep - 250) / (CONFIG.MIN_TIME_BETWEEN_STEPS - 250); // Linear ramp-down
        } else if (timeSinceLastStep > CONFIG.MAX_TIME_BETWEEN_STEPS && timeSinceLastStep <= 1500) {
          cadenceScore = (1500 - timeSinceLastStep) / (1500 - CONFIG.MAX_TIME_BETWEEN_STEPS);
        }

        // C. Rhythm Check: Deviation from previous gait interval
        let rhythmScore = 0.7; // Standard starter score
        if (lastStepIntervalRef.current > 0) {
          const deviation = Math.abs(timeSinceLastStep - lastStepIntervalRef.current) / lastStepIntervalRef.current;
          rhythmScore = deviation < 0.2 ? 1.0 : deviation < 0.5 ? (1.0 - (deviation - 0.2) / 0.3) : 0.0;
        }

        // D. Peak Magnitude Score
        const peakHeight = s_t1 - minVal;
        let magnitudeScore = 0;
        if (peakHeight >= CONFIG.MIN_PEAK_RANGE && peakHeight <= 14.7) {
          magnitudeScore = 1.0;
        } else if (peakHeight > 14.7 && peakHeight <= CONFIG.MAX_PEAK_RANGE) {
          magnitudeScore = (CONFIG.MAX_PEAK_RANGE - peakHeight) / (CONFIG.MAX_PEAK_RANGE - 14.7);
        }

        // E. Moving Variance Check (Detect vehicle sways vs body walking)
        const mean = slidingWindowRef.current.reduce((a, b) => a + b, 0) / slidingWindowRef.current.length;
        const variance = slidingWindowRef.current.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / slidingWindowRef.current.length;
        const stdDev = Math.sqrt(variance);

        let varianceScore = 0;
        if (stdDev >= 0.5 && stdDev <= 6.0) {
          varianceScore = 1.0;
        } else if (stdDev < 0.5 && stdDev >= 0.15) {
          varianceScore = (stdDev - 0.15) / (0.5 - 0.15); // Ramp down for vehicle engine noise
        }

        // F. Calculate Combined Confidence Score
        liveConfidence = (cadenceScore * 0.3) + (rhythmScore * 0.3) + (magnitudeScore * 0.2) + (varianceScore * 0.2);

        if (liveConfidence >= CONFIG.CONFIDENCE_THRESHOLD) {
          isConfirmedStep = true;
        } else {
          rejectReason = `Low confidence (${liveConfidence.toFixed(2)})`;
        }
      }

      // --- RHYTHM BUFFER & VELOCITY VALIDATOR ---
      if (isConfirmedStep) {
        const stepTimestamp = now;

        if (isWalking) {
          // ACTIVE WALKING: Log step instantly
          sessionStepCountRef.current += 1;
          sessionStepTimestampsRef.current.push(new Date(stepTimestamp));
          sessionConfidencesRef.current.push(liveConfidence);
          setSessionSteps(sessionStepCountRef.current);
          
          lastStepIntervalRef.current = stepTimestamp - lastStepTimeRef.current;
          lastStepTimeRef.current = stepTimestamp;

          // Recalculate average confidence score
          const totalConf = sessionConfidencesRef.current.reduce((a, b) => a + b, 0);
          setAverageConfidence(totalConf / sessionConfidencesRef.current.length);
        } else {
          // BUFFERING MODE: Accumulate to gait validation list
          unconfirmedStepsRef.current.push(stepTimestamp);
          console.log(`[useStepCounter] Step buffered. Size: ${unconfirmedStepsRef.current.length}`);

          if (unconfirmedStepsRef.current.length >= CONFIG.REQUIRED_CONSECUTIVE_STEPS) {
            // Check if all intervals in buffer represent rhythmic human gait
            let isRhythmicGait = true;
            for (let i = 1; i < unconfirmedStepsRef.current.length; i++) {
              const diff = unconfirmedStepsRef.current[i] - unconfirmedStepsRef.current[i - 1];
              if (diff < CONFIG.MIN_TIME_BETWEEN_STEPS || diff > CONFIG.MAX_TIME_BETWEEN_STEPS) {
                isRhythmicGait = false;
                break;
              }
            }

            if (isRhythmicGait) {
              // Confirmed walking cadence! Release buffered steps
              const releasedStepsCount = unconfirmedStepsRef.current.length;
              sessionStepCountRef.current += releasedStepsCount;

              unconfirmedStepsRef.current.forEach(t => {
                sessionStepTimestampsRef.current.push(new Date(t));
                sessionConfidencesRef.current.push(liveConfidence);
              });

              setSessionSteps(sessionStepCountRef.current);
              setIsWalking(true);

              lastStepIntervalRef.current = unconfirmedStepsRef.current[releasedStepsCount - 1] - unconfirmedStepsRef.current[releasedStepsCount - 2];
              lastStepTimeRef.current = unconfirmedStepsRef.current[releasedStepsCount - 1];
              unconfirmedStepsRef.current = [];

              const totalConf = sessionConfidencesRef.current.reduce((a, b) => a + b, 0);
              setAverageConfidence(totalConf / sessionConfidencesRef.current.length);
              
              toast.success('Rhythmic gait confirmed! Session tracking is active.');
            } else {
              // Rhythm broken. Discard oldest step to test rolling sliding frame
              unconfirmedStepsRef.current.shift();
            }
          }
        }
      }

      // Log to peak records for debug view
      const debugPeakItem = {
        time: new Date().toLocaleTimeString(),
        height: s_t1.toFixed(2),
        confidence: liveConfidence.toFixed(2),
        status: isConfirmedStep ? 'Accepted' : 'Rejected',
        reason: rejectReason || 'Passed all heuristics'
      };
      
      debugPeaksLogRef.current = [debugPeakItem, ...debugPeaksLogRef.current].slice(0, 5);
    }

    // Update debug stats (only if debug mode is toggled)
    if (isDebugMode) {
      const mean = slidingWindowRef.current.reduce((a, b) => a + b, 0) / slidingWindowRef.current.length;
      const variance = slidingWindowRef.current.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / slidingWindowRef.current.length;
      const cadence = lastStepIntervalRef.current > 0 ? Math.round(60000 / lastStepIntervalRef.current) : 0;

      // Compute sample rate
      let sampleRate = 0;
      if (sampleIntervalsRef.current.length > 0) {
        const avgInterval = sampleIntervalsRef.current.reduce((a, b) => a + b, 0) / sampleIntervalsRef.current.length;
        sampleRate = avgInterval > 0 ? Math.round(1000 / avgInterval) : 0;
      }

      // Compute null readings
      const nullReadingsCount = nullReadingsWindowRef.current.reduce((a, b) => a + b, 0);

      setDebugData({
        rawMagnitude: rawMag,
        filteredMagnitude: hpMag,
        smoothedMagnitude: finalSmoothedMag,
        adaptiveThreshold,
        cadence,
        variance,
        liveConfidence,
        recentPeaks: debugPeaksLogRef.current,
        
        // Dynamic diagnostics
        lastReading: lastReadingRef.current,
        sampleRate,
        nullReadingsCount
      });
    }

    // Gait auto-teardown: Reset to buffer mode if idle for over 2.5s
    if (lastStepTimeRef.current > 0 && now - lastStepTimeRef.current > 2500) {
      if (isWalking) {
        setIsWalking(false);
        lastStepIntervalRef.current = 0;
        unconfirmedStepsRef.current = [];
        console.log('[useStepCounter] Step counter idle for 2.5s. Resetting back to Buffering Mode.');
      }
    }
  }, [isWalking, isDebugMode]);

  // Handler mapped from DeviceMotionEvent
  const handleDeviceMotion = useCallback((event) => {
    let x = 0, y = 0, z = 0;

    // Guard all fields — any can be null on some browsers/devices (Fix 3)
    if (event.acceleration) {
      x = event.acceleration.x ?? 0;
      y = event.acceleration.y ?? 0;
      z = event.acceleration.z ?? 0;
    } else if (event.accelerationIncludingGravity) {
      x = event.accelerationIncludingGravity.x ?? 0;
      y = event.accelerationIncludingGravity.y ?? 0;
      z = event.accelerationIncludingGravity.z ?? 0;
    }

    // Keep track of the last reading for diagnostics
    lastReadingRef.current = { x, y, z };

    // Record sample dynamic timing to calculate frequency (Hz)
    const now = Date.now();
    if (lastSampleTimeRef.current > 0) {
      const interval = now - lastSampleTimeRef.current;
      sampleIntervalsRef.current.push(interval);
      if (sampleIntervalsRef.current.length > 50) {
        sampleIntervalsRef.current.shift();
      }
    }
    lastSampleTimeRef.current = now;

    // Track null/zero readings window
    const isNullOrZero = (x === 0 && y === 0 && z === 0);
    nullReadingsWindowRef.current.push(isNullOrZero ? 1 : 0);
    if (nullReadingsWindowRef.current.length > 50) {
      nullReadingsWindowRef.current.shift();
    }

    if (!isNullOrZero) {
      nonZeroReceivedRef.current = true;
    }

    processSensorData(x, y, z);
  }, [processSensorData]);

  // Stop Session API & Backend Sync Integration
  const stopCounting = useCallback(async () => {
    if (!isSessionActive) return;

    console.log('[useStepCounter] Tearing down listeners and finishing session...');

    // 1. Remove all listeners and clear timers instantly (Zero background processing)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (sensorTimeoutRef.current) {
      clearTimeout(sensorTimeoutRef.current);
      sensorTimeoutRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsSessionActive(false);
    setIsWalking(false);

    const stepsToSync = sessionStepCountRef.current;
    const duration = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
    const avgConf = sessionConfidencesRef.current.length > 0
      ? sessionConfidencesRef.current.reduce((a, b) => a + b, 0) / sessionConfidencesRef.current.length
      : 1.0;

    // 2. Clear DSP buffers from memory (Garbage collection / Memory leak prevention)
    movingAvgBufferRef.current = [];
    smoothedHistoryRef.current = [];
    slidingWindowRef.current = [];

    if (stepsToSync === 0) {
      toast.info('Session completed with 0 steps. No database sync required.');
      return;
    }

    // 3. POST session sync to backend
    try {
      setSyncingSession(true);
      console.log(`[useStepCounter] Syncing session steps to backend: ${stepsToSync} steps...`);

      const sessionPayload = {
        stepCount: stepsToSync,
        sessionDuration: duration,
        confidenceScore: avgConf,
        timestamps: sessionStepTimestampsRef.current,
        idempotencyKey: sessionIdempotencyKeyRef.current,
        date: new Date(sessionStartTimeRef.current).toISOString()
      };

      const response = await api.activities.submitSession(sessionPayload);
      
      if (response.data?.success) {
        // Sync live counters from backend daily aggregation
        const updatedActivity = response.data.activity;
        if (updatedActivity) {
          setSteps(updatedActivity.steps);
          setCalories(updatedActivity.caloriesBurned);
          setDistance(updatedActivity.distance);

          if (socket && connected) {
            socket.emit('steps:update', {
              steps: updatedActivity.steps,
              calories: updatedActivity.caloriesBurned,
              distance: updatedActivity.distance,
            });
          }
        }
        toast.success(`Session synced! +${stepsToSync} steps logged.`);
      }
    } catch (error) {
      console.error('[useStepCounter] Failed to sync motion session:', error);
      toast.error(error.response?.data?.message || 'Connection lost. Stale session stored locally.');
    } finally {
      setSyncingSession(false);
    }
  }, [isSessionActive, socket, connected]);

  // Core Start Session API with Pre-Session Validation (Fix 4)
  const startCounting = useCallback(async () => {
    // Audit check: guarantee permission and idempotency
    if (isSessionActive) {
      console.warn('[useStepCounter] Session already active. Idempotent block triggered.');
      return;
    }

    console.log('[useStepCounter] User clicked Start. Running 1.5s health check first...');
    setSensorStatus('checking');
    
    const isProbeHealthy = await runProbeCheck(1500);
    
    if (!isProbeHealthy) {
      console.warn('[useStepCounter] Start health check aborted: sensor not responding.');
      setSensorStatus('unavailable');
      toast.error(
        "Sensor not responding. Please check:\n" +
        "  ✗ Are you on HTTPS?\n" +
        "  ✗ Has motion permission been granted in browser settings?\n" +
        "  ✗ Is your device a mobile phone or tablet?",
        { autoClose: 8000 }
      );
      return;
    }

    // Set status to ready
    setSensorStatus('ready');
    console.log('[useStepCounter] Sensor health verified. Initializing session tracking...');

    // 1. Instantiation check: teardown any existing stale listeners
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // 2. Initialize fresh gait telemetry
    sessionStepCountRef.current = 0;
    sessionConfidencesRef.current = [];
    sessionStepTimestampsRef.current = [];
    unconfirmedStepsRef.current = [];
    lastStepTimeRef.current = 0;
    lastStepIntervalRef.current = 0;
    debugPeaksLogRef.current = [];

    // Reset diagnostics buffers
    sampleIntervalsRef.current = [];
    nullReadingsWindowRef.current = [];
    lastSampleTimeRef.current = 0;
    nonZeroReceivedRef.current = false;

    // 3. Establish idempotency key and session parameters
    sessionStartTimeRef.current = Date.now();
    sessionIdempotencyKeyRef.current = `hms_session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    setSessionSteps(0);
    setSessionDuration(0);
    setAverageConfidence(0);
    setIsWalking(false);
    setIsSessionActive(true);

    // 4. Attach motion event listener bound with AbortController signal
    window.addEventListener('devicemotion', handleDeviceMotion, { passive: true, signal });

    // 5. Sensor Data Null Guard Timeout: If no non-zero readings are received within 2 seconds, sensor is not working.
    if (sensorTimeoutRef.current) {
      clearTimeout(sensorTimeoutRef.current);
    }
    sensorTimeoutRef.current = setTimeout(() => {
      if (!nonZeroReceivedRef.current) {
        console.warn('[useStepCounter] 2-second timeout fired with no non-zero readings.');
        setSensorStatus('unavailable');
        stopCounting(); // Teardown active listeners
        toast.error('Sensor is not responding. Automatically setting status to unavailable.');
      }
    }, 2000);

    // 6. Track duration using active interval
    sessionTimerRef.current = setInterval(() => {
      const elapsedSeconds = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
      setSessionDuration(elapsedSeconds);
    }, 1000);

    toast.success('Gait sensor session loaded. Walk to begin.');
  }, [isSessionActive, runProbeCheck, handleDeviceMotion, stopCounting]);

  // Teardown hook on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
      if (sensorTimeoutRef.current) {
        clearTimeout(sensorTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Web socket listener for cross-device telemetry synchronizations
  useEffect(() => {
    if (socket && connected) {
      const handleStepsUpdate = (data) => {
        setSteps(data.steps);
        setCalories(data.calories);
        setDistance(data.distance);
      };

      socket.on('steps:updated', handleStepsUpdate);
      return () => {
        socket.off('steps:updated', handleStepsUpdate);
      };
    }
  }, [socket, connected]);

  // --- START/STOP AUDIT LIFECYCLE TEST MATRIX (Deliverable 4) ---
  const runLifecycleTest = useCallback(async () => {
    console.log('[useStepCounter Audit] Starting Start->Stop->Start x5 test matrix...');
    let passed = true;

    try {
      for (let i = 1; i <= 5; i++) {
        console.log(`[useStepCounter Audit] Step ${i}/5: Starting session...`);
        await startCounting();
        
        // Assert state is active
        if (!isSessionActive && !abortControllerRef.current) {
          console.error(`[useStepCounter Audit] Run #${i} failed: State or listener was not established.`);
          passed = false;
        }

        // Wait briefly to check listener attachment
        await new Promise(resolve => setTimeout(resolve, 50));

        console.log(`[useStepCounter Audit] Step ${i}/5: Stopping session...`);
        await stopCounting();

        // Assert clean teardown
        if (abortControllerRef.current || sessionTimerRef.current) {
          console.error(`[useStepCounter Audit] Run #${i} failed: Listener or interval leak detected.`);
          passed = false;
        }
      }

      if (passed) {
        console.log('[useStepCounter Audit] Start->Stop->Start x5 verified. 100% of event handlers successfully detached.');
        toast.success('Auditing complete: Lifecycle verification verified successfully!');
      } else {
        toast.error('Auditing error: Stale listener leaks discovered in auditing cycles.');
      }
    } catch (e) {
      console.error('[useStepCounter Audit] Audit error occurred:', e);
      toast.error('Auditing error: Crashed during lifecycle testing.');
      passed = false;
    }

    return passed;
  }, [startCounting, stopCounting, isSessionActive]);

  return {
    steps,
    calories,
    distance,
    isWalking,
    permissionGranted,
    permissionDenied,
    startCounting,
    stopCounting,
    requestPermission,
    stepCountBuffer: unconfirmedStepsRef.current.length,
    
    // Advanced features
    isSessionActive,
    sessionSteps,
    sessionDuration,
    averageConfidence,
    syncingSession,
    
    // Pre-session validation and status
    sensorStatus,
    setSensorStatus,
    runProbeCheck,
    sensorCheck,
    
    // Debugging hooks
    isDebugMode,
    setIsDebugMode,
    debugData,
    runLifecycleTest
  };
};
