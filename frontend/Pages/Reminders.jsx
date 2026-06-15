import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReminderList from '../Components/reminders/ReminderList';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useSocket } from '../context/SocketContext';
import {
  showBrowserNotification,
  playNotificationSound,
  requestNotificationPermission,
} from '../utils/notifications';
import {
  Pill, Clock, CheckCircle2, XCircle, TrendingUp, AlarmClock,
  AlertTriangle, X, CalendarDays, ChevronRight, RefreshCw,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FORMAT_TIME = (timeStr) => {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

/** Returns countdown string from now to a date */
const countdown = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  if (diff < 0) return { label: 'Overdue', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
  if (diff < 3_600_000) {
    const m = Math.floor(diff / 60_000);
    return {
      label: `${m}m`,
      color: m < 15 ? 'text-amber-600' : 'text-blue-600',
      bg: m < 15 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100',
    };
  }
  const h = Math.floor(diff / 3_600_000);
  return { label: `${h}h`, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' };
};

// ─── Adherence level config ───────────────────────────────────────────────────

const ADHERENCE_CFG = (pct) => {
  if (pct >= 90) return { color: 'text-emerald-600', bar: 'bg-emerald-500', label: 'Excellent' };
  if (pct >= 70) return { color: 'text-blue-600',    bar: 'bg-blue-500',    label: 'Good' };
  if (pct >= 50) return { color: 'text-amber-600',   bar: 'bg-amber-500',   label: 'Fair' };
  return           { color: 'text-rose-600',   bar: 'bg-rose-500',    label: 'Low' };
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, sub, valueColor = 'text-slate-900', children }) => (
  <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
    <div className="flex items-center gap-2.5">
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
    <div>
      <p className={`text-2xl font-extrabold tabular-nums ${valueColor}`}>
        {value}
        {sub && <span className="text-xs font-medium text-slate-400 ml-1">{sub}</span>}
      </p>
    </div>
    {children}
  </div>
);

// ─── Today's Schedule Timeline ────────────────────────────────────────────────

const TodayTimeline = ({ reminders, onMarkTaken }) => {
  if (!reminders.length) return null;

  // Build flat list of time slots
  const slots = reminders
    .flatMap(r =>
      (r.time || []).map(t => ({
        reminderId: r._id,
        medicineName: r.medicineName,
        dosage: r.dosage,
        time: t,
        isOverdue: r.isOverdue,
        status: r.status,
        nextNotification: r.nextNotification,
      }))
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  const now = new Date();
  const todayHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Today's Schedule</h2>
            <p className="text-xs text-slate-400">{slots.length} dose{slots.length !== 1 ? 's' : ''} scheduled</p>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Timeline */}
      <div className="p-5 space-y-3">
        {slots.map((slot, idx) => {
          const isPast    = slot.time < todayHHMM;
          const isCurrent = Math.abs(slot.time.localeCompare(todayHHMM)) < 2 && slot.time.slice(0, 2) === todayHHMM.slice(0, 2);
          const isOverdue = slot.isOverdue && slot.status === 'Active';

          let chipCls = 'bg-slate-100 text-slate-500';
          let dotCls  = 'bg-slate-300';
          let statusLabel = 'Upcoming';

          if (isOverdue)         { chipCls = 'bg-rose-100 text-rose-700';    dotCls = 'bg-rose-500 animate-pulse'; statusLabel = 'Overdue'; }
          else if (slot.status === 'Completed') { chipCls = 'bg-emerald-100 text-emerald-700'; dotCls = 'bg-emerald-500'; statusLabel = 'Taken'; }
          else if (isPast)       { chipCls = 'bg-amber-100 text-amber-700';  dotCls = 'bg-amber-400'; statusLabel = 'Missed'; }

          return (
            <div
              key={idx}
              className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                isOverdue
                  ? 'bg-rose-50 border-rose-200'
                  : isCurrent
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100/60'
              }`}
            >
              {/* Time */}
              <div className="text-center shrink-0 w-14">
                <p className={`text-sm font-extrabold tabular-nums ${isOverdue ? 'text-rose-600' : isCurrent ? 'text-blue-600' : 'text-slate-700'}`}>
                  {FORMAT_TIME(slot.time)}
                </p>
              </div>

              {/* Dot + line */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-3 h-3 rounded-full ${dotCls} ring-2 ring-white shadow-sm`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">{slot.medicineName}</p>
                <p className="text-xs text-slate-500">{slot.dosage}</p>
              </div>

              {/* Status chip */}
              <span className={`text-[10px] font-extrabold px-2 py-1 rounded-lg uppercase tracking-wide shrink-0 ${chipCls}`}>
                {statusLabel}
              </span>

              {/* Mark taken CTA (overdue / upcoming active doses) */}
              {(isOverdue || (!isPast && slot.status === 'Active')) && (
                <button
                  onClick={() => onMarkTaken(slot.reminderId)}
                  className="flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg transition-all shrink-0"
                  title="Mark as taken"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Taken</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Overdue Alert Banner ─────────────────────────────────────────────────────

const OverdueBanner = ({ count, onDismiss }) => {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 bg-rose-50 border border-rose-200 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-rose-800">
            {count} Overdue Dose{count !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-rose-600">
            Please take your medication as soon as possible.
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-rose-400 hover:text-rose-700 transition-colors shrink-0"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─── Reminders Page ───────────────────────────────────────────────────────────

const Reminders = () => {
  const [stats, setStats] = useState({
    total: 0, active: 0, completed: 0,
    suspended: 0, overdue: 0, dueToday: 0,
  });
  const [todaysReminders, setTodaysReminders] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [showOverdueBanner, setShowOverdueBanner] = useState(true);
  const [nextDose, setNextDose]               = useState(null);
  const countdownRef                          = useRef(null);
  const { socket }                            = useSocket();

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, todayRes] = await Promise.all([
        api.reminders.getStats(),
        api.reminders.getToday(),
      ]);
      const newStats = statsRes.data.data;
      setStats(newStats);
      const today = todayRes.data.data || [];
      setTodaysReminders(today);

      // Determine next upcoming dose
      const now = new Date();
      const upcoming = today
        .filter(r => r.nextNotification && new Date(r.nextNotification) > now)
        .sort((a, b) => new Date(a.nextNotification) - new Date(b.nextNotification));
      setNextDose(upcoming[0] || null);
    } catch (error) {
      toast.error('Failed to load reminder data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    requestNotificationPermission();
  }, [fetchDashboardData]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;
    socket.on('reminder:triggered', (data) => {
      toast.info(
        <div className="flex flex-col gap-1">
          <p className="font-bold">💊 {data.medicineName}</p>
          <p className="text-sm">{data.dosage} — {data.message}</p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => toast.dismiss()}
              className="text-xs font-bold px-2 py-1 bg-emerald-600 text-white rounded-lg"
            >
              Mark Taken
            </button>
            <button
              onClick={() => {
                toast.dismiss();
                setTimeout(() => {
                  playNotificationSound();
                  toast.info(`Snooze reminder: ${data.medicineName}`, { autoClose: 8000, icon: '⏰' });
                }, 5 * 60 * 1000);
              }}
              className="text-xs font-bold px-2 py-1 bg-slate-200 text-slate-700 rounded-lg"
            >
              Snooze 5min
            </button>
          </div>
        </div>,
        { autoClose: 15000, icon: false }
      );
      playNotificationSound();
      showBrowserNotification(`Time for ${data.medicineName}`, {
        body: `${data.dosage} at ${data.time}`,
        tag: `reminder-${data.reminderId}`,
      });
      fetchDashboardData();
    });
    return () => socket.off('reminder:triggered');
  }, [socket, fetchDashboardData]);

  // Live countdown ticker (every 60s)
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setNextDose(prev => prev ? { ...prev } : prev); // force re-render
    }, 60_000);
    return () => clearInterval(countdownRef.current);
  }, []);

  // ── quick mark as taken (from timeline) ──────────────────────────────────

  const handleMarkTaken = async (id) => {
    try {
      await api.reminders.updateStatus(id, 'Completed');
      toast.success('Dose marked as taken');
      fetchDashboardData();
    } catch {
      toast.error('Failed to mark dose as taken');
    }
  };

  // ── adherence ─────────────────────────────────────────────────────────────

  const adherencePct = stats.dueToday > 0
    ? Math.round((stats.completed / stats.dueToday) * 100)
    : stats.active > 0 ? 0 : 100;

  const adherenceCfg = ADHERENCE_CFG(adherencePct);

  const nextCD = nextDose ? countdown(nextDose.nextNotification) : null;

  // ── loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <div className="text-center">
          <p className="text-slate-700 font-semibold">Loading Medication Data</p>
          <p className="text-slate-400 text-sm mt-0.5">Fetching your reminders…</p>
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Pill className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Medication Management
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Medicine Reminders
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Stay on track with your medication schedule — never miss a dose.
          </p>
        </div>

        {/* Refresh + today's date */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <button
            id="refresh-reminders-btn"
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Overdue Banner ── */}
      {showOverdueBanner && stats.overdue > 0 && (
        <OverdueBanner
          count={stats.overdue}
          onDismiss={() => setShowOverdueBanner(false)}
        />
      )}

      {/* ── Stats Grid (matches QuickStats pattern) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Medication Overview</h3>
          <span className="ml-auto text-xs text-slate-400 font-medium">Today</span>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            icon={Pill}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Active"
            value={stats.active}
            valueColor="text-blue-700"
          />
          <StatCard
            icon={AlarmClock}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            label="Due Today"
            value={stats.dueToday}
            valueColor="text-violet-700"
          />
          <StatCard
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="Taken Today"
            value={stats.completed}
            valueColor="text-emerald-700"
          />
          <StatCard
            icon={XCircle}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
            label="Overdue"
            value={stats.overdue}
            valueColor={stats.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}
          />


          {/* Next dose countdown */}
          <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Next Dose</p>
            </div>
            {nextDose && nextCD ? (
              <>
                <p className={`text-2xl font-extrabold tabular-nums ${nextCD.color}`}>
                  {nextCD.label}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold truncate">
                  {nextDose.medicineName}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-slate-400 mt-1">—</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Today's Timeline ── */}
      {todaysReminders.length > 0 && (
        <TodayTimeline
          reminders={todaysReminders}
          onMarkTaken={handleMarkTaken}
        />
      )}

      {/* ── Main Reminder List ── */}
      <ReminderList onReminderChange={fetchDashboardData} />
    </div>
  );
};

export default Reminders;
