import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { toast } from 'react-toastify';

const STEP_CONFIG = {
  THRESHOLD: 1.1,
  MIN_TIME_BETWEEN_STEPS: 250,
  REQUIRED_STEPS_FOR_WALKING: 3,
  DEBOUNCE_TIME: 5000,
};

export const useStepCounter = () => {
  const { socket, connected } = useSocket();
  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastStepTime, setLastStepTime] = useState(0);
  const [stepCountBuffer, setStepCountBuffer] = useState(0);

  const animationFrameRef = useRef(null);
  const lastAccelerationRef = useRef({ x: 0, y: 0, z: 0 });
  const lastTimestampRef = useRef(0);
  const stepBufferRef = useRef([]);

  const requestPermission = useCallback(async () => {
    if (typeof DeviceMotionEvent === 'undefined') {
      toast.error('Device motion sensors not supported on this device');
      return false;
    }

    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const permissionState = await DeviceMotionEvent.requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          return true;
        } else {
          setPermissionDenied(true);
          toast.error('Motion sensor permission denied');
          return false;
        }
      } else {
        setPermissionGranted(true);
        return true;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      setPermissionDenied(true);
      toast.error('Failed to get motion sensor permission');
      return false;
    }
  }, []);

  const calculateMagnitude = useCallback((acceleration) => {
    return Math.sqrt(
      acceleration.x * acceleration.x +
      acceleration.y * acceleration.y +
      acceleration.z * acceleration.z
    );
  }, []);

  const detectStep = useCallback((acceleration, timestamp) => {
    const currentMagnitude = calculateMagnitude(acceleration);
    const lastMagnitude = calculateMagnitude(lastAccelerationRef.current);
    const delta = Math.abs(currentMagnitude - lastMagnitude);

    if (delta > STEP_CONFIG.THRESHOLD) {
      const now = Date.now();
      if (now - lastStepTime > STEP_CONFIG.MIN_TIME_BETWEEN_STEPS) {
        setStepCountBuffer(prev => prev + 1);
        stepBufferRef.current.push(now);

        if (stepBufferRef.current.length > STEP_CONFIG.REQUIRED_STEPS_FOR_WALKING) {
          stepBufferRef.current.shift();
        }

        const recentSteps = stepBufferRef.current.filter(
          t => now - t < 2000
        );

        if (recentSteps.length >= STEP_CONFIG.REQUIRED_STEPS_FOR_WALKING) {
          setIsWalking(true);
        }

        setLastStepTime(now);
      }
    }

    lastAccelerationRef.current = acceleration;
    lastTimestampRef.current = timestamp;
  }, [calculateMagnitude, lastStepTime]);

  const handleMotion = useCallback((event) => {
    const acceleration = {
      x: event.accelerationIncludingGravity?.x || 0,
      y: event.accelerationIncludingGravity?.y || 0,
      z: event.accelerationIncludingGravity?.z || 0,
    };
    detectStep(acceleration, event.timeStamp);
  }, [detectStep]);

  const accumulateSteps = useCallback(async (countToSync) => {
    if (countToSync <= 0) return;

    try {
      const response = await api.activities.addSteps({ steps: countToSync });
      const updatedActivity = response.data;

      setSteps(updatedActivity.steps);
      setCalories(updatedActivity.caloriesBurned);
      setDistance(updatedActivity.distance);

      // Subtract ONLY the synced amount from the buffer
      setStepCountBuffer(prev => Math.max(0, prev - countToSync));

      if (socket && connected) {
        socket.emit('steps:update', {
          steps: updatedActivity.steps,
          calories: updatedActivity.caloriesBurned,
          distance: updatedActivity.distance,
        });
      }
    } catch (error) {
      console.error('Failed to save steps:', error);
      // We don't reset the buffer on failure so it can retry next time
    }
  }, [socket, connected]);

  const resetDailySteps = useCallback(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(() => {
      accumulateSteps(0);
      setStepCountBuffer(0);
      stepBufferRef.current = [];
      setIsWalking(false);
      resetDailySteps();
    }, msUntilMidnight);
  }, [accumulateSteps]);

  const startCounting = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) return;

    resetDailySteps();
    window.addEventListener('devicemotion', handleMotion, { passive: true });
  }, [requestPermission, handleMotion, resetDailySteps]);

  const stopCounting = useCallback(() => {
    if (typeof DeviceMotionEvent !== 'undefined') {
      window.removeEventListener('devicemotion', handleMotion);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [handleMotion]);

  useEffect(() => {
    let debounceTimer;
    if (stepCountBuffer > 0) {
      debounceTimer = setTimeout(() => {
        accumulateSteps(stepCountBuffer);
      }, STEP_CONFIG.DEBOUNCE_TIME);
    }
    return () => clearTimeout(debounceTimer);
  }, [stepCountBuffer, accumulateSteps]);

  useEffect(() => {
    const checkIdle = () => {
      const now = Date.now();
      if (now - lastStepTime > 3000 && isWalking) {
        setIsWalking(false);
      }
    };

    const idleTimer = setInterval(checkIdle, 1000);
    return () => clearInterval(idleTimer);
  }, [lastStepTime, isWalking]);

  const fetchTodayActivity = useCallback(async () => {
    try {
      const response = await api.activities.getToday();
      const activity = response.data;
      setSteps(activity.steps || 0);
      setCalories(activity.caloriesBurned || 0);
      setDistance(activity.distance || 0);
    } catch (error) {
      console.error('Failed to fetch today activity:', error);
    }
  }, []);

  useEffect(() => {
    fetchTodayActivity();
  }, [fetchTodayActivity]);

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
    stepCountBuffer,
  };
};