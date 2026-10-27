'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Zap,
  Trophy,
  Users,
  Maximize,
  Minimize,
  Wrench,
} from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { Leaderboard } from '@/components/Leaderboard';
import { supabase, FFF_CHANNEL_NAME } from '@/lib/supabase';
import { QuestionType } from '@/data/questions';

interface DisplaySnapshot {
  state: 'LOBBY' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'FINISHED';
  questionIndex: number;
  totalQuestions: number;
  currentQuestion?: {
    id: number;
    type: QuestionType;
    title: string;
    description?: string;
    code?: string;
    options?: { label: string; text: string }[];
    timeLimitSeconds: number;
    correctAnswer?: string;
    explanation?: string;
  };
  timeRemaining: number;
  totalPlayers: number;
  submittedCount: number;
  questionStartTime?: number;
  leaderboard: {
    id: string;
    name: string;
    rollNo: string;
    score: number;
    rank: number;
    correctCount: number;
    totalTimeMs: number;
    lastPoints?: number;
    hasSubmittedCurrent?: boolean;
  }[];
}

export default function ProjectorDisplayPage() {
  const [snapshot, setSnapshot] = useState<DisplaySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJoinUrl(window.location.origin);
    }
  }, []);

  // Real-Time Supabase WebSocket
  useEffect(() => {
    // Initial fetch once on load if snapshot not already received
    fetch('/api/game')
      .then((r) => r.json())
      .then((d) => {
        if (d.snapshot) {
          setSnapshot((prev) => (prev ? prev : d.snapshot));
          setLoading(false);
        }
      })
      .catch(() => {});

    // Supabase Realtime WebSocket (<50ms globally)
    if (supabase) {
      const channel = supabase.channel(FFF_CHANNEL_NAME);

      channel
        .on('broadcast', { event: 'GAME_STATE' }, (payload) => {
          if (payload.payload) {
            setSnapshot(payload.payload);
            setLoading(false);
          }
        })
        .on('broadcast', { event: 'SNAPSHOT' }, (payload) => {
          if (payload.payload) {
            setSnapshot(payload.payload);
            setLoading(false);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'REQUEST_STATE',
              payload: {},
            });
          }
        });

      return () => {
        channel.unsubscribe();
      };
    }
  }, []);

  // Local client-side timer tick (zero network requests)
  const [localTimeRemaining, setLocalTimeRemaining] = useState<number>(20);

  const gameState = snapshot?.state;
  const timeLimit = snapshot?.currentQuestion?.timeLimitSeconds;
  const qStartTime = snapshot?.questionStartTime;

  useEffect(() => {
    if (gameState !== 'QUESTION' || !timeLimit) return;

    const startTime = qStartTime || Date.now();

    const updateClock = () => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(timeLimit - elapsedSec));
      setLocalTimeRemaining(remaining);
    };

    updateClock();
    const interval = setInterval(updateClock, 250);
    return () => clearInterval(interval);
  }, [gameState, timeLimit, qStartTime]);

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
      <div className="min-h-screen bg-[#060913] flex flex-col items-center justify-center text-slate-400 font-mono">
        <Zap className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white">CONNECTING PROJECTOR FEED...</h2>
      </div>
    );
  }

  const { state, currentQuestion, questionIndex, totalQuestions, totalPlayers, submittedCount, leaderboard } =
    snapshot;

  return (
    <div className="min-h-screen w-screen bg-[#060913] text-slate-100 flex flex-col justify-between overflow-x-hidden select-none">
      {/* Top Bar */}
      <header className="px-6 sm:px-8 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(0,245,160,0.25)]">
            <Zap className="w-6 h-6 fill-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-lg sm:text-xl tracking-wider text-white">C PROGRAMMING CLASS QUIZ</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">Class Quiz • Speed & Accuracy</p>
          </div>
        </div>

        {/* Center state / question pill */}
        {state !== 'LOBBY' && (
          <div className="hidden md:flex px-5 py-1.5 rounded-full bg-slate-800 border border-slate-700 items-center space-x-3 text-sm font-bold font-mono">
            <span className="text-emerald-400">
              QUESTION {questionIndex + 1} OF {totalQuestions}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">{state}</span>
          </div>
        )}

        {/* Right Info */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-400">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>
              <strong className="text-white text-sm">{totalPlayers}</strong> Joined
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Display Area */}
      <main className="flex-1 p-6 sm:p-8 flex items-center justify-center">
        {/* ======================================================== */}
        {/* 1. LOBBY VIEW (WITH LIVE JOINED PLAYERS ROSTER) */}
        {/* ======================================================== */}
        {state === 'LOBBY' && (
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left (5 cols): QR Code */}
            <div className="lg:col-span-5 p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 flex flex-col items-center justify-center shadow-2xl">
              <div className="p-4 bg-white rounded-2xl shadow-2xl mb-6">
                {joinUrl && <QRCodeSVG value={joinUrl} size={240} level="H" />}
              </div>
              <div className="text-center w-full">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  SCAN WITH PHONE CAMERA TO JOIN
                </span>
                <div className="text-sm font-mono font-bold text-emerald-400 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 truncate">
                  {joinUrl || 'http://localhost:3000'}
                </div>
              </div>
            </div>

            {/* Right (7 cols): Event Info & Live Joined Students List */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
                  CLASSROOM QUIZ
                </span>
                <h1 className="text-3xl sm:text-4xl font-black text-white mt-1 leading-tight">
                  C Programming Class Quiz
                </h1>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Scan QR code with your phone. Enter your Name and PRN Number to join. Answer accurately and fast to earn speed bonus points!
                </p>
              </div>

              {/* Connected Roster Card */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold font-mono uppercase text-slate-300">
                      Students in Quiz ({totalPlayers})
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">Waiting for host...</span>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="py-8 text-center text-xs font-mono text-slate-500">
                    No students joined yet. Scan QR code to enter!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {leaderboard.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center space-x-2 animate-fadeIn"
                      >
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{p.name}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">PRN: {p.rollNo}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. QUESTION VIEW (WITH ALWAYS VISIBLE LIVE STANDINGS) */}
        {/* ======================================================== */}
        {state === 'QUESTION' && currentQuestion && (
          <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left (7 cols): Question, C code, options / fix prompt */}
            <div className="lg:col-span-7 space-y-5">
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-bold px-3 py-1 rounded-full border uppercase ${
                      currentQuestion.type === 'code_fix'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : currentQuestion.type === 'mcq'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    }`}
                  >
                    TYPE:{' '}
                    {currentQuestion.type === 'code_fix'
                      ? 'CODE FIX (SYNTAX ERROR)'
                      : currentQuestion.type === 'mcq'
                      ? 'MULTIPLE CHOICE'
                      : 'EXACT OUTPUT PREDICTION'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Answered:{' '}
                    <strong className="text-emerald-400 text-sm font-bold">
                      {submittedCount} / {totalPlayers}
                    </strong>
                  </span>
                </div>

                <h2 className="text-2xl font-black text-white leading-tight">{currentQuestion.title}</h2>
                {currentQuestion.description && (
                  <p className="text-sm text-slate-300">{currentQuestion.description}</p>
                )}
              </div>

              {/* Code Snippet */}
              {currentQuestion.code && (
                <div className="text-sm">
                  <CodeBlock code={currentQuestion.code} />
                </div>
              )}

              {/* Code Fix Banner */}
              {currentQuestion.type === 'code_fix' && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex items-center space-x-2.5">
                  <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Code Fix Challenge:</strong> Spot the syntax error/bug above and submit the
                    corrected statement on your phone!
                  </span>
                </div>
              )}

              {/* MCQ Options (if MCQ) */}
              {currentQuestion.options && (
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.options.map((opt) => (
                    <div
                      key={opt.label}
                      className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 flex items-center space-x-3 text-sm"
                    >
                      <span className="w-7 h-7 rounded-xl bg-slate-800 font-mono font-bold text-xs text-emerald-400 flex items-center justify-center shrink-0">
                        {opt.label}
                      </span>
                      <span className="font-mono text-slate-200">{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right (5 cols): Timer & ALWAYS-VISIBLE LIVE LEADERBOARD */}
            <div className="lg:col-span-5 space-y-5">
              {/* Timer & Submissions Bar */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-center shadow-xl">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono block">
                    TIME REMAINING
                  </span>
                  <div
                    className={`text-4xl sm:text-5xl font-black font-mono my-1 ${
                      localTimeRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                    }`}
                  >
                    {localTimeRemaining}s
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-center shadow-xl">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono block">
                    SUBMISSIONS
                  </span>
                  <div className="text-4xl sm:text-5xl font-black font-mono text-white my-1">
                    {submittedCount}
                    <span className="text-sm font-normal text-slate-500">/{totalPlayers}</span>
                  </div>
                </div>
              </div>

              {/* Live Standings Panel (ALWAYS VISIBLE) */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-white tracking-wider uppercase">
                      Live Standings
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">⚡ Top Scorers</span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500 font-mono">
                      No active players yet
                    </div>
                  ) : (
                    leaderboard.slice(0, 8).map((p) => (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                          p.hasSubmittedCurrent
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-slate-950/80 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg font-mono font-bold text-[10px] flex items-center justify-center shrink-0 ${
                              p.rank === 1
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : p.rank === 2
                                ? 'bg-slate-300 text-slate-950 font-bold'
                                : p.rank === 3
                                ? 'bg-amber-700 text-white font-bold'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{p.rank}
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate">{p.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 block truncate">
                              PRN: {p.rollNo}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {p.hasSubmittedCurrent && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold animate-pulse">
                              LOCKED
                            </span>
                          )}
                          <div className="font-mono font-black text-emerald-400 text-sm">
                            {p.score} <span className="text-[10px] text-slate-500 font-normal">PTS</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. REVEAL VIEW (WITH ALWAYS VISIBLE LIVE STANDINGS) */}
        {/* ======================================================== */}
        {state === 'REVEAL' && currentQuestion && (
          <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left (7 cols): Answer Reveal & Explanation */}
            <div className="lg:col-span-7 space-y-5">
              <div className="text-left space-y-1">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
                  OFFICIAL SOLUTION REVEAL
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">{currentQuestion.title}</h2>
              </div>

              {/* Solution Box */}
              <div className="p-6 rounded-3xl bg-emerald-950/30 border-2 border-emerald-400 shadow-[0_0_35px_rgba(0,245,160,0.25)] space-y-2">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest block font-mono">
                  CORRECT SOLUTION / FIX
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 break-words">
                  {currentQuestion.correctAnswer}
                </div>
                {currentQuestion.explanation && (
                  <p className="text-sm text-slate-200 leading-relaxed pt-2 font-sans border-t border-emerald-500/20">
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>

              {currentQuestion.code && (
                <div className="text-xs">
                  <CodeBlock code={currentQuestion.code} />
                </div>
              )}
            </div>

            {/* Right (5 cols): Updated Live Standings */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-white tracking-wider uppercase">
                    Updated Standings
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">Points Awarded!</span>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {leaderboard.slice(0, 10).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg font-mono font-bold text-[10px] flex items-center justify-center shrink-0 ${
                          p.rank === 1
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : p.rank === 2
                            ? 'bg-slate-300 text-slate-950 font-bold'
                            : p.rank === 3
                            ? 'bg-amber-700 text-white font-bold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        #{p.rank}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">{p.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 block truncate">
                          PRN: {p.rollNo}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-emerald-400 text-sm">
                        {p.score} <span className="text-[10px] text-slate-500 font-normal">PTS</span>
                      </div>
                      {p.lastPoints ? (
                        <div className="text-[10px] font-mono font-bold text-emerald-400">
                          +{p.lastPoints} pts
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. LEADERBOARD & FINISHED VIEW (FULL SCREEN PODIUM) */}
        {/* ======================================================== */}
        {(state === 'LEADERBOARD' || state === 'FINISHED') && (
          <div className="w-full max-w-4xl space-y-6">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                {state === 'FINISHED' ? 'CLASS QUIZ COMPLETED' : 'LIVE LEADERBOARD'}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                The student with the most points wins!
              </p>
            </div>

            {/* Top 3 Podium Cards */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 items-end mb-6">
                {/* 2nd Place */}
                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
                  <span className="text-xl font-black text-slate-300">#2</span>
                  <h3 className="font-bold text-white text-base mt-1 truncate">
                    {leaderboard[1].name}
                  </h3>
                  <div className="text-base font-mono font-black text-emerald-400 mt-1">
                    {leaderboard[1].score} PTS
                  </div>
                </div>

                {/* 1st Place */}
                <div className="p-6 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-center shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                  <Trophy className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                  <span className="text-2xl font-black text-amber-400">#1</span>
                  <h3 className="font-black text-white text-lg mt-1 truncate">
                    {leaderboard[0].name}
                  </h3>
                  <div className="text-xl font-mono font-black text-amber-400 mt-1">
                    {leaderboard[0].score} PTS
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-800 text-center">
                  <span className="text-xl font-black text-amber-600">#3</span>
                  <h3 className="font-bold text-white text-base mt-1 truncate">
                    {leaderboard[2].name}
                  </h3>
                  <div className="text-base font-mono font-black text-emerald-400 mt-1">
                    {leaderboard[2].score} PTS
                  </div>
                </div>
              </div>
            )}

            <div className="max-h-[50vh] overflow-y-auto pr-1">
              <Leaderboard items={leaderboard} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-8 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>FASTEST FINGER FIRST • C ARENA ENGINE</span>
        </div>
        <div>JOIN URL: {joinUrl || 'http://localhost:3000'}</div>
      </footer>
    </div>
  );
}
