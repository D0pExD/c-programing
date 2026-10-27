'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Terminal,
  Trophy,
  Users,
  Play,
  ArrowRight,
  Shield,
  Layers,
  Crosshair,
  Flame,
  Bug,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    router.push(`/join/${joinCode.trim().toUpperCase()}`);
  };

  const rounds = [
    {
      num: 'ROUND 1',
      title: 'Predict The Output',
      desc: 'Pointers, increment precedence, and string literal memory decay with real-time speed bonuses.',
      icon: Terminal,
      color: 'text-emerald-400',
    },
    {
      num: 'ROUND 2',
      title: 'Debug The Code',
      desc: 'Identify off-by-one errors and broken scanf pointers with clickable line numbers.',
      icon: Bug,
      color: 'text-blue-400',
    },
    {
      num: 'ROUND 3',
      title: 'Array Battleship',
      desc: 'Answer 2D array row-major memory mapping questions to unlock radar strikes on a 4×4 team grid.',
      icon: Crosshair,
      color: 'text-purple-400',
    },
    {
      num: 'ROUND 4',
      title: 'Recursion Rush',
      desc: 'Factorials and missing base conditions with animated step-by-step recursive stack frame unwinding.',
      icon: Layers,
      color: 'text-pink-400',
    },
    {
      num: 'ROUND 5',
      title: 'Final Boss Wager',
      desc: 'Double pointers and static memory. Top qualifying teams risk their points in high-stakes wagers.',
      icon: Flame,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* Top Navigation */}
      <header className="px-6 sm:px-12 py-5 border-b border-slate-800/80 flex items-center justify-between backdrop-blur-md sticky top-0 z-50 bg-[#070B14]/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(0,245,160,0.25)]">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <span className="font-black text-lg tracking-wider text-white">C ARENA</span>
            <span className="block text-[10px] text-slate-500 font-mono">BCA TOURNAMENT PLATFORM</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-bold">
          <a
            href="/display/CARENA"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all"
          >
            <span>Projector Display</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="/admin/events"
            className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all shadow"
          >
            HOST CONSOLE
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 sm:py-24 max-w-5xl mx-auto text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>REAL-TIME MULTIPLAYER CLASSROOM ESPORTS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Battle for the Podium in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
              ANSI C99
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Engineered for university BCA classrooms. 40–80 students compete in synchronized teams,
            answering C challenges from their mobile phones while a high-definition spectator view
            drives the main hall projector.
          </p>
        </motion.div>

        {/* Join Code Input Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="max-w-md mx-auto"
        >
          <form
            onSubmit={handleJoin}
            className="p-2 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex items-center shadow-2xl backdrop-blur-xl"
          >
            <input
              type="text"
              required
              placeholder="ENTER 6-DIGIT CODE (e.g. CARENA)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-3 bg-transparent text-white placeholder-slate-500 font-mono text-sm tracking-wider focus:outline-none uppercase"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/25 transition-all"
            >
              <span>ENTER</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-center space-x-4 mt-3 text-xs text-slate-500">
            <span>Demo Session: <strong className="text-emerald-400 font-mono">CARENA</strong></span>
            <span>•</span>
            <a href="/join/CARENA" className="text-slate-400 hover:text-white underline">
              Direct Demo Join
            </a>
          </div>
        </motion.div>
      </section>

      {/* 5 Tournament Rounds Feature Cards */}
      <section className="px-6 py-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-8">
          <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest">
            THE 5 BATTLE STAGES
          </span>
          <h2 className="text-2xl font-black text-white mt-1">Multi-Round Tournament Structure</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rounds.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.num}
                className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {r.num}
                    </span>
                    <Icon className={`w-5 h-5 ${r.color}`} />
                  </div>
                  <h3 className="font-bold text-base text-white">{r.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            );
          })}

          {/* Quick Host Launcher Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-blue-950/30 border border-emerald-500/30 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">
                ADMIN CONSOLE
              </span>
              <h3 className="font-bold text-base text-white mt-2">Live Game Control Room</h3>
              <p className="text-xs text-slate-400 mt-1">
                Operate the entire tournament with keyboard shortcuts, lock submissions, reveal answers,
                and export CSV attendance.
              </p>
            </div>
            <a
              href="/admin/events"
              className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow"
            >
              <span>ACCESS CONTROL ROOM</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-slate-800/80 text-center text-xs text-slate-500 font-mono">
        C ARENA • High-Performance Real-Time Classroom Tournament Platform • University BCA First Year
      </footer>
    </div>
  );
}
