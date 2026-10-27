'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Terminal,
  Trophy,
  Users,
  Maximize,
  Minimize,
  Radio,
  Lock,
  Sparkles,
  Award,
  Layers,
  Crosshair,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CodeViewer } from '@/components/common/CodeViewer';
import { TimerDisplay } from '@/components/game/TimerDisplay';
import { CallStackVisualizer } from '@/components/game/CallStackVisualizer';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { AuthoritativeSnapshot } from '@/types/tournament';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProjectorDisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code.toUpperCase();

  const [snapshot, setSnapshot] = useState<AuthoritativeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');

  // Set join URL on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJoinUrl(`${window.location.origin}/join/${code}`);
    }
  }, [code]);

  // Fetch authoritative snapshot
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${code}/snapshot`);
      const data = await res.json();
      if (data.success && data.snapshot) {
        setSnapshot(data.snapshot);
      }
    } catch {
      // offline / reconnecting
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 1500);
    return () => clearInterval(interval);
  }, [fetchSnapshot]);

  // Fire celebratory confetti when event is FINISHED
  useEffect(() => {
    if (snapshot?.event.state === 'FINISHED') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00F5A0', '#F59E0B', '#3B82F6', '#8B5CF6'],
      });
    }
  }, [snapshot?.event.state]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (loading || !snapshot) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-400">
        <Radio className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold font-mono text-white">INITIALIZING PROJECTOR FEED...</h2>
        <p className="text-sm text-slate-500 mt-2 font-mono">Synchronizing with C Arena Core</p>
      </div>
    );
  }

  const { event, currentQuestion, leaderboard, totalParticipants, totalTeams } = snapshot;
  const submittedCount = leaderboard.filter((t) => t.hasSubmittedCurrent).length;

  return (
    <div className="min-h-screen w-screen bg-[#060913] text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      {/* Top Bar for Projector */}
      <header className="px-8 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(0,245,160,0.25)]">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-xl tracking-wider text-white">C ARENA</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <h1 className="text-xs text-slate-400 font-medium">{event.title}</h1>
          </div>
        </div>

        {/* Center Round / State Indicator */}
        <div className="flex items-center space-x-3">
          {event.state === 'RUNNING' && currentQuestion && (
            <div className="px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 flex items-center space-x-2 text-sm font-bold">
              <span className="text-emerald-400 font-mono">ROUND {currentQuestion.round}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-200">
                {currentQuestion.round === 1 && 'PREDICT THE OUTPUT'}
                {currentQuestion.round === 2 && 'DEBUG THE CODE'}
                {currentQuestion.round === 3 && 'ARRAY BATTLESHIP'}
                {currentQuestion.round === 4 && 'RECURSION RUSH'}
                {currentQuestion.round === 5 && 'FINAL BOSS'}
              </span>
            </div>
          )}
        </div>

        {/* Right Stats & Fullscreen */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>
                <strong className="text-white text-sm">{totalParticipants}</strong> Students
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>
                <strong className="text-white text-sm">{totalTeams}</strong> Teams
              </span>
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            title="Toggle 16:9 Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main 16:9 Center Display Area */}
      <main className="flex-1 p-8 flex items-center justify-center">
        {/* MODE 1: LOBBY (Large QR code and Join URL) */}
        {event.state === 'LOBBY_OPEN' || event.state === 'LOBBY_LOCKED' ? (
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Giant QR Code Card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 flex flex-col items-center justify-center shadow-2xl relative"
            >
              <div className="p-4 bg-white rounded-2xl shadow-2xl mb-6">
                {joinUrl && <QRCodeSVG value={joinUrl} size={260} level="H" />}
              </div>

              <div className="text-center">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-1">
                  JOIN FROM YOUR MOBILE PHONE
                </span>
                <div className="text-4xl font-black font-mono tracking-widest text-emerald-400 electric-glow py-1">
                  {code}
                </div>
                <div className="text-sm font-mono text-slate-400 mt-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                  {joinUrl || `http://.../join/${code}`}
                </div>
              </div>
            </motion.div>

            {/* Right: Team Capacity and Waiting Banner */}
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">
                  UNIVERSITY BCA TOURNAMENT
                </span>
                <h2 className="text-4xl font-black text-white mt-1 leading-tight tracking-tight">
                  Scan QR Code to Join Your Team
                </h2>
                <p className="text-slate-400 text-base mt-2">
                  First member to join each team becomes the official Captain with submission
                  powers. Waiting for tournament host to initiate Round 1...
                </p>
              </div>

              {/* Live Teams Grid */}
              <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2">
                {leaderboard.map((team) => (
                  <div
                    key={team.id}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="font-bold text-sm text-slate-200 truncate">{team.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {team.memberCount}/6
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : event.state === 'FINISHED' ? (
          /* MODE 8: WINNERS PODIUM */
          <div className="w-full max-w-5xl text-center py-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
                <Trophy className="w-10 h-10" />
              </div>
              <h2 className="text-4xl font-black text-white tracking-wide uppercase">
                TOURNAMENT CHAMPIONS
              </h2>
              <p className="text-slate-400 text-sm mt-1">C Arena BCA First Year Coding Championship</p>
            </motion.div>

            {/* Podium Display */}
            <div className="flex items-end justify-center space-x-6 h-80 max-w-3xl mx-auto">
              {/* 2nd Place */}
              {leaderboard[1] && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 220 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="w-1/3 bg-slate-800/90 border border-slate-700 rounded-t-3xl p-4 flex flex-col justify-between shadow-2xl relative"
                >
                  <div className="text-center">
                    <span className="text-2xl font-black text-slate-300">#2</span>
                    <h3 className="font-bold text-white text-base mt-1 truncate">
                      {leaderboard[1].name}
                    </h3>
                  </div>
                  <div className="text-xl font-black font-mono text-emerald-400">
                    {leaderboard[1].score}{' '}
                    <span className="text-xs font-sans text-slate-400">PTS</span>
                  </div>
                </motion.div>
              )}

              {/* 1st Place */}
              {leaderboard[0] && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 280 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="w-1/3 bg-amber-500/20 border-2 border-amber-500 rounded-t-3xl p-4 flex flex-col justify-between shadow-[0_0_35px_rgba(245,158,11,0.3)] relative"
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 p-2 bg-amber-500 rounded-full text-slate-950 shadow-lg">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div className="text-center mt-3">
                    <span className="text-3xl font-black text-amber-400">#1</span>
                    <h3 className="font-black text-white text-lg mt-1 truncate">
                      {leaderboard[0].name}
                    </h3>
                    <div className="text-xs font-bold text-amber-300 uppercase tracking-widest mt-1">
                      CHAMPION
                    </div>
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-400 gold-glow">
                    {leaderboard[0].score}{' '}
                    <span className="text-xs font-sans text-amber-200">PTS</span>
                  </div>
                </motion.div>
              )}

              {/* 3rd Place */}
              {leaderboard[2] && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 180 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="w-1/3 bg-amber-900/40 border border-amber-800/80 rounded-t-3xl p-4 flex flex-col justify-between shadow-2xl relative"
                >
                  <div className="text-center">
                    <span className="text-2xl font-black text-amber-600">#3</span>
                    <h3 className="font-bold text-white text-base mt-1 truncate">
                      {leaderboard[2].name}
                    </h3>
                  </div>
                  <div className="text-xl font-black font-mono text-emerald-400">
                    {leaderboard[2].score}{' '}
                    <span className="text-xs font-sans text-slate-400">PTS</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        ) : currentQuestion ? (
          /* ACTIVE / LOCKED / REVEAL QUESTION VIEW */
          <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (8 cols): Question, Code, Reveal */}
            <div className="lg:col-span-8 space-y-6">
              {/* Question Header */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-wider">
                    {currentQuestion.type.replace('_', ' ')} • {currentQuestion.difficulty}
                  </span>

                  {/* Submission Progress Counter */}
                  <div className="text-xs font-mono text-slate-400">
                    Submissions:{' '}
                    <strong className="text-emerald-400 text-sm font-bold">
                      {submittedCount} / {totalTeams} Teams
                    </strong>
                  </div>
                </div>

                <h2 className="text-2xl font-black text-white">{currentQuestion.title}</h2>
                <p className="text-sm text-slate-300 mt-2">{currentQuestion.description}</p>
              </div>

              {/* Code Snippet with Syntax Highlighting */}
              {currentQuestion.codeSnippet && (
                <div className="text-base">
                  <CodeViewer
                    code={currentQuestion.codeSnippet}
                    highlightedLine={
                      event.questionState === 'REVEALED' || event.questionState === 'SCORED'
                        ? currentQuestion.bugLineNumber
                        : undefined
                    }
                  />
                </div>
              )}

              {/* Round 4 Call Stack Trace Animation */}
              {currentQuestion.round === 4 &&
                (event.questionState === 'REVEALED' || event.questionState === 'SCORED') &&
                currentQuestion.callStackFrames && (
                  <CallStackVisualizer frames={currentQuestion.callStackFrames} />
                )}

              {/* Options Grid (Answers shown, correct highlighted on reveal) */}
              {currentQuestion.options && currentQuestion.options.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {currentQuestion.options.map((opt) => {
                    const isRevealed =
                      event.questionState === 'REVEALED' || event.questionState === 'SCORED';
                    const isCorrect = isRevealed && currentQuestion.correctAnswer === opt.id;

                    return (
                      <div
                        key={opt.id}
                        className={`p-4 rounded-xl border flex items-center space-x-3 transition-all ${
                          isCorrect
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(0,245,160,0.3)]'
                            : 'bg-slate-900/80 border-slate-800 text-slate-200'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-lg bg-slate-800 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                          {opt.label}
                        </span>
                        <span className="font-mono text-sm leading-relaxed">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reveal Explanation Banner */}
              {(event.questionState === 'REVEALED' || event.questionState === 'SCORED') &&
                currentQuestion.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/40"
                  >
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-1">
                      <Sparkles className="w-5 h-5" />
                      <span>OFFICIAL SOLUTION EXPLANATION</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-sans">
                      {currentQuestion.explanation}
                    </p>
                  </motion.div>
                )}
            </div>

            {/* Right Column (4 cols): Timer & Live Standings */}
            <div className="lg:col-span-4 space-y-6">
              {/* Giant Timer */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center shadow-2xl">
                <span className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-3">
                  {event.questionState === 'ACTIVE'
                    ? 'ROUND COUNTDOWN'
                    : event.questionState === 'LOCKED'
                    ? 'SUBMISSIONS LOCKED'
                    : 'QUESTION COMPLETED'}
                </span>

                {event.questionState === 'ACTIVE' ? (
                  <TimerDisplay
                    deadline={event.questionDeadline}
                    pausedRemainingSeconds={event.timerPausedRemainingSeconds}
                    totalSeconds={currentQuestion.timeLimitSeconds}
                    isPaused={event.timerPausedRemainingSeconds !== undefined}
                  />
                ) : event.questionState === 'LOCKED' ? (
                  <div className="flex flex-col items-center">
                    <Lock className="w-12 h-12 text-amber-400 animate-pulse mb-2" />
                    <span className="text-xl font-black text-amber-400">SUBMISSIONS CLOSED</span>
                    <span className="text-xs text-slate-400 mt-1">Host revealing solution...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-emerald-400">
                    <Sparkles className="w-12 h-12 mb-2" />
                    <span className="text-xl font-black">POINTS AWARDED</span>
                  </div>
                )}
              </div>

              {/* Leaderboard Table (Compact) */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Tournament Standings</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-400">{leaderboard.length} Teams</span>
                </div>
                <LeaderboardTable items={leaderboard} compact />
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer ticker */}
      <footer className="px-8 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
        <div className="flex items-center space-x-3">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>C ARENA SERVER AUTHORITATIVE SYNC</span>
          <span>• REVISION #{event.revision}</span>
        </div>
        <div>SCAN QR TO JOIN: {joinUrl}</div>
      </footer>
    </div>
  );
}
