import React, { useState } from 'react';
import {
  Footprints,
  Play,
  Square,
  Loader2,
  AlertCircle,
  Trophy,
  Map,
  Flame,
  Activity,
  Clock,
  Sparkles
} from 'lucide-react';
import { useStepCounter } from '../../hooks/useStepCounter';

const StepCounter = ({ dailyGoal = 10000 }) => {
  const {
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

    // Session state
    isSessionActive,
    sessionSteps,
    sessionDuration,
    averageConfidence,
    syncingSession,

    // Pre-session status
    sensorStatus,
  } = useStepCounter();

  const isGoalAchieved = steps >= dailyGoal;
  const progress = dailyGoal > 0 ? Math.min((steps / dailyGoal) * 100, 100) : 0;

  // Format elapsed time (seconds -> mm:ss)
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative bg-white rounded-3xl p-6 border border-slate-200 hover:shadow-xl group overflow-hidden flex flex-col justify-between h-full transition-all duration-300 ${isGoalAchieved
        ? 'ring-2 ring-emerald-500/20 hover:shadow-emerald-100/50 shadow-emerald-50/30'
        : isWalking
          ? 'ring-2 ring-blue-500/20 hover:shadow-blue-100/50 shadow-blue-50/30'
          : 'hover:shadow-slate-200/60 shadow-slate-100/20'
      }`}
    >
      {/* Background Gradient Accent Glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${isGoalAchieved ? 'from-emerald-400 to-teal-500' : 'from-blue-400 to-indigo-600'
        } opacity-5 -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-125`} />

      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isGoalAchieved
                ? 'bg-emerald-50 ring-emerald-100 text-emerald-600'
                : 'bg-blue-50 ring-blue-100 text-blue-600'
              } ring-2 shrink-0`}
            >
              <Footprints className={`w-6 h-6 ${isWalking ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base leading-tight">Step Counter</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Mobile Pedometrics</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Status Badge */}
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${isGoalAchieved
                ? 'bg-emerald-100 text-emerald-700'
                : isWalking
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isGoalAchieved
                  ? 'bg-emerald-500'
                  : isWalking
                    ? 'bg-blue-500 animate-ping'
                    : 'bg-slate-400'
                }`} />
              {isGoalAchieved ? 'Goal Met' : isWalking ? 'Walking' : 'Idle'}
            </span>

            {/* Sync / Buffer Status */}
            {syncingSession ? (
              <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold uppercase tracking-wider animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Syncing Session...
              </span>
            ) : stepCountBuffer > 0 ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase tracking-wider animate-pulse">
                <Activity className="w-3 h-3 animate-pulse" />
                Buffering Gait...
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Synced Live
              </span>
            )}
          </div>
        </div>

        {/* Vital / Value Display */}
        <div className="relative z-10 mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Steps Walked Today
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight tabular-nums transition-all duration-500">
              {steps.toLocaleString()}
            </span>
            <span className="text-slate-400 font-bold text-sm">
              / {dailyGoal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Progress Bar & Status Info */}
        <div className="relative z-10 mb-5">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-100 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${isGoalAchieved
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow shadow-emerald-200'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow shadow-blue-200'
                }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-xs">
            <span className="font-semibold text-slate-500">
              Goal: <span className={isGoalAchieved ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold'}>
                {Math.round(progress)}% Complete
              </span>
            </span>
            {isGoalAchieved ? (
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                Daily Milestone met!
              </span>
            ) : (
              <span className="text-slate-400 font-medium">
                {(dailyGoal - steps).toLocaleString()} steps remaining
              </span>
            )}
          </div>
        </div>

        {/* Grid breakdown for Distance & Calories */}
        <div className="grid grid-cols-2 gap-4 relative z-10 mb-4">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col hover:bg-slate-100/50 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              <Map className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distance</span>
            </div>
            <p className="text-lg font-black text-slate-900 tabular-nums">
              {typeof distance === 'number' ? distance.toFixed(2) : '0.00'}
              <span className="text-xs font-semibold text-indigo-500 ml-0.5">km</span>
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col hover:bg-slate-100/50 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Calories</span>
            </div>
            <p className="text-lg font-black text-slate-900 tabular-nums">
              {typeof calories === 'number' ? Math.floor(calories).toLocaleString() : 0}
              <span className="text-xs font-semibold text-orange-500 ml-0.5">kcal</span>
            </p>
          </div>
        </div>

        {/* --- ACTIVE SESSION HUD (Deliverable 3 & 5) --- */}
        {isSessionActive && (
          <div className="mb-5 p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-2xl relative z-10 animate-fade-in">
            <span className="text-[9px] font-extrabold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 mb-2">
              <Sparkles className="w-2.5 h-2.5 text-blue-600" /> Active Motion Session
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Steps</p>
                <p className="text-xl font-black text-blue-600 tabular-nums mt-0.5">{sessionSteps.toLocaleString()}</p>
              </div>
              <div className="border-x border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                <p className="text-xl font-black text-slate-700 tabular-nums mt-0.5 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {formatTime(sessionDuration)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confidence</p>
                <p className="text-xl font-black text-slate-700 mt-0.5">
                  {(averageConfidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sensor Permission Warnings */}
        {!permissionGranted && !permissionDenied && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-start gap-2.5 mb-4 relative z-10">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Sensors Unlinked:</span> Live sensor telemetry is offline. Activate motion sensors to count steps locally.
            </div>
          </div>
        )}

        {permissionDenied && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start gap-2.5 mb-4 relative z-10">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Sensor Error:</span> Permission denied. Please re-enable browser motion sensors in site settings.
            </div>
          </div>
        )}
      </div>

      {/* Interactive Controls & Developer Console */}
      <div className="relative z-10 space-y-3.5">
        {/* Sensor Status Row (Fix 1) */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-150 text-xs relative z-10">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Sensor Status:</span>
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            {sensorStatus === 'checking' && (
              <>
                <span className="animate-pulse">⏳</span>
                <span className="text-amber-600 font-bold">Checking sensor…</span>
              </>
            )}
            {sensorStatus === 'ready' && (
              <>
                <span className="text-emerald-500">✅</span>
                <span className="text-emerald-700 font-bold">Sensor active — ready to count</span>
              </>
            )}
            {sensorStatus === 'needs-permission' && (
              <>
                <span className="text-orange-500">🔒</span>
                <span className="text-orange-600 font-bold">Enable Motion Sensor</span>
              </>
            )}
            {sensorStatus === 'unavailable' && (
              <>
                <span className="text-red-500">❌</span>
                <span className="text-red-650 font-bold text-[11px] leading-tight">No motion sensor detected on this device</span>
              </>
            )}
            {sensorStatus === 'insecure' && (
              <>
                <span className="text-red-500">⚠️</span>
                <span className="text-red-655 font-bold text-[11px] leading-tight">HTTPS required for motion sensors</span>
              </>
            )}
          </div>
        </div>

        {/* Main session action buttons (Fix 2 & Fix 4) */}
        <div>
          {sensorStatus === 'needs-permission' && (
            <button
              onClick={requestPermission}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl active:scale-[0.98] font-bold text-sm transition-all shadow-md shadow-orange-200/50 hover:shadow-lg"
            >
              <Play className="w-4 h-4 fill-white" />
              Enable Motion Sensor
            </button>
          )}

          {sensorStatus === 'checking' && (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-450 border border-slate-200 rounded-2xl font-bold text-sm cursor-not-allowed animate-pulse"
            >
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              Checking Sensor...
            </button>
          )}

          {sensorStatus === 'insecure' && (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-400 border border-red-200 rounded-2xl font-bold text-sm cursor-not-allowed"
            >

            </button>
          )}

          {sensorStatus === 'unavailable' && (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-450 border border-slate-250 rounded-2xl font-bold text-sm cursor-not-allowed"
            >
              <AlertCircle className="w-4 h-4 text-slate-400" />
              Sensor Unsupported
            </button>
          )}

          {sensorStatus === 'ready' && (
            <div className="flex gap-2.5">
              {!isSessionActive ? (
                <button
                  onClick={startCounting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl active:scale-[0.98] font-bold text-sm transition-all shadow-md shadow-blue-200/50 hover:shadow-lg"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Start Session
                </button>
              ) : (
                <button
                  onClick={stopCounting}
                  disabled={syncingSession}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl hover:bg-red-100 active:scale-[0.98] font-bold text-sm transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {syncingSession ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-red-700" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 fill-red-700 text-red-700" />
                      Stop & Sync Session
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>


      </div>
    </div>
  );
};

export default StepCounter;
