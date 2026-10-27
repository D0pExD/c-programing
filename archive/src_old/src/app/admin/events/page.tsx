'use client';

import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Plus,
  Play,
  Copy,
  RotateCcw,
  ExternalLink,
  Users,
  Trophy,
} from 'lucide-react';
import { TournamentEvent } from '@/types/tournament';

export default function AdminEventsListPage() {
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success && data.events) {
        setEvents(data.events);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newEventTitle.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewEventTitle('');
        fetchEvents();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tournament Event Management</h1>
            <p className="text-xs text-slate-400">
              Create, duplicate, reset, and operate live C programming tournament instances.
            </p>
          </div>
        </div>

        <a
          href="/admin/login"
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white"
        >
          Admin Session
        </a>
      </div>

      {/* Create Event Card */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">
          Create New Tournament
        </h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="e.g. BCA Section B - C Arena Spring 2024"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE EVENT</span>
          </button>
        </form>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          All Events ({events.length})
        </h2>

        {loading ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            Loading tournaments...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-white">{ev.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                      {ev.state}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs font-mono text-slate-400 mt-2">
                    <span>
                      CODE: <strong className="text-emerald-400 text-sm">{ev.code}</strong>
                    </span>
                    <span>• {ev.teams.length} Teams</span>
                    <span>
                      • {ev.teams.reduce((acc, t) => acc + t.members.length, 0)} Students Enrolled
                    </span>
                    <span>• Round {ev.currentRound}/5</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/admin/events/${ev.id}/control`}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>LAUNCH CONTROL ROOM</span>
                  </a>

                  <a
                    href={`/display/${ev.code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center space-x-1"
                  >
                    <span>Projector</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  <a
                    href={`/join/${ev.code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center space-x-1"
                  >
                    <span>Join Link</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
