'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, Users, UserCheck, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function JoinEventPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingTeams, setFetchingTeams] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingToken, setExistingToken] = useState<string | null>(null);

  interface TeamInfo {
    id: string;
    name: string;
    color: string;
    memberCount: number;
    capacity: number;
    isLocked: boolean;
  }

  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [eventTitle, setEventTitle] = useState('C ARENA Tournament');

  // Check existing session
  useEffect(() => {
    const savedToken = localStorage.getItem(`c_arena_token_${code}`);
    if (savedToken) {
      setExistingToken(savedToken);
    }
  }, [code]);

  // Fetch live team list and capacities
  const fetchTeams = async () => {
    try {
      const res = await fetch(`/api/events/${code}/snapshot`);
      const data = await res.json();
      if (data.success && data.snapshot) {
        setEventTitle(data.snapshot.event.title);
        const mapped = data.snapshot.leaderboard.map((t: { id: string; name: string; color: string; memberCount: number }) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          memberCount: t.memberCount,
          capacity: 6, // default capacity
          isLocked: false,
        }));
        setTeams(mapped);
        if (mapped.length > 0 && !selectedTeamId) {
          setSelectedTeamId(mapped[0].id);
        }
      } else {
        setError(data.error || 'Tournament not found');
      }
    } catch {
      setError('Could not connect to tournament server');
    } finally {
      setFetchingTeams(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    const interval = setInterval(fetchTeams, 3000);
    return () => clearInterval(interval);
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNumber.trim() || !selectedTeamId) {
      setError('Please fill in your name, roll number, and choose a team.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          rollNumber: rollNumber.trim().toUpperCase(),
          teamId: selectedTeamId,
        }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        localStorage.setItem(`c_arena_token_${code}`, data.session.token);
        router.push(`/play/${code}`);
      } else {
        setError(data.error || 'Failed to join tournament');
      }
    } catch {
      setError('Failed to reach tournament server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-2 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-[0_0_20px_rgba(0,245,160,0.2)]">
            <Terminal className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">C ARENA</h1>
          <p className="text-xs text-slate-400 mt-1">{eventTitle}</p>
          <div className="inline-block mt-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-emerald-400">
            EVENT CODE: <strong>{code}</strong>
          </div>
        </div>

        {/* Existing session resume banner */}
        {existingToken && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Active player session detected!</span>
            </div>
            <button
              onClick={() => router.push(`/play/${code}`)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 flex items-center space-x-1 transition-all"
            >
              <span>RESUME</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Verma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              University Roll Number / Student ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. BCA-2024-042"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono text-sm transition-all uppercase"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Used to prevent duplicate entries and restore your score on reconnect.
            </p>
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Select Your Team</span>
              {fetchingTeams && <span className="text-[10px] text-slate-500">Updating...</span>}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-800 rounded-xl bg-slate-950/40">
              {teams.map((team) => {
                const isSelected = selectedTeamId === team.id;
                const isFull = team.memberCount >= team.capacity;

                return (
                  <button
                    key={team.id}
                    type="button"
                    disabled={isFull || team.isLocked}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400'
                        : isFull
                        ? 'opacity-40 border-slate-800 bg-slate-900/30 cursor-not-allowed'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="text-xs font-bold text-white truncate">{team.name}</span>
                    </div>

                    <div className="text-[10px] font-mono shrink-0 ml-2 text-slate-400">
                      {isFull ? (
                        <span className="text-rose-400 font-semibold">FULL</span>
                      ) : (
                        <span>
                          {team.memberCount}/{team.capacity}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Join Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>ENTERING TOURNAMENT...</span>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>CONFIRM & ENTER LOBBY</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          First student to join an empty team becomes the designated <strong>Team Captain</strong>.
        </div>
      </motion.div>
    </div>
  );
}
