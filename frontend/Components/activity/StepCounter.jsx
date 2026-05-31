import React, { useState, useEffect } from 'react';
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
  Terminal,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle
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
    
    // Debug hooks
    isDebugMode,
    setIsDebugMode,
    debugData,
    runLifecycleTest
  } = useStepCounter();

  // Compute diagnostics values for real-time overlay
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isSecure = isHttps || isLocalhost;
  
  const deviceMotionSupported = typeof DeviceMotionEvent !== 'undefined';
  const permissionApiState = !deviceMotionSupported 
    ? 'unsupported' 
    : typeof DeviceMotionEvent.requestPermission === 'function' 
      ? (permissionDenied ? 'denied' : 'exists') 
      : 'not required';

  // Local state for sparkline magnitude history
  const [magnitudeHistory, setMagnitudeHistory] = useState([]);

  useEffect(() => {
    if (isDebugMode && debugData.smoothedMagnitude !== undefined) {
      setMagnitudeHistory(prev => {
        const next = [...prev, debugData.smoothedMagnitude];
        if (next.length > 60) next.shift(); // 60 samples sliding history
        return next;
      });
    } else if (!isDebugMode) {
      setMagnitudeHistory([]);
    }
  }, [debugData.smoothedMagnitude, isDebugMode]);

  const isGoalAchieved = steps >= dailyGoal;
  const progress = dailyGoal > 0 ? Math.min((steps / dailyGoal) * 100, 100) : 0;

  // Format elapsed time (seconds -> mm:ss)
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sparkline coordinates mapper
  const getSparklinePoints = () => {
    if (magnitudeHistory.length < 2) return '';
    const svgWidth = 340;
    const svgHeight = 60;
    
    // Scale dynamically, keep a baseline range to prevent extreme scaling
    const maxVal = Math.max(...magnitudeHistory, 2.0);
    const minVal = Math.min(...magnitudeHistory, -2.0);
    const range = maxVal - minVal || 1.0;

    return magnitudeHistory.map((val, idx) => {
      const x = (idx / (magnitudeHistory.length - 1)) * svgWidth;
      // Invert Y axis for SVG rendering
      const y = svgHeight - ((val - minVal) / range) * svgHeight;
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className={`relative bg-white rounded-3xl p-6 border border-slate-200 hover:shadow-xl group overflow-hidden flex flex-col justify-between h-full transition-all duration-300 ${
      isGoalAchieved 
        ? 'ring-2 ring-emerald-500/20 hover:shadow-emerald-100/50 shadow-emerald-50/30' 
        : isWalking 
          ? 'ring-2 ring-blue-500/20 hover:shadow-blue-100/50 shadow-blue-50/30' 
          : 'hover:shadow-slate-200/60 shadow-slate-100/20'
      }`}
    >
      {/* Background Gradient Accent Glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${
        isGoalAchieved ? 'from-emerald-400 to-teal-500' : 'from-blue-400 to-indigo-600'
      } opacity-5 -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-125`} />

      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              isGoalAchieved 
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
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isGoalAchieved 
                ? 'bg-emerald-100 text-emerald-700' 
                : isWalking 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-slate-100 text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isGoalAchieved 
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
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                isGoalAchieved 
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
              <AlertCircle className="w-4 h-4 text-red-400" />
              HTTPS Required for Sensors
            </button>
          )}

          {sensorStatus === 'unavailable' && (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-450 border border-slate-250 rounded-2xl font-bold text-sm cursor-not-allowed"
            >
              <XCircle className="w-4 h-4 text-slate-400" />
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

        {/* --- DEVELOPER PANEL & REAL-TIME PLOTTER (Deliverable 6) --- */}
        {sensorStatus !== 'checking' && (
          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={() => setIsDebugMode(prev => !prev)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1.5 px-3 bg-slate-50 rounded-xl border border-slate-150"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                Pedometric DSP Monitor
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                isDebugMode ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {isDebugMode ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Expandable Debug Console */}
            {isDebugMode && (
              <div className="mt-3 bg-slate-950 text-slate-300 rounded-2xl p-4 border border-slate-850 font-mono text-[10px] space-y-3 shadow-inner max-h-[380px] overflow-y-auto animate-slide-down">
                
                {/* Real-time Diagnostics Panel */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-slate-300">
                  <p className="text-slate-450 font-bold uppercase tracking-wider text-[9px] mb-2 flex items-center gap-1 border-b border-slate-800 pb-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Sensor Health Diagnostics
                  </p>
                  <div className="grid grid-cols-1 gap-1 text-[10px] leading-relaxed">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Protocol:</span>
                      <span className="font-semibold text-slate-350">
                        {isSecure ? 'https ✅' : 'http ❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">DeviceMotionEvent:</span>
                      <span className="font-semibold text-slate-350">
                        {deviceMotionSupported ? 'supported ✅' : 'unsupported ❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Permission API:</span>
                      <span className="font-semibold text-slate-350">
                        {permissionApiState === 'exists' ? 'exists ✅' : permissionApiState === 'not required' ? 'not required ✅' : 'denied ❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last reading:</span>
                      <span className="font-semibold tabular-nums text-indigo-300">
                        x: {(debugData.lastReading?.x ?? 0).toFixed(2)}  y: {(debugData.lastReading?.y ?? 0).toFixed(2)}  z: {(debugData.lastReading?.z ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sample rate:</span>
                      <span className="font-semibold tabular-nums text-emerald-400">
                        {debugData.sampleRate ?? 0} Hz
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Null readings:</span>
                      <span className="font-semibold tabular-nums text-amber-400">
                        {debugData.nullReadingsCount ?? 0} / 50
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className={`font-bold uppercase ${
                        sensorStatus === 'ready' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {sensorStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. Oscilloscope Sparkline */}
                <div>
                  <p className="text-slate-450 font-bold uppercase tracking-wider text-[9px] mb-1.5 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-blue-500 animate-pulse" /> Real-time Gait Sparkline (Smoothed Mag)
                  </p>
                  <div className="relative h-16 w-full bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
                    {magnitudeHistory.length > 1 ? (
                      <svg className="w-full h-full" viewBox="0 0 340 60" preserveAspectRatio="none">
                        <polyline
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          points={getSparklinePoints()}
                          className="drop-shadow-[0_0_6px_rgba(59,130,246,0.65)]"
                        />
                      </svg>
                    ) : (
                      <span className="text-slate-600 text-[9px]">Awaiting telemetry stream...</span>
                    )}
                  </div>
                </div>

                {/* 2. Numeric Readouts */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-900 text-slate-400">
                  <div>
                    <span className="text-slate-600 font-bold uppercase">Raw magnitude:</span>
                    <span className="float-right text-slate-200 tabular-nums">{(debugData.rawMagnitude || 0).toFixed(3)} m/s²</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-bold uppercase">Smoothed:</span>
                    <span className="float-right text-blue-400 font-bold tabular-nums">{(debugData.smoothedMagnitude || 0).toFixed(3)} m/s²</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-bold uppercase">Threshold:</span>
                    <span className="float-right text-amber-500 tabular-nums">11.5 m/s²</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-bold uppercase">Last step at:</span>
                    <span className="float-right text-slate-200 tabular-nums">{debugData.lastStepAt || 'Never'}</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-900 pt-1.5 mt-0.5 flex justify-between items-center">
                    <span className="text-slate-600 font-bold uppercase">Total steps:</span>
                    <span className="font-black text-emerald-500 tabular-nums">
                      {debugData.totalSteps || 0}
                    </span>
                  </div>
                </div>

                {/* 3. Real-time Peak Audit Log */}
                <div>
                  <p className="text-slate-450 font-bold uppercase tracking-wider text-[9px] mb-1.5">
                    Live Peak Evaluation Log (Last 5)
                  </p>
                  <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                    {debugData.recentPeaks && debugData.recentPeaks.length > 0 ? (
                      debugData.recentPeaks.map((peak, idx) => (
                        <div key={idx} className="bg-slate-900/40 border border-slate-900/80 p-2 rounded-xl flex items-start justify-between gap-2 leading-relaxed">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-550 font-semibold">{peak.time}</span>
                              <span className="text-slate-600">|</span>
                              <span className="text-slate-400">Peak Height: <b className="text-slate-200">{peak.height}</b></span>
                            </div>
                            <p className="text-slate-500 text-[9px]">Reason: {peak.reason}</p>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1 shrink-0 ${
                            peak.status === 'Accepted' 
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60' 
                              : 'bg-red-950 text-red-400 border border-red-900/60'
                          }`}>
                            {peak.status === 'Accepted' ? (
                              <>
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                {peak.confidence * 100}%
                              </>
                            ) : (
                              <>
                                <XCircle className="w-2.5 h-2.5 text-red-400" />
                                REJ
                              </>
                            )}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-600 text-center py-2 italic">Awaiting walking peaks...</p>
                    )}
                  </div>
                </div>

                {/* 4. Automated Start/Stop Audit Trigger */}
                <div className="pt-2 border-t border-slate-850">
                  <button
                    onClick={runLifecycleTest}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-950 border border-indigo-900 text-indigo-350 hover:bg-indigo-900/40 rounded-xl font-bold transition-all active:scale-[0.98]"
                  >
                    <Zap className="w-3.5 h-3.5 fill-indigo-400 text-indigo-400 animate-pulse" />
                    Trigger System Audit (Start → Stop × 5)
                  </button>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StepCounter;
