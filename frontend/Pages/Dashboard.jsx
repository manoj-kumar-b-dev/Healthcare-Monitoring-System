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
import StepCounter from '../Components/activity/StepCounter';

const Dashboard = () => {
  const { socket, connected } = useSocket();
  const { score: healthScore } = useHealthScore();
  const [loading, setLoading] = useState(true);
  const [vitals, setVitals] = useState({ current: null, previous: null });
  const [activities, setActivities] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [vitalsRes, activitiesRes] = await Promise.all([
          api.vitals.getLatest().catch(() => ({ data: { data: null } })),
          api.activities.getToday().catch(() => ({ data: null }))
        ]);
        // Handle new response format: { success: true, data: vital }
        const latestVital = vitalsRes.data?.data || vitalsRes.data?.latestData;
        if (latestVital) {
          console.log('[Dashboard] Latest vital loaded:', latestVital);
          setVitals({ current: latestVital, previous: null });
        }
        if (activitiesRes.data) {
          console.log('[Dashboard] Activities loaded:', activitiesRes.data);
          setActivities(activitiesRes.data);
        }
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
      socket.on('vitals:update', handleVitalsUpdate);
      socket.on('alert:triggered', handleAlertTriggered);
      return () => {
        socket.off('vitals:update', handleVitalsUpdate);
        socket.off('alert:triggered', handleAlertTriggered);
      };
    }
  }, [socket]);

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
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Live Telemetry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Active Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time monitoring via WebSocket pipeline.</p>
        </div>

        {/* Connection Badge */}
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
          connected
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="relative">
            {connected
              ? <Wifi className="w-4 h-4" />
              : <WifiOff className="w-4 h-4" />
            }
            {connected && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            )}
          </div>
          <span>{connected ? 'Connected Live' : 'Disconnected'}</span>
          {!connected && (
            <button
              onClick={handleReconnect}
              className="ml-1 flex items-center gap-1 text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reconnect
            </button>
          )}
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
       <StepCounter />

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