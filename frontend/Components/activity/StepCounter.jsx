import React from 'react';
import { Footprints, Play, Square, Loader2, AlertCircle } from 'lucide-react';
import { useStepCounter } from '../../hooks/useStepCounter';

const StepCounter = () => {
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
  } = useStepCounter();

  const stepGoal = 10000;
  const progress = Math.min((steps / stepGoal) * 100, 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Footprints className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Step Counter</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isWalking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-xs font-medium text-slate-500">
            {isWalking ? 'Walking' : 'Idle'}
          </span>
        </div>
      </div>

      {!permissionGranted && !permissionDenied && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              Motion sensor permission required for step counting
            </span>
          </div>
        </div>
      )}

      {permissionDenied && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm text-red-700">
            Permission denied. Please enable motion sensors in browser settings.
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <p className="text-4xl font-extrabold text-slate-900 tabular-nums">
          {steps.toLocaleString()}
        </p>
        <p className="text-sm text-slate-500 mt-1">Steps today</p>
        <p className="text-xs text-slate-400 mt-2">/{stepGoal.toLocaleString()} goal</p>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-900">
            {typeof distance === 'number' ? distance.toFixed(2) : '0.00'}
          </p>
          <p className="text-xs text-slate-500">km</p>
        </div>
        <div className="text-center p-3 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-900">
            {typeof calories === 'number' ? Math.floor(calories) : 0}
          </p>
          <p className="text-xs text-slate-500">calories</p>
        </div>
      </div>

      <div className="flex gap-2">
        {!permissionGranted ? (
          <button
            onClick={requestPermission}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            Enable Step Counter
          </button>
        ) : (
          <>
            <button
              onClick={startCounting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Counting
            </button>
            <button
              onClick={stopCounting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          </>
        )}
      </div>

      {stepCountBuffer > 0 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          Syncing {stepCountBuffer} new steps...
        </div>
      )}
    </div>
  );
};

export default StepCounter;