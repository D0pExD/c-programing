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
  Plus,
  Trash2,
  Edit3,
  Wrench,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { Leaderboard } from '@/components/Leaderboard';
import { supabase, FFF_CHANNEL_NAME } from '@/lib/supabase';
import { GameEngine } from '@/lib/game';
import { Question, QuestionType } from '@/data/questions';

interface HostSnapshot {
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
  questions?: Question[];
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

  // Tab State
  const [activeTab, setActiveTab] = useState<'CONTROLS' | 'QUESTIONS'>('CONTROLS');

  // Authentication State
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Question Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formType, setFormType] = useState<QuestionType>('mcq');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTimeLimit, setFormTimeLimit] = useState(25);
  const [formCode, setFormCode] = useState('');
  const [formOptions, setFormOptions] = useState([
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' },
  ]);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('A');
  const [formExplanation, setFormExplanation] = useState('');

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

  const sendAction = useCallback(
    async (action: string, payload?: Record<string, unknown>) => {
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
          case 'HOST_QUESTION_ADD': {
            if (payload?.question) {
              GameEngine.addQuestion(payload.question as Omit<Question, 'id'>);
            }
            break;
          }
          case 'HOST_QUESTION_UPDATE': {
            if (payload?.id && payload?.question) {
              GameEngine.updateQuestion(Number(payload.id), payload.question as Partial<Question>);
            }
            break;
          }
          case 'HOST_QUESTION_DELETE': {
            if (payload?.id) {
              GameEngine.deleteQuestion(Number(payload.id));
            }
            break;
          }
          case 'HOST_QUESTION_RESET': {
            GameEngine.resetQuestions();
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
    },
    [adminPassword, broadcastState]
  );

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

  // Question Modal Helpers
  const openAddModal = () => {
    setEditingId(null);
    setFormType('code_fix');
    setFormTitle('');
    setFormDesc('');
    setFormTimeLimit(25);
    setFormCode(`#include <stdio.h>\n\nint main() {\n    int a = 10\n    printf("%d\\n", a);\n    return 0;\n}`);
    setFormOptions([
      { label: 'A', text: '' },
      { label: 'B', text: '' },
      { label: 'C', text: '' },
      { label: 'D', text: '' },
    ]);
    setFormCorrectAnswer('int a = 10;');
    setFormExplanation('Missing semicolon on statement int a = 10;');
    setIsModalOpen(true);
  };

  const openEditModal = (q: Question) => {
    setEditingId(q.id);
    setFormType(q.type);
    setFormTitle(q.title);
    setFormDesc(q.description || '');
    setFormTimeLimit(q.timeLimitSeconds);
    setFormCode(q.code || '');
    setFormOptions(
      q.options || [
        { label: 'A', text: '' },
        { label: 'B', text: '' },
        { label: 'C', text: '' },
        { label: 'D', text: '' },
      ]
    );
    setFormCorrectAnswer(q.correctAnswer);
    setFormExplanation(q.explanation || '');
    setIsModalOpen(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formCorrectAnswer.trim()) {
      alert('Title and Correct Answer are required.');
      return;
    }

    const questionData: Omit<Question, 'id'> = {
      type: formType,
      title: formTitle.trim(),
      description: formDesc.trim() || undefined,
      code: formCode.trim() || undefined,
      timeLimitSeconds: Number(formTimeLimit) || 20,
      options: formType === 'mcq' ? formOptions : undefined,
      correctAnswer: formCorrectAnswer.trim(),
      explanation: formExplanation.trim() || 'Correct answer verified by instructor.',
    };

    if (editingId) {
      sendAction('HOST_QUESTION_UPDATE', { id: editingId, question: questionData });
    } else {
      sendAction('HOST_QUESTION_ADD', { question: questionData });
    }

    setIsModalOpen(false);
  };

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

  const { state, currentQuestion, questionIndex, totalQuestions, totalPlayers, submittedCount, leaderboard, questions } =
    snapshot;
  const currentQuestionsList = questions || GameEngine.getQuestions();

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
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
            <span>Student Link</span>
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

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-3 border-b border-slate-800/80 pb-1">
        <button
          onClick={() => setActiveTab('CONTROLS')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'CONTROLS'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Live Quiz Controls</span>
        </button>

        <button
          onClick={() => setActiveTab('QUESTIONS')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'QUESTIONS'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Question Manager ({currentQuestionsList.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: LIVE QUIZ CONTROLS */}
      {/* ======================================================== */}
      {activeTab === 'CONTROLS' && (
        <div className="space-y-6">
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

                  {/* Options for MCQ */}
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
                      <span>Correct Answer / Fix: {currentQuestion.correctAnswer}</span>
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
      )}

      {/* ======================================================== */}
      {/* TAB 2: QUESTION MANAGER */}
      {/* ======================================================== */}
      {activeTab === 'QUESTIONS' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center space-x-2">
                <span>Manage Quiz Questions</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                  {currentQuestionsList.length} Total
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Add, edit, delete questions. You can create MCQ, Output prediction, and Code Fix (Syntax
                error) challenges!
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={openAddModal}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Reset all questions back to standard defaults? Custom edits will be replaced.')) {
                    sendAction('HOST_QUESTION_RESET');
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="grid grid-cols-1 gap-4">
            {currentQuestionsList.map((q, idx) => {
              const isActive = questionIndex === idx && state !== 'LOBBY';
              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-slate-900/95 border-emerald-500/60 shadow-[0_0_20px_rgba(0,245,160,0.15)]'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-sm text-white">Q{idx + 1}.</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                            q.type === 'mcq'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : q.type === 'code_fix'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {q.type === 'code_fix' ? 'CODE FIX (SYNTAX)' : q.type.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {q.timeLimitSeconds}s limit
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 animate-pulse">
                            LIVE ON SCREEN
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white">{q.title}</h3>
                      {q.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">{q.description}</p>
                      )}

                      {/* Code preview snippet */}
                      {q.code && (
                        <div className="pt-1 text-xs">
                          <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-emerald-300 text-xs overflow-x-auto max-h-32">
                            {q.code}
                          </pre>
                        </div>
                      )}

                      {/* Solution preview */}
                      <div className="text-xs font-mono pt-1 text-slate-300 flex items-center space-x-2">
                        <span className="text-slate-500 font-bold uppercase text-[10px]">Answer / Fix:</span>
                        <code className="text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-bold">
                          {q.correctAnswer}
                        </code>
                      </div>
                    </div>

                    {/* Actions on this question */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => {
                          sendAction('HOST_START', { index: idx });
                          setActiveTab('CONTROLS');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center space-x-1 transition-all"
                        title="Launch this question right now"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Launch</span>
                      </button>

                      <button
                        onClick={() => openEditModal(q)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                        title="Edit Question"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete Question ${idx + 1}: "${q.title}"?`)) {
                            sendAction('HOST_QUESTION_DELETE', { id: q.id });
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 transition-all"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT QUESTION MODAL */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-white">
                  {editingId ? 'Edit Quiz Question' : 'Create New Question'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* Question Type Radio */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Question Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('mcq')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      formType === 'mcq'
                        ? 'bg-blue-500 text-slate-950 border-blue-400 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Multiple Choice (MCQ)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('output')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      formType === 'output'
                        ? 'bg-purple-500 text-white border-purple-400 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Output Prediction
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('code_fix')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      formType === 'code_fix'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Code Fix (Syntax Error) ⚡
                  </button>
                </div>
              </div>

              {/* Title & Time limit */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Question Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Missing Semicolon in Declaration"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Time (sec)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    required
                    value={formTimeLimit}
                    onChange={(e) => setFormTimeLimit(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Description / Instructions
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Find the syntax error in the code below and fix it."
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* C Code Snippet */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {formType === 'code_fix' ? 'Buggy C Code Snippet (With Syntax Error)' : 'C Code Snippet'}
                </label>
                <textarea
                  rows={6}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder={`#include <stdio.h>\n\nint main() {\n    int a = 10\n    printf("%d", a);\n    return 0;\n}`}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* MCQ Options (if type === 'mcq') */}
              {formType === 'mcq' && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    MCQ Options & Select Correct Option
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {formOptions.map((opt, idx) => (
                      <div key={opt.label} className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 font-mono font-bold text-xs text-emerald-400 flex items-center justify-center shrink-0">
                          {opt.label}
                        </span>
                        <input
                          type="text"
                          required
                          value={opt.text}
                          onChange={(e) => {
                            const copy = [...formOptions];
                            copy[idx].text = e.target.value;
                            setFormOptions(copy);
                          }}
                          placeholder={`Option ${opt.label} text`}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Correct Option:</span>
                    {['A', 'B', 'C', 'D'].map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setFormCorrectAnswer(label)}
                        className={`w-9 h-9 rounded-xl font-bold font-mono text-sm transition-all ${
                          formCorrectAnswer === label
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Output / Code Fix correct answer */}
              {formType !== 'mcq' && (
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    {formType === 'code_fix'
                      ? 'Correct Code Fix / Corrected Statement'
                      : 'Exact Output Answer'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formCorrectAnswer}
                    onChange={(e) => setFormCorrectAnswer(e.target.value)}
                    placeholder={
                      formType === 'code_fix'
                        ? 'e.g. int a = 10; (or multiple options separated by ||)'
                        : 'e.g. 12'
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-sm focus:outline-none focus:border-emerald-400"
                  />
                  {formType === 'code_fix' && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      Tip: Whitespace & punctuation spacing are normalized automatically. Student can
                      submit the fixed line or corrected code.
                    </p>
                  )}
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Explanation (Shown on Answer Reveal)
                </label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Explain why this answer/fix is correct..."
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center space-x-1.5 shadow-lg shadow-emerald-500/25 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Update Question' : 'Save Question'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
