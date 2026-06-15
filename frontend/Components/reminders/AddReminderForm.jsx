import React, { useState, useCallback } from 'react';
import {
  Pill, Clock, Calendar, FileText, Tag, AlarmClock, Plus, X,
  Tablet, FlaskConical, Syringe, Droplets, RefreshCw, ChevronUp, ChevronDown,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQUENCIES = [
  'Once Daily', 'Twice Daily', 'Three Times Daily',
  'Four Times Daily', 'Weekly', 'As Needed',
];

const FREQ_DEFAULT_TIMES = {
  'Once Daily':        ['08:00'],
  'Twice Daily':       ['08:00', '20:00'],
  'Three Times Daily': ['08:00', '14:00', '20:00'],
  'Four Times Daily':  ['08:00', '12:00', '16:00', '20:00'],
  'Weekly':            ['08:00'],
  'As Needed':         ['08:00'],
};

const CATEGORIES = [
  { id: 'Tablet',    label: 'Tablet',    Icon: Tablet },
  { id: 'Capsule',   label: 'Capsule',   Icon: Pill },
  { id: 'Liquid',    label: 'Liquid',    Icon: FlaskConical },
  { id: 'Injection', label: 'Injection', Icon: Syringe },
  { id: 'Drops',     label: 'Drops',     Icon: Droplets },
];

// Validate HH:MM 24h format
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ─── TimePickerInput ──────────────────────────────────────────────────────────
/**
 * Custom time picker with separate HH / MM spinners.
 * Stores & emits value as 24-hour "HH:MM" string.
 * Displays AM/PM badge for clarity.
 * On mobile the native <input type="time"> is exposed as a fallback.
 */
const TimePickerInput = ({ value = '08:00', onChange }) => {
  const [hStr, mStr] = value.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  const emit = useCallback((newH, newM) => {
    onChange(
      `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
    );
  }, [onChange]);

  const stepHour  = (delta) => emit((h + delta + 24) % 24, m);
  const stepMin   = (delta) => {
    let nm = m + delta;
    let nh = h;
    if (nm >= 60) { nm -= 60; nh = (nh + 1) % 24; }
    if (nm < 0)   { nm += 60; nh = (nh - 1 + 24) % 24; }
    emit(nh, nm);
  };

  const parseHourInput  = (raw) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) emit(Math.max(0, Math.min(23, n)), m);
  };
  const parseMinInput   = (raw) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) emit(h, Math.max(0, Math.min(59, n)));
  };

  const period = h >= 12 ? 'PM' : 'AM';
  const h12    = h % 12 || 12;

  const spinBtn = (onClick, Icon, label) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center w-6 h-5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
    >
      <Icon className="w-3 h-3" />
    </button>
  );

  const numInput = (val, onInput, onWheel, ariaLabel, max) => (
    <input
      type="number"
      min={0}
      max={max}
      value={String(val).padStart(2, '0')}
      onChange={(e) => onInput(e.target.value)}
      onWheel={(e) => { e.preventDefault(); onWheel(e.deltaY < 0 ? 1 : -1); }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp')   { e.preventDefault(); onWheel(1); }
        if (e.key === 'ArrowDown') { e.preventDefault(); onWheel(-1); }
      }}
      aria-label={ariaLabel}
      className="w-9 text-center text-base font-bold text-slate-800 bg-transparent border-none outline-none tabular-nums [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );

  return (
    <div className="flex items-center gap-2">
      {/* HH : MM spinner */}
      <div className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        {/* Hours column */}
        <div className="flex flex-col items-center gap-0">
          {spinBtn(() => stepHour(1), ChevronUp, 'Increase hour')}
          {numInput(h, parseHourInput, stepHour, 'Hours (0-23)', 23)}
          {spinBtn(() => stepHour(-1), ChevronDown, 'Decrease hour')}
        </div>

        <span className="text-slate-400 font-bold text-lg select-none pb-0.5">:</span>

        {/* Minutes column */}
        <div className="flex flex-col items-center gap-0">
          {spinBtn(() => stepMin(1), ChevronUp, 'Increase minute')}
          {numInput(m, parseMinInput, stepMin, 'Minutes (0-59)', 59)}
          {spinBtn(() => stepMin(-1), ChevronDown, 'Decrease minute')}
        </div>

        {/* AM / PM badge */}
        <span className={`ml-1.5 self-center text-[11px] font-extrabold px-2 py-0.5 rounded-lg select-none ${
          period === 'AM'
            ? 'bg-sky-100 text-sky-700'
            : 'bg-violet-100 text-violet-700'
        }`}>
          {period}
        </span>
      </div>

      {/* 12-h display label */}
      <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
        {String(h12).padStart(2, '0')}:{String(m).padStart(2, '0')} {period}
      </span>
    </div>
  );
};

// ─── FormSection helper ───────────────────────────────────────────────────────

const FormSection = ({ icon: Icon, title, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
      <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h4>
    </div>
    {children}
  </div>
);

// ─── FieldError helper ────────────────────────────────────────────────────────

const FieldError = ({ msg }) =>
  msg ? <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">⚠ {msg}</p> : null;

// ─── Input classes ────────────────────────────────────────────────────────────

const inputCls = (err) =>
  `w-full px-4 py-3 border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 ${
    err ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
  }`;

// ─── AddReminderForm ──────────────────────────────────────────────────────────

const AddReminderForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    medicineName: initialData?.medicineName || '',
    dosage:       initialData?.dosage || '',
    frequency:    initialData?.frequency || 'Once Daily',
    time:         initialData?.time || ['08:00'],
    startDate:    initialData?.startDate
      ? new Date(initialData.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    endDate: initialData?.endDate
      ? new Date(initialData.endDate).toISOString().split('T')[0]
      : '',
    notes:    initialData?.notes || '',
    status:   initialData?.status || 'Active',
    category: initialData?.category || 'Tablet',
  });

  const [errors, setErrors]          = useState({});
  const [isSubmitting, setSubmitting] = useState(false);

  // ── handlers ──────────────────────────────────────────────────────────────

  const set = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const handleChange = (e) => set(e.target.name, e.target.value);

  const handleFrequencyChange = (freq) => {
    setFormData(prev => ({
      ...prev,
      frequency: freq,
      time: FREQ_DEFAULT_TIMES[freq] || ['08:00'],
    }));
    if (errors.frequency) setErrors(prev => ({ ...prev, frequency: null }));
  };

  const updateTime = (idx, val) => {
    const next = [...formData.time];
    next[idx] = val;
    set('time', next);
  };

  const addTime = () => set('time', [...formData.time, '08:00']);

  const removeTime = (idx) => set('time', formData.time.filter((_, i) => i !== idx));

  // ── validation ────────────────────────────────────────────────────────────

  const validate = () => {
    const e = {};
    if (!formData.medicineName.trim()) e.medicineName = 'Medicine name is required';
    if (!formData.dosage.trim()) e.dosage = 'Dosage is required';
    else if (!/^[\d.]+\s*(mg|g|ml|tablet|capsule|pill|drop|unit)s?$/i.test(formData.dosage))
      e.dosage = 'e.g. 500mg, 1 tablet, 5ml';
    if (!formData.frequency) e.frequency = 'Frequency is required';
    if (!formData.time?.length) {
      e.time = 'At least one time is required';
    } else {
      const badTime = formData.time.find(t => !TIME_REGEX.test(t));
      if (badTime) e.time = `Invalid time format: "${badTime}" — use HH:MM (24h)`;
    }
    if (!formData.startDate) e.startDate = 'Start date is required';
    if (!formData.endDate) e.endDate = 'End date is required';
    else if (new Date(formData.endDate) <= new Date(formData.startDate))
      e.endDate = 'End date must be after start date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        startDate: new Date(formData.startDate),
        endDate:   new Date(formData.endDate),
      });
    } catch {
      // parent handles toast
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── 1. Medicine Info ─────────────────────────────────────────────── */}
      <FormSection icon={Pill} title="Medicine Info">

        {/* Category picker */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
            Type
          </label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => set('category', id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  formData.category === id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
            Medicine Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="medicineName"
            value={formData.medicineName}
            onChange={handleChange}
            placeholder="e.g. Paracetamol"
            className={inputCls(errors.medicineName)}
          />
          <FieldError msg={errors.medicineName} />
        </div>

        {/* Dosage */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
            Dosage <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="dosage"
            value={formData.dosage}
            onChange={handleChange}
            placeholder="e.g. 500mg, 1 tablet, 5ml"
            className={inputCls(errors.dosage)}
          />
          <FieldError msg={errors.dosage} />
        </div>
      </FormSection>

      {/* ── 2. Schedule ──────────────────────────────────────────────────── */}
      <FormSection icon={Clock} title="Schedule">

        {/* Frequency */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 block">
            Frequency <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FREQUENCIES.map(freq => (
              <button
                key={freq}
                type="button"
                onClick={() => handleFrequencyChange(freq)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left transition-all ${
                  formData.frequency === freq
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
          <FieldError msg={errors.frequency} />
        </div>

        {/* ── Reminder Times (custom time picker) ── */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <AlarmClock className="w-4 h-4 text-slate-400" />
            Reminder Times <span className="text-rose-500">*</span>
            <span className="ml-auto text-[10px] font-normal text-slate-400 normal-case tracking-normal">
              Minute-level precision
            </span>
          </label>

          <div className="space-y-2.5">
            {formData.time.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {/* Index badge */}
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                {/* Custom time picker */}
                <div className="flex-1">
                  <TimePickerInput
                    value={t}
                    onChange={(val) => updateTime(idx, val)}
                  />
                </div>

                {/* Remove button */}
                {formData.time.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTime(idx)}
                    aria-label={`Remove time ${idx + 1}`}
                    className="w-8 h-8 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition-all shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {/* Add time */}
            <button
              type="button"
              onClick={addTime}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300 rounded-xl text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Time
            </button>
          </div>

          <FieldError msg={errors.time} />

          {/* Selected times summary chips */}
          {formData.time.length > 1 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {formData.time.map((t, idx) => {
                const [hh, mm] = t.split(':');
                const hour = parseInt(hh, 10);
                const period = hour >= 12 ? 'PM' : 'AM';
                const h12 = hour % 12 || 12;
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                  >
                    <AlarmClock className="w-2.5 h-2.5 text-slate-400" />
                    {String(h12).padStart(2, '0')}:{mm} {period}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </FormSection>

      {/* ── 3. Duration ──────────────────────────────────────────────────── */}
      <FormSection icon={Calendar} title="Duration">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={inputCls(errors.startDate)}
            />
            <FieldError msg={errors.startDate} />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
              End Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className={inputCls(errors.endDate)}
            />
            <FieldError msg={errors.endDate} />
          </div>
        </div>

        {/* Duration preview */}
        {formData.startDate && formData.endDate && new Date(formData.endDate) > new Date(formData.startDate) && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700 font-medium">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            {Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / 86_400_000)} days total course
          </div>
        )}
      </FormSection>

      {/* ── 4. Notes & Status ────────────────────────────────────────────── */}
      <FormSection icon={FileText} title="Notes & Status">
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
            Notes <span className="text-slate-400 font-normal text-xs">(Optional)</span>
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            maxLength={500}
            placeholder="Any additional instructions, e.g. take with food, avoid alcohol..."
            className={`${inputCls()} resize-none`}
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{formData.notes.length}/500</p>
        </div>

        {/* Status — only in edit mode */}
        {initialData && (
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Tag className="w-4 h-4 text-slate-400" />
              Status
            </label>
            <div className="flex gap-2">
              {['Active', 'Suspended', 'Completed'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    formData.status === s
                      ? s === 'Active'    ? 'bg-emerald-600 text-white border-emerald-600'
                      : s === 'Suspended' ? 'bg-amber-500 text-white border-amber-500'
                                          : 'bg-slate-600 text-white border-slate-600'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </FormSection>

      {/* ── Action Buttons ───────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          id="submit-reminder-btn"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-600/25 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
            : initialData ? '✓ Update Reminder' : '+ Add Reminder'
          }
        </button>
      </div>
    </form>
  );
};

export default AddReminderForm;
