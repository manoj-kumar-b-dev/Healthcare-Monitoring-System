import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Filter, CheckCircle, ClipboardList } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'react-toastify';

const Reports = () => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.reports.getHistory().catch(() => ({ data: [] }));
      setHistory(res.data || []);
    } catch (e) { console.warn('History fetch failed'); }
  };

  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const generateReport = async () => {
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }
    try {
      setGenerating(true);
      const res = await api.reports.generate({ startDate, endDate, format });
      if (res.data) {
        const blob = new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Healthcare_Report_${startDate}_to_${endDate}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success(`Successfully generated ${format.toUpperCase()} report!`);
        fetchHistory();
      } else {
        await new Promise(r => setTimeout(r, 1500));
        toast.success(`Simulated ${format.toUpperCase()} report generated!`);
      }
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const dateInputCls = 'w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium';

  return (
    <div className="max-w-6xl mx-auto py-2 animate-fade-in space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Analytics</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Health Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Generate and export your vital signs history for your physician.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

        {/* Generator Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-sm">Report Configuration</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Quick Ranges */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Quick Date Range</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { days: 7, label: 'Last 7 Days' },
                    { days: 30, label: 'Last 30 Days' },
                    { days: 90, label: 'Last 3 Months' },
                  ].map((r) => (
                    <button
                      key={r.days}
                      onClick={() => setQuickRange(r.days)}
                      className="px-4 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 text-xs font-bold rounded-lg transition-all border border-slate-200"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={dateInputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={dateInputCls} />
                  </div>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Export Format</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'pdf', label: 'PDF Document', sub: 'Charts, tables & visual layouts', icon: FileText, activeColor: 'border-blue-500 bg-blue-50', activeBadge: 'bg-blue-600 text-white', inactiveBadge: 'bg-slate-100 text-slate-600' },
                    { key: 'csv', label: 'CSV Spreadsheet', sub: 'Raw data for analysis & Excel', icon: FileText, activeColor: 'border-emerald-500 bg-emerald-50', activeBadge: 'bg-emerald-600 text-white', inactiveBadge: 'bg-slate-100 text-slate-600' },
                  ].map((f) => (
                    <div
                      key={f.key}
                      onClick={() => setFormat(f.key)}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.01] ${format === f.key ? f.activeColor : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${format === f.key ? f.activeBadge : f.inactiveBadge}`}>
                          <f.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight">{f.label}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{f.sub}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateReport}
                disabled={generating}
                className="w-full flex justify-center items-center gap-2.5 py-4 rounded-xl font-bold text-white text-sm transition-all
                  bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
                  shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                  disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate & Download Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Info Panel */}
        <div className="space-y-5">
          {/* Included items */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-5">
            <h3 className="font-bold text-blue-900 text-sm mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              What's Included
            </h3>
            <ul className="space-y-2.5">
              {[
                'All vital signs (heart rate, SpO₂, temp)',
                'Step count & calculated distances',
                'Calorie burn estimations',
                'Anomaly alerts summary log',
                'Patient profile header',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm">Past Reports</h3>
              </div>
              <div className="p-3 space-y-2">
                {history.slice(0, 4).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{new Date(item.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase">{item.format}</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
