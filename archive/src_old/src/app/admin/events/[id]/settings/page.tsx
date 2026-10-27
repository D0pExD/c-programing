'use client';

import React, { useState, useEffect, use } from 'react';
import { Settings, ChevronLeft, Save, Sliders, Shield } from 'lucide-react';
import { TournamentEvent } from '@/types/tournament';

export default function AdminSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [event, setEvent] = useState<TournamentEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamCapacity, setTeamCapacity] = useState(6);
  const [enableSpeedBonus, setEnableSpeedBonus] = useState(true);
  const [allowNegativeScore, setAllowNegativeScore] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.events) {
          const found = data.events.find((e: TournamentEvent) => e.id === eventId);
          if (found) {
            setEvent(found);
            setTeamCapacity(found.settings.teamCapacity);
            setEnableSpeedBonus(found.settings.enableSpeedBonus);
            setAllowNegativeScore(found.settings.allowNegativeFinalScore);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (event) {
      setEvent({
        ...event,
        settings: {
          ...event.settings,
          teamCapacity,
          enableSpeedBonus,
          allowNegativeFinalScore: allowNegativeScore,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-slate-400 font-mono">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-6 border-b border-slate-800">
        <a
          href={`/admin/events/${eventId}/control`}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            <span>Tournament Configuration Settings</span>
          </h1>
          <p className="text-xs text-slate-400">
            Rules, capacity constraints, speed bonus multipliers, and wager boundaries.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-xl">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Team & Roster Rules</span>
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Maximum Team Capacity (Students per Team)
            </label>
            <input
              type="number"
              min={2}
              max={15}
              value={teamCapacity}
              onChange={(e) => setTeamCapacity(parseInt(e.target.value) || 6)}
              className="w-48 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Joining endpoint automatically prevents teams from exceeding this student count.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="speedBonus"
                checked={enableSpeedBonus}
                onChange={(e) => setEnableSpeedBonus(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800"
              />
              <label htmlFor="speedBonus" className="text-xs font-bold text-slate-200 cursor-pointer">
                Enable Real-Time Speed Bonuses (Round 1: 0–50 PTS based on server time)
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="negScore"
                checked={allowNegativeScore}
                onChange={(e) => setAllowNegativeScore(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800"
              />
              <label htmlFor="negScore" className="text-xs font-bold text-slate-200 cursor-pointer">
                Allow Negative Scores in Round 5 Final Boss Wagers
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {saved ? (
            <span className="text-xs text-emerald-400 font-bold">
              Settings updated successfully!
            </span>
          ) : <span />}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            <span>SAVE CONFIGURATION</span>
          </button>
        </div>
      </form>
    </div>
  );
}
