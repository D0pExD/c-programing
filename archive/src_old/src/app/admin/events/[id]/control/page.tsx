'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/navigation';
import {
  Terminal,
  Play,
  Pause,
  Lock,
  Eye,
  CheckCircle,
  SkipForward,
  RotateCcw,
  Users,
  Settings,
  FileSpreadsheet,
  Trophy,
  AlertTriangle,
  Keyboard,
  Radio,
  ExternalLink,
  Bot,
  HelpCircle,
} from 'lucide-react';
import { CodeViewer } from '@/components/common/CodeViewer';
import { TimerDisplay } from '@/components/game/TimerDisplay';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { TournamentEvent, Question, AdminAuditLog } from '@/types/tournament';

export default function AdminControlRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [event, setEvent] = useState<TournamentEvent | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedAdjustTeam, setSelectedAdjustTeam] = useState('');
  const [adjustPoints, setAdjustPoints] = useState(50);
  const [adjustReason, setAdjustReason] = useState('Bonus for elegant explanation');

  const fetchEventData = useCallback(async () => {
    try {
      const res = await fetch(`/api/events`);
      const data = await res.json();
      if (data.success && data.events) {
        const found = data.events.find((e: TournamentEvent) => e.id === eventId);
        if (found) setEvent(found);
      }

      const qRes = await fetch(`/api/admin/events/${eventId}/questions`);
      const qData = await qRes.json();
      if (qData.success && qData.questions) {
        setQuestions(qData.questions);
      }
    } catch {
      // sync error
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
    const interval = setInterval(fetchEventData, 1500);
    return () => clearInterval(interval);
  }, [fetchEventData]);

  // Execute control actions
  const sendControlAction = async (
    action: string,
    targetState?: string,
    targetQuestionId?: string
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetState, targetQuestionId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchEventData();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch {
      alert('Network error executing command');
    } finally {
      setActionLoading(false);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (event?.questionState === 'ACTIVE') {
          if (event.timerPausedRemainingSeconds !== undefined) {
            sendControlAction('RESUME_TIMER');
          } else {
            sendControlAction('PAUSE_TIMER');
          }
        } else if (event?.questionState === 'PREVIEW' || event?.questionState === 'READY') {
          sendControlAction('SET_QUESTION_STATE', 'ACTIVE');
        }
      } else if (e.key === 'l' || e.key === 'L') {
        if (event?.questionState === 'ACTIVE') {
          sendControlAction('SET_QUESTION_STATE', 'LOCKED');
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (event?.questionState === 'LOCKED') {
          sendControlAction('SET_QUESTION_STATE', 'REVEALED');
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (event?.questionState === 'REVEALED') {
          sendControlAction('CALCULATE_SCORES');
        }
      } else if (e.key === 'n' || e.key === 'N') {
        sendControlAction('ADVANCE_QUESTION');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [event]);

  const handleScoreAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustTeam) return;

    try {
      const res = await fetch(`/api/admin/events/${eventId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedAdjustTeam,
          pointsDelta: adjustPoints,
          reason: adjustReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAdjustModal(false);
        fetchEventData();
      } else {
        alert(data.error || 'Adjustment failed');
      }
    } catch {
      alert('Network error adjusting score');
    }
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-400 font-mono">
        <Radio className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <span>LOADING TOURNAMENT CONTROL ROOM...</span>
      </div>
    );
  }

  const currentQ = questions.find((q) => q.id === event.currentQuestionId) || questions[0];
  const qState = event.questionState;

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex">
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center space-x-2.5 px-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm text-white tracking-wider">C ARENA</span>
              <span className="block text-[10px] text-slate-500 font-mono uppercase">
                HOST CONTROL ROOM
              </span>
            </div>
          </div>

          <nav className="space-y-1 text-xs font-semibold">
            <a
              href={`/admin/events/${eventId}/control`}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold"
            >
              <Play className="w-4 h-4" />
              <span>Live Game Control</span>
            </a>
            <a
              href={`/admin/events/${eventId}/lobby`}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <Users className="w-4 h-4" />
              <span>Lobby & Teams</span>
            </a>
            <a
              href={`/admin/events/${eventId}/questions`}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Question Bank</span>
            </a>
            <a
              href={`/admin/events/${eventId}/scores`}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <Trophy className="w-4 h-4" />
              <span>Score Ledger</span>
            </a>
            <a
              href={`/admin/events/${eventId}/reports`}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Reports & CSV</span>
            </a>
            <a
              href={`/admin/events/${eventId}/settings`}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <Settings className="w-4 h-4" />
              <span>Event Settings</span>
            </a>
          </nav>

          {/* Quick Launch Display Links */}
          <div className="pt-4 border-t border-slate-900 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-2">
              PUBLIC FEEDS
            </span>
            <a
              href={`/display/${event.code}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 hover:text-white"
            >
              <span>Projector Display</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
            <a
              href={`/join/${event.code}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 hover:text-white"
            >
              <span>Student Join View</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          </div>
        </div>

        {/* Simulator & Shortcut toggles */}
        <div className="space-y-2 pt-4 border-t border-slate-900">
          <button
            onClick={() => sendControlAction('SIMULATE_CLASSROOM')}
            disabled={actionLoading}
            className="w-full py-2 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Simulate 50 Students</span>
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono flex items-center justify-center space-x-1.5"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Shortcuts (Press ?)</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CENTER CONTROL PANEL */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Top Status & Main Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-slate-200">Event Status:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                {event.state}
              </span>
              <span className="text-slate-500 font-mono text-xs">• CODE: {event.code}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Current Question State:{' '}
              <strong className="text-white font-mono">{qState}</strong>
            </div>
          </div>

          {/* Core Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Start Timer / Resume */}
            {qState === 'PREVIEW' || qState === 'READY' ? (
              <button
                onClick={() => sendControlAction('SET_QUESTION_STATE', 'ACTIVE')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>START TIMER (SPACE)</span>
              </button>
            ) : qState === 'ACTIVE' ? (
              <>
                {event.timerPausedRemainingSeconds !== undefined ? (
                  <button
                    onClick={() => sendControlAction('RESUME_TIMER')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>RESUME TIMER</span>
                  </button>
                ) : (
                  <button
                    onClick={() => sendControlAction('PAUSE_TIMER')}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center space-x-1.5"
                  >
                    <Pause className="w-4 h-4" />
                    <span>PAUSE TIMER</span>
                  </button>
                )}
                <button
                  onClick={() => sendControlAction('SET_QUESTION_STATE', 'LOCKED')}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center space-x-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>LOCK SUBMISSIONS (L)</span>
                </button>
              </>
            ) : qState === 'LOCKED' ? (
              <button
                onClick={() => sendControlAction('SET_QUESTION_STATE', 'REVEALED')}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs flex items-center space-x-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>REVEAL ANSWER (R)</span>
              </button>
            ) : qState === 'REVEALED' ? (
              <button
                onClick={() =>
                  currentQ.round === 5
                    ? sendControlAction('SCORE_FINAL_BOSS')
                    : sendControlAction('CALCULATE_SCORES')
                }
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle className="w-4 h-4" />
                <span>CALCULATE SCORES (S)</span>
              </button>
            ) : (
              <button
                onClick={() => sendControlAction('ADVANCE_QUESTION')}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs flex items-center space-x-1.5"
              >
                <SkipForward className="w-4 h-4" />
                <span>NEXT QUESTION (N)</span>
              </button>
            )}

            {/* Manual score adjust trigger */}
            <button
              onClick={() => setShowAdjustModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center space-x-1"
            >
              <span>± ADJUST</span>
            </button>
          </div>
        </div>

        {/* Current Question Admin Inspection */}
        {currentQ && (
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase">
                  ROUND {currentQ.round} • {currentQ.type}
                </span>
                <h2 className="text-xl font-bold text-white mt-2">{currentQ.title}</h2>
              </div>

              {/* Timer Preview */}
              {qState === 'ACTIVE' && (
                <TimerDisplay
                  deadline={event.questionDeadline}
                  pausedRemainingSeconds={event.timerPausedRemainingSeconds}
                  totalSeconds={currentQ.timeLimitSeconds}
                  isPaused={event.timerPausedRemainingSeconds !== undefined}
                />
              )}
            </div>

            {/* C Syntax Snippet */}
            {currentQ.codeSnippet && (
              <CodeViewer
                code={currentQ.codeSnippet}
                highlightedLine={currentQ.bugLineNumber}
              />
            )}

            {/* Admin ONLY: Correct Answer & Explanation */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle className="w-4 h-4" />
                <span>CORRECT ANSWER (ADMIN VISIBLE ONLY)</span>
              </div>
              <div className="font-mono text-sm font-bold text-white bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                {currentQ.correctAnswer}
              </div>
              <p className="text-slate-300 leading-relaxed">{currentQ.explanation}</p>
            </div>
          </div>
        )}
      </main>

      {/* 3. RIGHT PANEL: LIVE STANDINGS & STATUS */}
      <aside className="w-80 bg-slate-950 border-l border-slate-800 p-4 space-y-4 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="font-bold text-sm text-white flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Live Standings</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-500">{event.teams.length} Teams</span>
        </div>

        <LeaderboardTable
          items={event.teams.map((t) => ({ ...t, memberCount: t.members.length }))}
          compact
        />
      </aside>

      {/* Keyboard Shortcuts Reference Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Keyboard className="w-4 h-4 text-emerald-400" />
                <span>Keyboard Shortcuts</span>
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ESC
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">SPACE</span>
                <span className="text-emerald-400">Start / Pause / Resume Timer</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">L</span>
                <span className="text-rose-400">Lock Submissions</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">R</span>
                <span className="text-purple-400">Reveal Official Answer</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">S</span>
                <span className="text-emerald-400">Calculate Question Scores</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">N</span>
                <span className="text-blue-400">Next Question</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Score Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleScoreAdjustment}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4"
          >
            <h3 className="font-bold text-white text-base">Manual Score Adjustment</h3>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Select Team
              </label>
              <select
                required
                value={selectedAdjustTeam}
                onChange={(e) => setSelectedAdjustTeam(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              >
                <option value="">-- Choose Team --</option>
                {event.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Current: {t.score} PTS)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Points Delta (use negative to deduct)
              </label>
              <input
                type="number"
                required
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Mandatory Audit Reason
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Penalty for illegal communication"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
              >
                Apply Adjustment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
