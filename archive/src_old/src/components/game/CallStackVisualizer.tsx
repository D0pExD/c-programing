'use client';

import React, { useState, useEffect } from 'react';
import { Layers, ArrowDown, ArrowUp, CheckCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CallStackFrame } from '@/types/tournament';

interface CallStackVisualizerProps {
  frames: CallStackFrame[];
}

export const CallStackVisualizer: React.FC<CallStackVisualizerProps> = ({ frames }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isUnwinding, setIsUnwinding] = useState(false);

  // Auto-advance through stack trace steps for interactive reveal
  useEffect(() => {
    if (!frames || frames.length === 0) return;
    setCurrentStep(0);
    setIsUnwinding(false);

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < frames.length) {
          return prev + 1;
        } else {
          setIsUnwinding(true);
          return prev;
        }
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [frames]);

  if (!frames || frames.length === 0) return null;

  return (
    <div className="bg-slate-900/95 border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white tracking-wide">
            C RECURSION CALL STACK TRACE
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {isUnwinding ? (
              <span className="flex items-center gap-1">
                <ArrowUp className="w-3.5 h-3.5 text-purple-400 animate-bounce" />
                UNWINDING RETURN VALUES
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <ArrowDown className="w-3.5 h-3.5 text-purple-400 animate-bounce" />
                GROWING STACK FRAMES
              </span>
            )}
          </span>
          <button
            onClick={() => {
              setCurrentStep(0);
              setIsUnwinding(false);
            }}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            title="Replay trace"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stack Frames Container (rendered top-to-bottom or push-down) */}
      <div className="space-y-3 font-mono">
        <AnimatePresence>
          {frames.map((frame, index) => {
            const isPushed = index < currentStep;
            if (!isPushed) return null;

            return (
              <motion.div
                key={frame.call}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className={`p-4 rounded-xl border transition-all ${
                  index === frames.length - 1
                    ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
                style={{ marginLeft: `${(frame.depth - 1) * 16}px` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-purple-400 font-bold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                      DEPTH {frame.depth}
                    </span>
                    <span className="text-sm font-bold text-slate-100">{frame.call}</span>
                  </div>

                  {/* Return value */}
                  {isUnwinding ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{frame.returns}</span>
                    </motion.div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">activation active...</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
