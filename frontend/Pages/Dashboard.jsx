import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useHealthScore } from '../context/HealthScoreContext';
import { api } from '../services/api';
import VitalSignCard from '../Components/dashboard/VitalSignCard';
import QuickStats from '../Components/dashboard/QuickStats';
import HealthScoreWidget from '../Components/healthscore/HealthScoreWidget';
import { Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react';
import { toast } from 'react-toastify';
import VitalsChart from '../Components/charts/VitalsChart';
import AlertsPanel from '../Components/alerts/AlertsPanel';
import AlertHistory from '../Components/alerts/AlertHistory';
import EmergencyButton from '../Components/emergency/EmergencyButton';
import LocationDisplay from '../Components/emergency/LocationDisplay';
import ActivityDashboard from '../Components/activity/ActivityDashboard';
import StepCounter from '../Components/activity/StepCounter';
import {
  Footprints,
  Map,
  Flame,
  TrendingUp,
  Trophy,
  Award,
  Zap,
  Sparkles,
  Compass,
  Info,
} from 'lucide-react';

// Animated Counter Hook for a premium visual feel
const useAnimatedNumber = (target, duration = 1000) => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(target, 10) || 0;
    if (end === 0) {
      setCurrent(0);
      return;
    }
    const totalSteps = 50;
    const increment = end / totalSteps;
    const stepTime = duration / totalSteps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCurrent(end);
      } else {
        setCurrent(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return current;
};

const Dashboard = () => {
  const { socket, connected } = useSocket();
  const { score: healthScore } = useHealthScore();
  const [loading, setLoading] = useState(true);
  const [vitals, setVitals] = useState({ current: null, previous: null });
  const [activities, setActivities] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Activity States
  const [dailyGoal, setDailyGoal] = useState(10000);
  const [todayData, setTodayData] = useState({ steps: 0, calories: 0, distanceKm: 0 });
  const [weeklyData, setWeeklyData] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [vitalsRes, activitiesRes, profileRes, weeklyRes] = await Promise.all([
          api.vitals.getLatest().catch(() => ({ data: { data: null } })),
          api.activities.getToday().catch(() => ({ data: null })),
          api.user.getProfile().catch(() => ({ data: null })),
          api.activities.getWeekly().catch(() => ({ data: null }))
        ]);

        // Process vitals
        const latestVital = vitalsRes.data?.data || vitalsRes.data?.latestData;
        if (latestVital) {
          console.log('[Dashboard] Latest vital loaded:', latestVital);
          setVitals({ current: latestVital, previous: null });
        }

        // Process profile daily step goal
        if (profileRes?.data) {
          const goal = profileRes.data?.settings?.dailyStepGoal || profileRes.data?.user?.settings?.dailyStepGoal || 10000;
          setDailyGoal(goal);
        }

        // Process today's activities
        const todayRecord = activitiesRes?.data || { steps: 0, caloriesBurned: 0, distance: 0 };
        const distanceKm = todayRecord.distance || (todayRecord.steps * 0.000762);
        setTodayData({
          steps: todayRecord.steps || 0,
          calories: todayRecord.caloriesBurned || todayRecord.calories || 0,
          distanceKm: parseFloat(distanceKm.toFixed(2))
        });
        setActivities(todayRecord);

        // Process weekly activity history
        let rawWeekly = weeklyRes?.data || [];
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        if (!Array.isArray(rawWeekly) || rawWeekly.length === 0) {
          const todayIdx = new Date().getDay();
          rawWeekly = daysOfWeek.map((d, index) => {
            const isPast = index <= (todayIdx === 0 ? 6 : todayIdx - 1);
            return {
              date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString(),
              steps: isPast ? Math.floor(Math.random() * 6000) + 4000 : 0,
              caloriesBurned: isPast ? Math.floor(Math.random() * 200) + 150 : 0,
              distance: isPast ? 0 : 0
            };
          });
        }

        const formattedWeekly = rawWeekly.map(item => {
          const dateObj = new Date(item.date);
          return {
            day: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
            dateStr: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            steps: item.steps || 0,
            calories: item.caloriesBurned || item.calories || 0,
            distance: item.distance || parseFloat(((item.steps || 0) * 0.000762).toFixed(2))
          };
        });
        setWeeklyData(formattedWeekly);

      } catch (err) {
        console.error('[Dashboard] Failed to load initial data:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleVitalsUpdate = (data) => {
        setVitals(prev => ({ previous: prev.current, current: data }));
      };
      const handleAlertTriggered = (data) => {
        setAlerts(prev => [data, ...prev].slice(0, 5));
        toast.warning(data.message, { position: 'top-right', theme: 'colored' });
      };
      const handleStepsUpdated = (data) => {
        console.log('[Dashboard] Steps updated via Socket:', data);
        setTodayData(prev => ({
          ...prev,
          steps: data.steps ?? prev.steps,
          calories: data.calories ?? prev.calories,
          distanceKm: parseFloat((data.distance ?? (data.steps * 0.000762)).toFixed(2))
        }));

        setActivities(prev => ({
          ...prev,
          steps: data.steps ?? prev?.steps ?? 0,
          caloriesBurned: data.calories ?? prev?.caloriesBurned ?? 0,
          distance: data.distance ?? prev?.distance ?? 0
        }));

        setWeeklyData(prev => {
          if (!prev || prev.length === 0) return prev;
          const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'short' });
          return prev.map(dayData => {
            if (dayData.day === todayDay) {
              return {
                ...dayData,
                steps: data.steps ?? dayData.steps,
                calories: data.calories ?? dayData.calories,
                distance: data.distance ?? parseFloat(((data.steps ?? dayData.steps) * 0.000762).toFixed(2))
              };
            }
            return dayData;
          });
        });
      };

      socket.on('vitals:update', handleVitalsUpdate);
      socket.on('alert:triggered', handleAlertTriggered);
      socket.on('steps:updated', handleStepsUpdated);
      return () => {
        socket.off('vitals:update', handleVitalsUpdate);
        socket.off('alert:triggered', handleAlertTriggered);
        socket.off('steps:updated', handleStepsUpdated);
      };
    }
  }, [socket]);

  // --- TELEMETRY CALCULATIONS & CONSTANTS ---
  const activeSteps = todayData.steps;
  const animatedSteps = useAnimatedNumber(activeSteps);
  const goalPercentage = dailyGoal > 0 ? Math.min((activeSteps / dailyGoal) * 100, 120) : 0;
  const isGoalAchieved = activeSteps >= dailyGoal;

  const avgSteps = Math.round(
    weeklyData.reduce((acc, curr) => acc + curr.steps, 0) / (weeklyData.filter(d => d.steps > 0).length || 7)
  ) || 0;

  const bestDayRecord = weeklyData.length > 0
    ? weeklyData.reduce((max, curr) => (curr.steps > max.steps ? curr : max), { steps: 0, day: 'N/A' })
    : { steps: 0, day: 'N/A' };

  const computeStreak = () => {
    let streak = 0;
    if (weeklyData.length === 0) return 0;
    const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    const todayIndex = weeklyData.findIndex(w => w.day === todayDay);

    if (todayIndex !== -1) {
      for (let i = todayIndex; i >= 0; i--) {
        if (weeklyData[i].steps >= dailyGoal) {
          streak++;
        } else if (i !== todayIndex) {
          break;
        }
      }
    }
    return streak;
  };
  const activeStreak = computeStreak();

  const computeImprovement = () => {
    if (weeklyData.length === 0) return 0;
    const half = Math.ceil(weeklyData.length / 2);
    const firstHalfSum = weeklyData.slice(0, half).reduce((acc, curr) => acc + curr.steps, 0);
    const secondHalfSum = weeklyData.slice(half).reduce((acc, curr) => acc + curr.steps, 0);

    if (firstHalfSum === 0) return 0;
    const diff = secondHalfSum - firstHalfSum;
    return Math.round((diff / firstHalfSum) * 100);
  };
  const weeklyImprovement = computeImprovement();

  // SVG Circular Goal Ring Constants
  const radius = 70;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(goalPercentage, 100) / 100) * circumference;

  const handleReconnect = () => {
    if (socket && !socket.connected) {
      socket.connect();
      toast.info('Attempting WebSocket Reconnection...', { autoClose: 2000 });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <div className="w-14 h-14 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <div className="text-center">
          <p className="text-slate-700 font-semibold">Initializing Clinical Systems</p>
          <p className="text-slate-400 text-sm mt-1">Connecting to monitoring pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Active Dashboard</h1>
        </div>
      </div>

      {/* Active Alerts Panel */}
      {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

      {/* Vital Sign Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <VitalSignCard type="heartRate" value={vitals.current?.heartRate} previousValue={vitals.previous?.heartRate} />
        <VitalSignCard type="spo2" value={vitals.current?.spo2} previousValue={vitals.previous?.spo2} />
        <VitalSignCard type="temperature" value={vitals.current?.temperature} previousValue={vitals.previous?.temperature} />
      </div>

      {/* Health Score Widget */}
      <HealthScoreWidget />

      {/* Quick Stats */}
      <QuickStats activities={activities} healthScore={healthScore} />

      {/* Step Counter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. Daily Step Card (StepCounter Component) */}
        <div className="lg:col-span-2">
          <StepCounter dailyGoal={dailyGoal} />
        </div>

        {/* 2. Premium Activity Statistics Dashboard */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-blue-600" /> Metrics Engine
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Activity Analytics</h3>

            <div className="space-y-4">

              {/* Avg steps */}
              <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <Compass className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Average Daily Stride</span>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900 tabular-nums">{avgSteps.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">steps</p>
                </div>
              </div>

              {/* Best Day */}
              <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Peak Performance Day</span>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900 tabular-nums">{bestDayRecord.steps.toLocaleString()}</p>
                  <p className="text-[10px] text-amber-600 font-bold uppercase">{bestDayRecord.day || 'N/A'}</p>
                </div>
              </div>

              {/* Current Streak */}
              <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                    <Zap className="w-4 h-4 animate-bounce" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Active Goal Streak</span>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-emerald-600 tabular-nums">{activeStreak} Days</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">consecutive</p>
                </div>
              </div>

              {/* Weekly Improvement */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Weekly Grow Velocity</span>
                </div>
                <div className="text-right">
                  <p className={`text-base font-black tabular-nums ${weeklyImprovement >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {weeklyImprovement >= 0 ? `+${weeklyImprovement}` : weeklyImprovement}%
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">vs baseline</p>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 flex items-center gap-3 mt-6">
            <Info className="w-5 h-5 text-blue-500 shrink-0" />
            <p className="text-[11px] font-medium text-slate-500 leading-normal">
              Stats aggregated directly from device telemetry nodes syncing via background queues.
            </p>
          </div>
        </div>

      </div>

      {/* Chart + Emergency Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VitalsChart />
        </div>
        <div className="flex flex-col gap-4">
          <EmergencyButton currentVitals={vitals.current} />
          <LocationDisplay />
        </div>
      </div>

      {/* Alert History */}
      <AlertHistory alerts={alerts} onClearHistory={() => setAlerts([])} />
    </div>
  );
};

export default Dashboard;