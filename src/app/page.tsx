'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  Zap,
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { Leaderboard } from '@/components/Leaderboard';
import { supabase, FFF_CHANNEL_NAME } from '@/lib/supabase';

interface Snapshot {
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
  playerInfo?: {
    id: string;
    name: string;
    rollNo: string;
    score: number;
    rank: number;
    correctCount: number;
    hasSubmitted: boolean;
    lastAnswer?: {
      answer: string;
      isCorrect: boolean;
      points: number;
      timeMs: number;
    };
  };
}

export default function StudentPlayPage() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  // Active answer input
  const [textAnswer, setTextAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  // Load existing player ID
  useEffect(() => {
    const saved = localStorage.getItem('fff_player_id');
    if (saved) {
      setPlayerId(saved);
    }
  }, []);

  const enrichSnapshotForPlayer = (raw: Snapshot, pId: string | null): Snapshot => {
    if (!pId || !raw.leaderboard) return raw;
    const p = raw.leaderboard.find((item) => item.id === pId);
    if (!p) return raw;
    return {
      ...raw,
      playerInfo: raw.playerInfo || {
        id: p.id,
        name: p.name,
        rollNo: p.rollNo,
        score: p.score,
        rank: p.rank,
        correctCount: p.correctCount,
        hasSubmitted: (p as unknown as { hasSubmittedCurrent?: boolean }).hasSubmittedCurrent || false,
      },
    };
  };

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Real-Time Supabase WebSocket + HTTP Fallback
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const url = playerId ? `/api/game?playerId=${playerId}` : '/api/game';
        const res = await fetch(url);
        const d = await res.json();
        if (d.snapshot) {
          setSnapshot(enrichSnapshotForPlayer(d.snapshot, playerId));
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
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'GAME_STATE' }, (payload) => {
          if (payload.payload) {
            setSnapshot(enrichSnapshotForPlayer(payload.payload, playerId));
            setLoading(false);
          }
        })
        .on('broadcast', { event: 'SNAPSHOT' }, (payload) => {
          if (payload.payload) {
            setSnapshot(enrichSnapshotForPlayer(payload.payload, playerId));
            setLoading(false);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'REQUEST_STATE',
              payload: { playerId },
            });
          }
        });

      // 2s HTTP poll backup
      const pollInterval = setInterval(fetchLatest, 2000);

      return () => {
        clearInterval(pollInterval);
        channel.unsubscribe();
        channelRef.current = null;
      };
    }

    // 2. HTTP Polling fallback if Supabase not configured
    const interval = setInterval(fetchLatest, 1500);
    return () => clearInterval(interval);
  }, [playerId]);

  const fetchSnapshot = async (targetPlayerId?: string) => {
    try {
      const pid = targetPlayerId || playerId;
      const url = pid ? `/api/game?playerId=${pid}` : '/api/game';
      const res = await fetch(url);
      const data = await res.json();
      if (data.snapshot) setSnapshot(data.snapshot);
    } catch {
      // ignore
    }
  };

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

  // Reset input on question change
  useEffect(() => {
    setTextAnswer('');
    setSubmitFeedback(null);
  }, [snapshot?.currentQuestion?.id]);

  // Handle Joining
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNo.trim()) return;

    setJoining(true);
    setJoinError(null);

    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'JOIN',
          name: name.trim(),
          rollNo: rollNo.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (data.success && data.player) {
        localStorage.setItem('fff_player_id', data.player.id);
        setPlayerId(data.player.id);
        fetchSnapshot(data.player.id);

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'STUDENT_JOIN',
            payload: { name: name.trim(), rollNo: rollNo.trim().toUpperCase() },
          });
          channelRef.current.send({
            type: 'broadcast',
            event: 'PLAYER_JOIN',
            payload: { name: name.trim(), rollNo: rollNo.trim().toUpperCase() },
          });
        }
      } else {
        setJoinError(data.error || 'Failed to join');
      }
    } catch {
      setJoinError('Network error joining the quiz');
    } finally {
      setJoining(false);
    }
  };

  // Handle Submit Answer
  const handleSubmit = async (answerVal: string) => {
    if (!playerId || !answerVal.trim() || submitting) return;

    setSubmitting(true);
    try {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'STUDENT_SUBMIT',
          payload: { playerId, answer: answerVal.trim() },
        });
        channelRef.current.send({
          type: 'broadcast',
          event: 'SUBMIT_ANSWER',
          payload: { playerId, answer: answerVal.trim() },
        });
      }

      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT',
          playerId,
          answer: answerVal.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitFeedback(`⚡ Answer submitted in ${(data.timeMs / 1000).toFixed(2)}s!`);
        fetchSnapshot();
      } else {
        setSubmitFeedback(data.error || 'Failed to submit');
      }
    } catch {
      setSubmitFeedback('Error submitting answer');
    } finally {
      setSubmitting(false);
    }
  };

  // 1. JOIN SCREEN
  if (!playerId) {
    return (
      <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-[0_0_20px_rgba(0,245,160,0.25)]">
              <Zap className="w-8 h-8 fill-emerald-400 text-emerald-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              FASTEST FINGER FIRST
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              BCA C Programming Quiz • Speed & Accuracy
            </p>
          </div>

          {joinError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
              {joinError}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Your Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Verma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Roll Number / Student ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BCA-042"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-sm font-mono uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={joining}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 mt-2"
            >
              {joining ? (
                <span>JOINING...</span>
              ) : (
                <>
                  <span>ENTER QUIZ</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800/80">
            <a href="/host" className="hover:text-emerald-400 flex items-center space-x-1">
              <span>Host Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a href="/display" className="hover:text-emerald-400 flex items-center space-x-1">
              <span>Projector View</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !snapshot) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-400 font-mono">
        <Radio className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <span>CONNECTING TO GAME SERVER...</span>
      </div>
    );
  }

  const { state, currentQuestion, playerInfo, leaderboard } = snapshot;
  const hasSubmitted = !!playerInfo?.hasSubmitted;

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Zap className="w-4 h-4 fill-emerald-400" />
          </div>
          <div className="min-w-0">
            <span className="font-black text-sm text-white tracking-wider block">FASTEST FINGER</span>
            {playerInfo && (
              <span className="text-xs text-slate-400 font-mono truncate block">
                {playerInfo.name} ({playerInfo.rollNo})
              </span>
            )}
          </div>
        </div>

        {/* Score & Rank Pill */}
        {playerInfo && (
          <div className="text-right px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
            <div className="text-sm font-black font-mono text-emerald-400">
              {playerInfo.score} <span className="text-[10px] text-slate-400 font-sans">PTS</span>
            </div>
            <div className="text-[10px] text-slate-400 font-bold">RANK #{playerInfo.rank}</div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center">
        {/* 1. LOBBY STATE */}
        {state === 'LOBBY' && (
          <div className="text-center p-8 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto animate-pulse">
              <Zap className="w-8 h-8 fill-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-white">YOU&apos;RE IN THE LOBBY!</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              Waiting for the host to launch Question 1. Answer as fast as possible to earn maximum speed points!
            </p>
            <div className="inline-block px-4 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
              {snapshot.totalPlayers} Students Connected
            </div>
          </div>
        )}

        {/* 2. QUESTION ACTIVE STATE */}
        {state === 'QUESTION' && currentQuestion && (
          <div className="space-y-4">
            {/* Question Info Bar & Timer */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold font-mono text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 uppercase">
                Q{currentQuestion.id} of {snapshot.totalQuestions}
              </span>

              {/* Timer Bar */}
              <div className="flex items-center space-x-2 text-xs font-mono font-bold">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span
                  className={`${
                    localTimeRemaining <= 5 ? 'text-rose-400 animate-pulse font-black text-sm' : 'text-slate-200'
                  }`}
                >
                  {localTimeRemaining}s
                </span>
              </div>
            </div>

            {/* Question Title & Description */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
              <h2 className="text-base sm:text-lg font-bold text-white">{currentQuestion.title}</h2>
              {currentQuestion.description && (
                <p className="text-xs text-slate-400 mt-1">{currentQuestion.description}</p>
              )}
            </div>

            {/* C Code Snippet (if any) */}
            {currentQuestion.code && <CodeBlock code={currentQuestion.code} />}

            {/* Submission Form / Buttons */}
            {hasSubmitted ? (
              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-emerald-300">
                  {submitFeedback || 'Answer Locked In!'}
                </div>
                <p className="text-xs text-slate-400">Waiting for host to reveal results...</p>
              </div>
            ) : currentQuestion.type === 'mcq' && currentQuestion.options ? (
              /* MCQ OPTION BUTTONS */
              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.label}
                    disabled={submitting}
                    onClick={() => handleSubmit(opt.label)}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-emerald-400 hover:bg-emerald-500/10 text-left flex items-center space-x-3 transition-all active:scale-98 disabled:opacity-50"
                  >
                    <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold font-mono text-sm text-emerald-400 shrink-0">
                      {opt.label}
                    </span>
                    <span className="text-sm font-medium text-slate-200">{opt.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              /* OUTPUT PREDICTION INPUT */
              <div className="space-y-3 pt-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Type Exact Output
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. 12"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit(textAnswer);
                    }}
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-base focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    disabled={submitting || !textAnswer.trim()}
                    onClick={() => handleSubmit(textAnswer)}
                    className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase flex items-center space-x-1 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40"
                  >
                    <span>SUBMIT</span>
                    <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. REVEAL STATE */}
        {state === 'REVEAL' && currentQuestion && (
          <div className="space-y-4">
            {/* Result for player */}
            {playerInfo?.lastAnswer ? (
              <div
                className={`p-6 rounded-2xl border text-center space-y-2 ${
                  playerInfo.lastAnswer.isCorrect
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_25px_rgba(0,245,160,0.2)]'
                    : 'bg-rose-950/40 border-rose-500/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  {playerInfo.lastAnswer.isCorrect ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                      <span className="text-lg font-black text-emerald-300">CORRECT!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-rose-400" />
                      <span className="text-lg font-black text-rose-300">INCORRECT!</span>
                    </>
                  )}
                </div>

                <div className="text-2xl font-black font-mono text-white">
                  {playerInfo.lastAnswer.isCorrect ? `+${playerInfo.lastAnswer.points} PTS` : '+0 PTS'}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Your Answer: <strong>{playerInfo.lastAnswer.answer}</strong> (took{' '}
                  {(playerInfo.lastAnswer.timeMs / 1000).toFixed(2)}s)
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                You did not submit an answer for this question in time.
              </div>
            )}

            {/* Official Answer & Explanation */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Official Answer
              </div>
              <div className="text-lg font-bold font-mono text-emerald-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                {currentQuestion.correctAnswer}
              </div>
              {currentQuestion.explanation && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans pt-1">
                  {currentQuestion.explanation}
                </p>
              )}
            </div>

            <p className="text-center text-xs text-slate-500 font-mono">
              Waiting for host to show leaderboard or next question...
            </p>
          </div>
        )}

        {/* 4. LEADERBOARD STATE */}
        {state === 'LEADERBOARD' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <div className="inline-flex p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-1">
                <Trophy className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-white">CURRENT STANDINGS</h2>
              <p className="text-xs text-slate-400">The student with the most points wins!</p>
            </div>

            <Leaderboard items={leaderboard} currentUserId={playerId} />
          </div>
        )}

        {/* 5. FINISHED STATE */}
        {state === 'FINISHED' && (
          <div className="space-y-6 text-center">
            <div className="p-8 rounded-3xl bg-amber-500/10 border border-amber-500/40 shadow-2xl">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
              <h2 className="text-2xl font-black text-white">QUIZ FINISHED!</h2>
              <p className="text-xs text-slate-400 mt-1">C Arena Fastest Finger Tournament</p>

              {playerInfo && (
                <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 inline-block text-center">
                  <div className="text-xs text-slate-400">YOUR FINAL RANK</div>
                  <div className="text-3xl font-black font-mono text-amber-400 mt-1">
                    #{playerInfo.rank}
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                    {playerInfo.score} TOTAL POINTS
                  </div>
                </div>
              )}
            </div>

            <Leaderboard items={leaderboard} currentUserId={playerId} />
          </div>
        )}
      </main>
    </div>
  );
}
