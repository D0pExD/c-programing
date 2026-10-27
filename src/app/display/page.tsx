'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Zap,
  Trophy,
  Users,
  Maximize,
  Minimize,
} from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { Leaderboard } from '@/components/Leaderboard';
import { supabase, FFF_CHANNEL_NAME } from '@/lib/supabase';

interface DisplaySnapshot {
  state: 'LOBBY' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'FINISHED';
  questionIndex: number;
  totalQuestions: number;
  currentQuestion?: {
    id: number;
    type: 'mcq' | 'output';
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

  // Real-Time Supabase WebSocket + HTTP Fallback
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/game');
        const d = await res.json();
        if (d.snapshot) {
          setSnapshot(d.snapshot);
          setLoading(false);
        }
      } catch {
        // ignore
      }
    };

    fetchLatest();

    // 1. Supabase Realtime WebSocket (<50ms globally)
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

      // Periodic backup fetch every 2s
      const pollInterval = setInterval(fetchLatest, 2000);

      return () => {
        clearInterval(pollInterval);
        channel.unsubscribe();
      };
    }

    // 2. HTTP Polling fallback if Supabase not configured
    const interval = setInterval(fetchLatest, 1500);
    return () => clearInterval(interval);
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
    const interval = setInterval(updateClock, 300);
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

  const { state, currentQuestion, questionIndex, totalQuestions, totalPlayers, submittedCount, leaderboard } = snapshot;

  return (
    <div className="min-h-screen w-screen bg-[#060913] text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      {/* Top Bar */}
      <header className="px-8 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(0,245,160,0.25)]">
            <Zap className="w-6 h-6 fill-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-xl tracking-wider text-white">FASTEST FINGER FIRST</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">BCA C Programming Quiz Tournament</p>
          </div>
        </div>

        {/* Center state / question pill */}
        {state !== 'LOBBY' && (
          <div className="px-5 py-1.5 rounded-full bg-slate-800 border border-slate-700 flex items-center space-x-3 text-sm font-bold font-mono">
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
      <main className="flex-1 p-8 flex items-center justify-center">
        {/* 1. LOBBY VIEW */}
        {state === 'LOBBY' && (
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* QR Code */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 flex flex-col items-center justify-center shadow-2xl">
              <div className="p-4 bg-white rounded-2xl shadow-2xl mb-6">
                {joinUrl && <QRCodeSVG value={joinUrl} size={260} level="H" />}
              </div>
              <div className="text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  SCAN WITH PHONE CAMERA TO JOIN
                </span>
                <div className="text-base font-mono font-bold text-emerald-400 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                  {joinUrl || 'http://localhost:3000'}
                </div>
              </div>
            </div>

            {/* Waiting info */}
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
                  UNIVERSITY BCA CHAMPIONSHIP
                </span>
                <h1 className="text-4xl font-black text-white mt-1 leading-tight">
                  Fastest Finger First C Tournament
                </h1>
                <p className="text-slate-400 text-base mt-3 leading-relaxed">
                  Enter your Name and Roll Number on your phone. Faster and accurate submissions earn
                  bonus points. The student with the most points wins!
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">STUDENTS CONNECTED</div>
                  <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5">
                    {totalPlayers} PLAYERS
                  </div>
                </div>
                <div className="text-xs font-mono text-slate-500 text-right">
                  Waiting for host to launch Q1...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. QUESTION VIEW */}
        {state === 'QUESTION' && currentQuestion && (
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left (8 cols): Question, C code, options */}
            <div className="lg:col-span-8 space-y-6">
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 uppercase">
                    TYPE: {currentQuestion.type === 'mcq' ? 'MULTIPLE CHOICE' : 'EXACT OUTPUT PREDICTION'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Submissions:{' '}
                    <strong className="text-emerald-400 text-sm font-bold">
                      {submittedCount} / {totalPlayers}
                    </strong>
                  </span>
                </div>

                <h2 className="text-2xl font-black text-white">{currentQuestion.title}</h2>
                {currentQuestion.description && (
                  <p className="text-sm text-slate-300 mt-2">{currentQuestion.description}</p>
                )}
              </div>

              {/* Code */}
              {currentQuestion.code && (
                <div className="text-base">
                  <CodeBlock code={currentQuestion.code} />
                </div>
              )}

              {/* Options (if MCQ) */}
              {currentQuestion.options && (
                <div className="grid grid-cols-2 gap-4">
                  {currentQuestion.options.map((opt) => (
                    <div
                      key={opt.label}
                      className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 flex items-center space-x-3 text-base"
                    >
                      <span className="w-8 h-8 rounded-xl bg-slate-800 font-mono font-bold text-sm text-emerald-400 flex items-center justify-center shrink-0">
                        {opt.label}
                      </span>
                      <span className="font-mono text-slate-200">{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right (4 cols): Timer & live counts */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center shadow-2xl">
                <span className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-2 font-mono">
                  TIME REMAINING
                </span>
                <div
                  className={`text-6xl font-black font-mono my-2 ${
                    localTimeRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                  }`}
                >
                  {localTimeRemaining}s
                </div>
                <div className="text-xs font-mono text-slate-500 mt-2">
                  Answer fast on your phone!
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 text-center">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Live Submissions
                </div>
                <div className="text-3xl font-black font-mono text-white mt-1">
                  {submittedCount}{' '}
                  <span className="text-sm text-slate-500 font-normal">/ {totalPlayers}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. REVEAL VIEW */}
        {state === 'REVEAL' && currentQuestion && (
          <div className="w-full max-w-4xl space-y-6">
            <div className="text-center">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
                OFFICIAL ANSWER REVEAL
              </span>
              <h2 className="text-3xl font-black text-white mt-1">{currentQuestion.title}</h2>
            </div>

            {/* Correct Answer Box */}
            <div className="p-8 rounded-3xl bg-emerald-950/30 border-2 border-emerald-400 text-center shadow-[0_0_35px_rgba(0,245,160,0.25)] space-y-3">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest block">
                CORRECT SOLUTION
              </span>
              <div className="text-4xl font-black font-mono text-emerald-400">
                {currentQuestion.correctAnswer}
              </div>
              {currentQuestion.explanation && (
                <p className="text-base text-slate-200 max-w-2xl mx-auto leading-relaxed pt-2 font-sans">
                  {currentQuestion.explanation}
                </p>
              )}
            </div>

            {currentQuestion.code && <CodeBlock code={currentQuestion.code} />}
          </div>
        )}

        {/* 4. LEADERBOARD VIEW */}
        {(state === 'LEADERBOARD' || state === 'FINISHED') && (
          <div className="w-full max-w-4xl space-y-6">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                {state === 'FINISHED' ? 'FINAL TOURNAMENT WINNERS' : 'LIVE LEADERBOARD'}
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
