import React, { useState, useEffect } from 'react';
import {
  Pill, Clock, Calendar, RotateCcw, CheckCircle2, Pencil, Trash2,
  AlertTriangle, ChevronDown, ChevronUp, FileText, RefreshCw, AlarmClock,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FORMAT_TIME = (timeStr) => {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const FORMAT_DATE = (date) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const FORMAT_NEXT = (date) => {
  if (!date) return null;
  const diff = new Date(date) - new Date();
  if (diff < 0) return { label: 'Overdue', color: 'text-rose-600', urgent: true };
  if (diff < 3_600_000) {
    const mins = Math.floor(diff / 60_000);
    return { label: `In ${mins} min`, color: 'text-amber-600', urgent: mins < 15 };
  }
  return {
    label: new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    color: 'text-blue-600',
    urgent: false,
  };
};

// ─── Status config (mirrors VitalSignCard pattern) ────────────────────────────

const STATUS_CONFIG = {
  Active:    { border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500',    gradient: 'from-blue-500 to-blue-600' },
  Completed: { border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-500' },
  Suspended: { border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400',   gradient: 'from-amber-400 to-amber-500' },
};

const OVERDUE_CONFIG = {
  border: 'border-rose-300',
  badge: 'bg-rose-100 text-rose-700',
  dot: 'bg-rose-500',
  gradient: 'from-rose-500 to-red-600',
};

// ─── Frequency → suggested time count ────────────────────────────────────────
const FREQ_DOSES = {
  'Once Daily': 1, 'Twice Daily': 2, 'Three Times Daily': 3,
  'Four Times Daily': 4, 'Weekly': 1, 'As Needed': 1,
};

// ─── ReminderCard ─────────────────────────────────────────────────────────────

const ReminderCard = ({ reminder, onEdit, onDelete, onStatusChange }) => {
  const {
    _id, medicineName, dosage, frequency, time = [], startDate, endDate,
    notes, status, nextNotification, isOverdue, category = 'Tablet',
  } = reminder;

  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const cfg = (isOverdue && status === 'Active') ? OVERDUE_CONFIG : (STATUS_CONFIG[status] || STATUS_CONFIG.Active);
  const nextDose = FORMAT_NEXT(nextNotification);

  // Days remaining
  const daysRemaining = Math.ceil((new Date(endDate) - new Date()) / 86_400_000);
  const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / 86_400_000);
  const progressPct = totalDays > 0 ? Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100)) : 0;

  // Doses per day
  const dailyDoses = FREQ_DOSES[frequency] || time.length || 1;

  // Medicine initial avatar color
  const AVATAR_COLORS = [
    'bg-blue-500', 'bg-violet-500', 'bg-teal-500', 'bg-indigo-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-orange-500',
  ];
  const avatarColor = AVATAR_COLORS[medicineName.charCodeAt(0) % AVATAR_COLORS.length];

  const withLoading = async (key, fn) => {
    setActionLoading(key);
    try { await fn(); } finally { setActionLoading(null); }
  };

  return (
    <div
      className={`relative bg-white rounded-2xl border-2 ${cfg.border} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 group overflow-hidden flex flex-col`}
    >
      {/* Gradient accent strip (top) */}
      <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient} w-full shrink-0`} />

      {/* Background circle decoration */}
      <div
        className={`absolute top-0 right-0 w-40 h-40 rounded-full bg-gradient-to-br ${cfg.gradient} opacity-[0.04] -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-125 pointer-events-none`}
      />

      {/* ── Card Body ── */}
      <div className="p-5 flex flex-col gap-4 relative flex-1">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className={`w-11 h-11 ${avatarColor} rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-${avatarColor.split('-')[1]}-500/30`}>
              <Pill className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate tracking-tight leading-tight">
                {medicineName}
              </h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5 truncate">{dosage}</p>
            </div>
          </div>

          {/* Status badge */}
          <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${cfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${(isOverdue && status === 'Active') ? 'animate-pulse' : ''}`} />
            {(isOverdue && status === 'Active') ? 'Overdue' : status}
          </span>
        </div>

        {/* ── Key info row ── */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Frequency */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Frequency</p>
              <p className="text-xs font-semibold text-slate-700 leading-tight">{frequency}</p>
            </div>
          </div>

          {/* Daily doses count */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center shrink-0">
              <Pill className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Doses/Day</p>
              <p className="text-xs font-semibold text-slate-700">{dailyDoses}</p>
            </div>
          </div>
        </div>

        {/* ── Scheduled times ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Scheduled Times
          </p>
          <div className="flex flex-wrap gap-1.5">
            {time.map((t, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
              >
                <AlarmClock className="w-3 h-3" />
                {FORMAT_TIME(t)}
              </span>
            ))}
          </div>
        </div>

        {/* ── Next dose highlight ── */}
        {nextDose && (
          <div className={`flex items-center justify-between p-3 rounded-xl border ${
            nextDose.urgent
              ? 'bg-rose-50 border-rose-200'
              : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${nextDose.color}`} />
              <span className="text-xs font-semibold text-slate-600">Next Dose</span>
            </div>
            <span className={`text-sm font-extrabold tabular-nums ${nextDose.color}`}>
              {nextDose.label}
            </span>
          </div>
        )}

        {/* ── Overdue warning ── */}
        {isOverdue && status === 'Active' && (
          <div className="flex items-center gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
            <p className="text-xs font-bold text-rose-700">This dose is overdue — take it now or mark as missed.</p>
          </div>
        )}

        {/* ── Progress bar (days) ── */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Duration</span>
            </div>
            <span className={`text-xs font-semibold ${daysRemaining <= 7 && daysRemaining > 0 ? 'text-amber-600' : daysRemaining <= 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              {daysRemaining > 0 ? `${daysRemaining} days left` : 'Ended'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${
                daysRemaining <= 0 ? 'bg-rose-500' : daysRemaining <= 7 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {FORMAT_DATE(startDate)} — {FORMAT_DATE(endDate)}
          </p>
        </div>

        {/* ── Expandable notes ── */}
        {notes && (
          <div>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide hover:text-slate-600 transition-colors"
            >
              <FileText className="w-3 h-3" />
              Notes
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded && (
              <p className="mt-1.5 text-xs text-slate-600 italic p-2.5 bg-slate-50 rounded-lg border border-slate-100 leading-relaxed">
                "{notes}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Action Row ── */}
      <div className="px-5 pb-4 pt-0 flex items-center gap-2 border-t border-slate-100 pt-3 mt-0">
        {/* Edit */}
        <button
          id={`edit-reminder-${_id}`}
          onClick={() => onEdit(reminder)}
          disabled={!!actionLoading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-100 hover:border-blue-200 disabled:opacity-50"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>

        {/* Mark as Taken / Reactivate */}
        {status === 'Active' ? (
          <button
            id={`complete-reminder-${_id}`}
            onClick={() => withLoading('complete', () => onStatusChange(_id, 'Completed'))}
            disabled={!!actionLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-100 hover:border-emerald-200 disabled:opacity-50"
          >
            {actionLoading === 'complete'
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <CheckCircle2 className="w-3.5 h-3.5" />
            }
            Taken
          </button>
        ) : (
          <button
            id={`reactivate-reminder-${_id}`}
            onClick={() => withLoading('reactivate', () => onStatusChange(_id, 'Active'))}
            disabled={!!actionLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 disabled:opacity-50"
          >
            {actionLoading === 'reactivate'
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <RotateCcw className="w-3.5 h-3.5" />
            }
            Reactivate
          </button>
        )}

        {/* Delete */}
        <button
          id={`delete-reminder-${_id}`}
          onClick={() => withLoading('delete', () => onDelete(_id))}
          disabled={!!actionLoading}
          className="flex items-center justify-center w-9 h-9 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-100 hover:border-rose-200 disabled:opacity-50 shrink-0"
          title="Delete reminder"
        >
          {actionLoading === 'delete'
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* Critical overdue pulse ring */}
      {isOverdue && status === 'Active' && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-rose-400 animate-ping opacity-10 pointer-events-none" />
      )}
    </div>
  );
};

export default ReminderCard;
