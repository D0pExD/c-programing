'use client';

import React from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, CheckCircle2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LeaderboardItem {
  id: string;
  name: string;
  color: string;
  score: number;
  rank: number;
  prevRank?: number;
  correctCount: number;
  memberCount: number;
  hasSubmittedCurrent?: boolean;
}

interface LeaderboardTableProps {
  items: LeaderboardItem[];
  highlightTeamId?: string;
  compact?: boolean;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  items,
  highlightTeamId,
  compact = false,
}) => {
  return (
    <div className="w-full">
      <div className="space-y-2.5">
        <AnimatePresence>
          {items.map((item) => {
            const isHighlighted = highlightTeamId === item.id;
            const rankDiff = item.prevRank ? item.prevRank - item.rank : 0;

            const isPodium = item.rank <= 3;
            let rankBadgeColor = 'bg-slate-800 text-slate-400';
            if (item.rank === 1) rankBadgeColor = 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]';
            if (item.rank === 2) rankBadgeColor = 'bg-slate-300 text-slate-950';
            if (item.rank === 3) rankBadgeColor = 'bg-amber-700 text-white';

            return (
              <motion.div
                key={item.id}
                layout
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isHighlighted
                    ? 'bg-emerald-500/15 border-emerald-400/60 shadow-[0_0_20px_rgba(0,245,160,0.15)] ring-1 ring-emerald-400'
                    : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Left: Rank & Team */}
                <div className="flex items-center space-x-3.5 min-w-0">
                  {/* Rank circle */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${rankBadgeColor}`}
                  >
                    {item.rank === 1 ? <Trophy className="w-4 h-4" /> : `#${item.rank}`}
                  </div>

                  {/* Team Color indicator and Name */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-bold text-slate-100 text-sm truncate">
                        {item.name}
                      </span>
                      {isHighlighted && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          YOU
                        </span>
                      )}
                    </div>

                    {!compact && (
                      <div className="flex items-center space-x-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>{item.memberCount}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{item.correctCount} correct</span>
                        </span>
                        {item.hasSubmittedCurrent && (
                          <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">
                            • Answer Submitted
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Score and Movement */}
                <div className="flex items-center space-x-3 shrink-0 pl-3">
                  {/* Rank delta */}
                  {!compact && (
                    <div className="text-xs font-mono flex items-center">
                      {rankDiff > 0 && (
                        <span className="text-emerald-400 flex items-center">
                          <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{rankDiff}
                        </span>
                      )}
                      {rankDiff < 0 && (
                        <span className="text-rose-400 flex items-center">
                          <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {rankDiff}
                        </span>
                      )}
                      {rankDiff === 0 && (
                        <span className="text-slate-600 flex items-center">
                          <Minus className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  )}

                  {/* Total Points */}
                  <div className="text-right">
                    <div className="text-base font-black font-mono text-emerald-400">
                      {item.score.toLocaleString()} <span className="text-[10px] font-sans text-slate-400">PTS</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
