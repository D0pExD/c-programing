'use client';

import React, { useState, useEffect, use } from 'react';
import { Trophy, Terminal, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { AuthoritativeSnapshot } from '@/types/tournament';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';

export default function PublicResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code.toUpperCase();

  const [snapshot, setSnapshot] = useState<AuthoritativeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${code}/snapshot`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.snapshot) {
          setSnapshot(data.snapshot);
        }
      })
      .finally(() => setLoading(false));
  }, [code]);

  if (loading || !snapshot) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-slate-400 font-mono">
        Loading tournament results...
      </div>
    );
  }

  const { event, leaderboard } = snapshot;

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 p-8 space-y-8 max-w-4xl mx-auto">
      <div className="text-center py-6">
        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">
          TOURNAMENT RESULTS
        </h1>
        <p className="text-xs text-slate-400 mt-1">{event.title}</p>
        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400">
          EVENT CODE: {code}
        </span>
      </div>

      {/* Top 3 Winners Card */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center order-2 sm:order-1">
            <span className="text-xl font-black text-slate-400">2ND PLACE</span>
            <h3 className="font-bold text-white text-base mt-1">{leaderboard[1].name}</h3>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-2">
              {leaderboard[1].score} PTS
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-center order-1 sm:order-2 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
              CHAMPIONS
            </span>
            <span className="text-2xl font-black text-amber-400">1ST PLACE</span>
            <h3 className="font-black text-white text-lg mt-1">{leaderboard[0].name}</h3>
            <div className="text-2xl font-mono font-black text-amber-400 mt-2">
              {leaderboard[0].score} PTS
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center order-3">
            <span className="text-xl font-black text-amber-700">3RD PLACE</span>
            <h3 className="font-bold text-white text-base mt-1">{leaderboard[2].name}</h3>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-2">
              {leaderboard[2].score} PTS
            </div>
          </div>
        </div>
      )}

      {/* Complete Rankings */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <span>Complete Final Standings</span>
        </h2>
        <LeaderboardTable items={leaderboard} />
      </div>
    </div>
  );
}
