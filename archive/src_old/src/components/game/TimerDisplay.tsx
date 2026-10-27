'use client';

import React, { useState, useEffect } from 'react';
import { Timer, Pause } from 'lucide-react';

interface TimerDisplayProps {
  deadline?: string;
  pausedRemainingSeconds?: number;
  totalSeconds: number;
  isPaused?: boolean;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  deadline,
  pausedRemainingSeconds,
  totalSeconds,
  isPaused = false,
}) => {
  const [remaining, setRemaining] = useState<number>(totalSeconds);

  useEffect(() => {
    if (isPaused && pausedRemainingSeconds !== undefined) {
      setRemaining(pausedRemainingSeconds);
      return;
    }

    if (!deadline) {
      setRemaining(totalSeconds);
      return;
    }

    const targetTime = new Date(deadline).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((targetTime - now) / 1000));
      setRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [deadline, pausedRemainingSeconds, totalSeconds, isPaused]);

  const percentage = Math.max(0, Math.min(100, (remaining / (totalSeconds || 1)) * 100));
  const isCritical = remaining <= 5 && remaining > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Time and Icon badge */}
      <div
        className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border transition-all ${
          isPaused
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : isCritical
            ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}
      >
        {isPaused ? (
          <Pause className="w-4 h-4 text-amber-400" />
        ) : (
          <Timer className="w-4 h-4 text-emerald-400" />
        )}
        <span className="font-mono font-black text-xl tracking-wider">
          {isPaused ? `PAUSED (${remaining}s)` : `${remaining}s`}
        </span>
      </div>

      {/* Progress line */}
      <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isCritical ? 'bg-rose-500' : isPaused ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
