'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import {
  Users,
  Shield,
  Lock,
  Unlock,
  UserCheck,
  ChevronLeft,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { TournamentEvent, Team, Player } from '@/types/tournament';

export default function AdminLobbyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [event, setEvent] = useState<TournamentEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success && data.events) {
        const found = data.events.find((e: TournamentEvent) => e.id === eventId);
        if (found) {
          setEvent(found);
          if (!selectedTeam) setSelectedTeam(found.teams[0] || null);
          else {
            const updatedSelected = found.teams.find((t: Team) => t.id === selectedTeam.id);
            if (updatedSelected) setSelectedTeam(updatedSelected);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, selectedTeam]);

  useEffect(() => {
    fetchEvent();
    const interval = setInterval(fetchEvent, 2000);
    return () => clearInterval(interval);
  }, [fetchEvent]);

  const handleUpdateCaptain = async (teamId: string, newCaptainId: string) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CAPTAIN',
          teamId,
          newCaptainId,
        }),
      });
      const data = await res.json();
      if (data.success) fetchEvent();
      else alert(data.error || 'Failed to update captain');
    } catch {
      alert('Error updating captain');
    }
  };

  const handleToggleLock = async (teamId: string) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_LOCK',
          teamId,
        }),
      });
      const data = await res.json();
      if (data.success) fetchEvent();
    } catch {
      alert('Error toggling lock');
    }
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-slate-400 font-mono">
        Loading lobby data...
      </div>
    );
  }

  const totalStudents = event.teams.reduce((acc, t) => acc + t.members.length, 0);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <a
            href={`/admin/events/${eventId}/control`}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-xl font-bold text-white">Lobby & Team Roster</h1>
            <p className="text-xs text-slate-400">
              Manage participant assignments, captain authorization, and team capacity.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
            {totalStudents} TOTAL STUDENTS
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            {event.teams.length} FORMED TEAMS
          </span>
        </div>
      </div>

      {/* Grid: Teams list on left, Selected team roster on right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left (5 cols): Teams list */}
        <div className="md:col-span-5 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Teams ({event.teams.length})
          </h2>
          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {event.teams.map((t) => {
              const isSelected = selectedTeam?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTeam(t)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-400 ring-1 ring-emerald-400'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="font-bold text-sm text-white">{t.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {t.members.length}/6
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLock(t.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title={t.isLocked ? 'Unlock team' : 'Lock team'}
                      >
                        {t.isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                    <span>
                      Captain: <strong className="text-slate-200">{t.captainName || 'None'}</strong>
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">{t.score} PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right (7 cols): Selected Team Roster */}
        <div className="md:col-span-7">
          {selectedTeam ? (
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedTeam.color }}
                  />
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedTeam.name} Roster</h2>
                    <p className="text-xs text-slate-400">
                      {selectedTeam.members.length} Members Enrolled
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleLock(selectedTeam.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border ${
                    selectedTeam.isLocked
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {selectedTeam.isLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>TEAM LOCKED</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>LOCK SLOTS</span>
                    </>
                  )}
                </button>
              </div>

              {/* Members Table */}
              {selectedTeam.members.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No students have joined this team yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTeam.members.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-200">{member.name}</span>
                            {member.isCaptain && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                CAPTAIN
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-slate-400">
                            {member.rollNumber} • Joined {new Date(member.joinedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      {/* Captain assignment switch */}
                      {!member.isCaptain && (
                        <button
                          onClick={() => handleUpdateCaptain(selectedTeam.id, member.id)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold"
                        >
                          Make Captain
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">
              Select a team on the left to inspect and manage its members.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
