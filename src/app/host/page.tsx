'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  Play,
  Eye,
  Trophy,
  SkipForward,
  RotateCcw,
  Users,
  CheckCircle,
  Zap,
  ExternalLink,
  Bot,
  Lock,
  KeyRound,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { Leaderboard } from '@/components/Leaderboard';
import { supabase, FFF_CHANNEL_NAME } from '@/lib/supabase';
import { GameEngine } from '@/lib/game';

interface HostSnapshot {
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
  questionStartTime?: number;
  totalPlayers: number;
  submittedCount: number;
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

export default function HostControlPage() {
  const [snapshot, setSnapshot] = useState<HostSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Authentication State
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('fff_admin_pwd');
    if (saved) {
      setAdminPassword(saved);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADMIN_LOGIN', password: loginInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('fff_admin_pwd', loginInput.trim());
        setAdminPassword(loginInput.trim());
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || 'Incorrect Admin Password');
      }
    } catch {
      setLoginError('Authentication request failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('fff_admin_pwd');
    setAdminPassword('');
    setIsAuthenticated(false);
    setLoginInput('');
  };

  // Initial snapshot from GameEngine
  useEffect(() => {
    const snap = GameEngine.getSnapshot();
    setSnapshot(snap);
    setLoading(false);
  }, []);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const snapshotRef = useRef<HostSnapshot | null>(null);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const broadcastState = useCallback((snap: HostSnapshot) => {
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'GAME_STATE',
          payload: snap,
        });
        channelRef.current.send({
          type: 'broadcast',
          event: 'SNAPSHOT',
          payload: snap,
        });
      } catch {
        // ignore send error
      }
    }
  }, []);

  const sendAction = useCallback(async (action: string, payload?: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      // 1. Direct synchronous execution in Host GameEngine
      switch (action) {
        case 'HOST_START': {
          GameEngine.startQuestion(Number(payload?.index) || 0);
          break;
        }
        case 'HOST_REVEAL': {
          GameEngine.revealAnswer();
          break;
        }
        case 'HOST_LEADERBOARD': {
          GameEngine.showLeaderboard();
          break;
        }
        case 'HOST_NEXT': {
          GameEngine.nextQuestion();
          break;
        }
        case 'HOST_RESET': {
          GameEngine.resetGame();
          break;
        }
        case 'HOST_SEED': {
          GameEngine.seedMockPlayers(20);
          break;
        }
        case 'JOIN': {
          if (payload?.name && payload?.rollNo) {
            GameEngine.join(String(payload.name), String(payload.rollNo));
          }
          break;
        }
        case 'SUBMIT': {
          if (payload?.playerId && payload?.answer !== undefined) {
            GameEngine.submitAnswer(String(payload.playerId), String(payload.answer));
          }
          break;
        }
      }

      const snap = GameEngine.getSnapshot();
      setSnapshot(snap);
      broadcastState(snap);

      // 2. Background sync to /api/game (non-blocking)
      fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminPassword, ...payload }),
      }).catch(() => {});
    } finally {
      setActionLoading(false);
    }
  }, [adminPassword, broadcastState]);

  // Supabase Realtime Channel
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel(FFF_CHANNEL_NAME);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'REQUEST_STATE' }, () => {
        if (snapshotRef.current) {
          broadcastState(snapshotRef.current);
        }
      })
      .on('broadcast', { event: 'REQUEST_SNAPSHOT' }, () => {
        if (snapshotRef.current) {
          broadcastState(snapshotRef.current);
        }
      })
      .on('broadcast', { event: 'STUDENT_JOIN' }, async (payload) => {
        const { name, rollNo } = payload.payload || {};
        if (name && rollNo) {
          await sendAction('JOIN', { name, rollNo });
        }
      })
      .on('broadcast', { event: 'PLAYER_JOIN' }, async (payload) => {
        const { name, rollNo } = payload.payload || {};
        if (name && rollNo) {
          await sendAction('JOIN', { name, rollNo });
        }
      })
      .on('broadcast', { event: 'STUDENT_SUBMIT' }, async (payload) => {
        const { playerId, answer } = payload.payload || {};
        if (playerId && answer !== undefined) {
          await sendAction('SUBMIT', { playerId, answer });
        }
      })
      .on('broadcast', { event: 'SUBMIT_ANSWER' }, async (payload) => {
        const { playerId, answer } = payload.payload || {};
        if (playerId && answer !== undefined) {
          await sendAction('SUBMIT', { playerId, answer });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && snapshotRef.current) {
          broadcastState(snapshotRef.current);
        }
      });

    // Heartbeat every 2s
    const heartbeat = setInterval(() => {
      if (snapshotRef.current) {
        broadcastState(snapshotRef.current);
      }
    }, 2000);

    return () => {
      clearInterval(heartbeat);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [sendAction, broadcastState]);

  // If not authenticated, show sleek Admin Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-wider text-white">ADMIN CONSOLE</h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Fastest Finger First • Host Access Restricted
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Enter admin password..."
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-3.5 pl-11 text-white placeholder-slate-600 focus:outline-none transition-all font-mono"
                />
                <KeyRound className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide shadow-[0_0_20px_rgba(0,245,160,0.3)] transition-all flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loginLoading ? 'UNLOCKING...' : 'UNLOCK HOST CONSOLE'}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-slate-600 text-[11px] font-mono">
            Default: <code className="text-slate-400">admin123</code> (configured in .env)
          </div>
        </div>
      </div>
    );
  }

  if (loading || !snapshot) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-slate-400 font-mono text-xs">
        Loading Host Console...
      </div>
    );
  }

  const { state, currentQuestion, questionIndex, totalQuestions, totalPlayers, submittedCount, leaderboard } = snapshot;

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Zap className="w-6 h-6 fill-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">HOST CONTROL CONSOLE</h1>
            <p className="text-xs text-slate-400 font-mono">Fastest Finger First Quiz Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <a
            href="/display"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
          >
            <span>Projector Display</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
          >
            <span>Student Join Link</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white transition-all"
            title="Lock Console"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Main Status & Controls Card */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-bold uppercase">Current Stage:</span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-black">
              {state}
            </span>
            <span className="text-xs font-mono text-slate-400">
              • Question {questionIndex + 1} of {totalQuestions}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1 text-slate-300">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>
                <strong>{totalPlayers}</strong> Players
              </span>
            </div>
            {state === 'QUESTION' && (
              <div className="flex items-center space-x-1 text-emerald-400 font-bold">
                <CheckCircle className="w-4 h-4" />
                <span>
                  {submittedCount} / {totalPlayers} Answered
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {state === 'LOBBY' && (
            <button
              onClick={() => sendAction('HOST_START', { index: 0 })}
              disabled={actionLoading}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>START QUESTION 1</span>
            </button>
          )}

          {state === 'QUESTION' && (
            <button
              onClick={() => sendAction('HOST_REVEAL')}
              disabled={actionLoading}
              className="px-6 py-3 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-black text-sm flex items-center space-x-2 shadow-lg shadow-purple-500/25 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>REVEAL ANSWER ({submittedCount} Submitted)</span>
            </button>
          )}

          {state === 'REVEAL' && (
            <button
              onClick={() => sendAction('HOST_LEADERBOARD')}
              disabled={actionLoading}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center space-x-2 shadow-lg shadow-amber-500/25 transition-all"
            >
              <Trophy className="w-4 h-4 fill-slate-950" />
              <span>SHOW LEADERBOARD</span>
            </button>
          )}

          {state === 'LEADERBOARD' && (
            <button
              onClick={() => sendAction('HOST_NEXT')}
              disabled={actionLoading}
              className="px-6 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-black text-sm flex items-center space-x-2 shadow-lg shadow-blue-500/25 transition-all"
            >
              <SkipForward className="w-4 h-4" />
              <span>NEXT QUESTION (Q{questionIndex + 2})</span>
            </button>
          )}

          {/* Quick jump question dropdown */}
          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-xs text-slate-500 font-mono">Jump:</span>
            <select
              value={questionIndex}
              onChange={(e) => sendAction('HOST_START', { index: parseInt(e.target.value) })}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none"
            >
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <option key={i} value={i}>
                  Question {i + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Simulator button */}
          <button
            onClick={() => sendAction('HOST_SEED')}
            disabled={actionLoading}
            className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center space-x-1.5"
            title="Seed 20 mock students for testing"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>+20 Mock Students</span>
          </button>

          {/* Reset button */}
          <button
            onClick={() => {
              if (confirm('Reset the quiz and clear all player scores?')) {
                sendAction('HOST_RESET');
              }
            }}
            disabled={actionLoading}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 text-xs font-bold flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Grid: Question inspection on Left, Standings on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Current Question Details */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active Question Preview
          </h2>

          {currentQuestion ? (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase">
                  TYPE: {currentQuestion.type.toUpperCase()} • {currentQuestion.timeLimitSeconds}s
                </span>
                <span className="text-xs font-mono text-slate-400 font-bold">
                  Points: 100 Base + Speed Bonus
                </span>
              </div>

              <h3 className="text-lg font-bold text-white">{currentQuestion.title}</h3>
              {currentQuestion.description && (
                <p className="text-xs text-slate-400">{currentQuestion.description}</p>
              )}

              {currentQuestion.code && <CodeBlock code={currentQuestion.code} />}

              {/* Options */}
              {currentQuestion.options && (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {currentQuestion.options.map((opt) => (
                    <div
                      key={opt.label}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center space-x-2"
                    >
                      <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px] text-emerald-400">
                        {opt.label}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Correct Answer & Solution Box */}
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1">
                <div className="text-emerald-400 font-bold flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Correct Answer: {currentQuestion.correctAnswer}</span>
                </div>
                {currentQuestion.explanation && (
                  <p className="text-slate-300 leading-relaxed font-sans pt-1">
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs">No active question</div>
          )}
        </div>

        {/* Right (5 cols): Live Standings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Live Leaderboard</span>
            </h2>
            <span className="text-xs font-mono text-slate-500">{leaderboard.length} Players</span>
          </div>

          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <Leaderboard items={leaderboard} />
          </div>
        </div>
      </div>
    </div>
  );
}
