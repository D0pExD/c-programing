'use client';

import React from 'react';
import { Trophy } from 'lucide-react';

export interface LeaderboardItem {
  id: string;
  name: string;
  rollNo: string;
  score: number;
  rank: number;
  correctCount: number;
  totalTimeMs: number;
  lastPoints?: number;
}

export function Leaderboard({
  items,
  currentUserId,
}: {
  items: LeaderboardItem[];
  currentUserId?: string;
}) {
  if (!items || items.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 font-mono text-xs">
        No students have submitted answers yet.
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-w-2xl mx-auto w-full">
      {items.map((item) => {
        const isMe = currentUserId === item.id;
        let rankBadge = 'bg-slate-800 text-slate-400 border-slate-700';

        if (item.rank === 1) {
          rankBadge = 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]';
        } else if (item.rank === 2) {
          rankBadge = 'bg-slate-300 text-slate-950 border-slate-200 font-black';
        } else if (item.rank === 3) {
          rankBadge = 'bg-amber-700 text-amber-100 border-amber-600 font-bold';
        }

        return (
          <div
            key={item.id}
            className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between transition-all ${
              isMe
                ? 'bg-emerald-500/15 border-emerald-400 shadow-[0_0_20px_rgba(0,245,160,0.15)] ring-1 ring-emerald-400'
                : item.rank === 1
                ? 'bg-amber-950/20 border-amber-500/40 shadow-lg'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Left: Rank & Name */}
            <div className="flex items-center space-x-3.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 border ${rankBadge}`}
              >
                {item.rank === 1 ? <Trophy className="w-4 h-4" /> : `#${item.rank}`}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm sm:text-base truncate">
                    {item.name}
                  </span>
                  {isMe && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      YOU
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono mt-0.5">
                  <span>PRN: {item.rollNo}</span>
                  <span>• {item.correctCount} correct</span>
                </div>
              </div>
            </div>

            {/* Right: Score (Most points wins) */}
            <div className="text-right shrink-0 pl-3">
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-400">
                {item.score.toLocaleString()}{' '}
                <span className="text-[10px] font-sans text-slate-400 font-bold">PTS</span>
              </div>
              {item.lastPoints && item.lastPoints > 0 ? (
                <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                  +{item.lastPoints} last round
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
