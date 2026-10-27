'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Terminal,
  Trophy,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Lock,
  Flame,
  Radio,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CodeViewer } from '@/components/common/CodeViewer';
import { TimerDisplay } from '@/components/game/TimerDisplay';
import { BattleshipRadar } from '@/components/game/BattleshipRadar';
import { CallStackVisualizer } from '@/components/game/CallStackVisualizer';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { AuthoritativeSnapshot } from '@/types/tournament';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlayerDashboardPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [snapshot, setSnapshot] = useState<AuthoritativeSnapshot | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'GAME' | 'LEADERBOARD'>('GAME');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [secondaryOption, setSecondaryOption] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [wagerInput, setWagerInput] = useState<number>(50);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Load session token
  useEffect(() => {
    const saved = localStorage.getItem(`c_arena_token_${code}`);
    if (!saved) {
      router.push(`/join/${code}`);
      return;
    }
    setToken(saved);
  }, [code, router]);

  // Fetch authoritative snapshot
  const fetchSnapshot = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/events/${code}/snapshot?token=${token}`);
      const data = await res.json();
      if (data.success && data.snapshot) {
        setSnapshot(data.snapshot);
      }
    } catch {
      // offline / reconnecting
    } finally {
      setLoading(false);
    }
  }, [code, token]);

  useEffect(() => {
    if (!token) return;
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 1500);
    return () => clearInterval(interval);
  }, [fetchSnapshot, token]);

  // Reset form selections on question change
  useEffect(() => {
    setSelectedOption('');
    setSecondaryOption('');
    setSelectedLine(undefined);
    setActionMessage(null);
  }, [snapshot?.currentQuestion?.id]);

  // Submit Answer (Captain only)
  const handleSubmitAnswer = async () => {
    if (!token || !snapshot?.currentQuestion) return;

    // Answer determination based on round
    let answerToSubmit = selectedOption;
    if (snapshot.currentQuestion.type === 'BUG_IDENTIFY' && selectedLine !== undefined) {
      answerToSubmit = String(selectedLine);
    }

    if (!answerToSubmit) {
      setActionMessage({ text: 'Please select an answer first.', isError: true });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/events/${code}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          submittedAnswer: answerToSubmit,
          secondaryAnswer: secondaryOption || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage({ text: 'Official answer submitted! Awaiting reveal.' });
        fetchSnapshot();
      } else {
        setActionMessage({ text: data.error || 'Submission failed', isError: true });
      }
    } catch {
      setActionMessage({ text: 'Network error submitting answer.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  // Battleship Attack
  const handleBattleshipAttack = async (row: number, col: number) => {
    if (!token) return;
    const res = await fetch(`/api/events/${code}/battleship/attack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, row, col }),
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || 'Attack failed');
    }
    fetchSnapshot();
  };

  // Final Boss Wager
  const handleSubmitWager = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/events/${code}/wager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, wagerAmount: wagerInput }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ text: `Wager locked at ${wagerInput} points!` });
        fetchSnapshot();
      } else {
        setActionMessage({ text: data.error || 'Failed to submit wager', isError: true });
      }
    } catch {
      setActionMessage({ text: 'Network error locking wager.', isError: true });
    }
  };

  if (loading || !snapshot) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-400">
        <Radio className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-sm font-mono">CONNECTING TO C ARENA SERVERS...</p>
      </div>
    );
  }

  const { event, currentQuestion, playerContext, leaderboard } = snapshot;
  const isCaptain = !!playerContext?.isCaptain;
  const hasSubmitted = !!playerContext?.hasSubmitted;

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-sm text-white tracking-wider">C ARENA</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {code}
              </span>
            </div>
            {playerContext && (
              <div className="flex items-center space-x-1 text-xs text-slate-400 truncate">
                <span style={{ color: playerContext.teamColor }} className="font-bold">
                  {playerContext.teamName}
                </span>
                <span>• {playerContext.playerName}</span>
                {isCaptain && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1 rounded ml-1 border border-amber-500/20">
                    CAPTAIN
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Team Score Pill & Tab Switcher */}
        <div className="flex items-center space-x-2">
          {playerContext && (
            <div className="text-right px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs font-mono font-black text-emerald-400">
                {playerContext.teamScore}{' '}
                <span className="text-[9px] font-sans text-slate-400">PTS</span>
              </div>
              <div className="text-[10px] text-slate-400">RANK #{playerContext.teamRank}</div>
            </div>
          )}

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('GAME')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeTab === 'GAME'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              GAME
            </button>
            <button
              onClick={() => setActiveTab('LEADERBOARD')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center space-x-1 ${
                activeTab === 'LEADERBOARD'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3 h-3" />
              <span>RANKS</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col">
        {activeTab === 'LEADERBOARD' ? (
          <div className="py-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Live Standings</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {leaderboard.length} Teams Competing
              </span>
            </div>
            <LeaderboardTable items={leaderboard} highlightTeamId={playerContext?.teamId} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-4">
            {/* LOBBY / WAITING STATE */}
            {event.state === 'LOBBY_OPEN' || event.state === 'LOBBY_LOCKED' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-900/60 border border-slate-800 rounded-3xl">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
                  <Radio className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-white">CONNECTED TO LOBBY</h2>
                <p className="text-sm text-slate-400 max-w-sm mt-2">
                  Waiting for the tournament host to initiate Round 1. Discuss tactics with your
                  team members!
                </p>
                {playerContext && (
                  <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left w-full max-w-xs">
                    <div className="text-xs text-slate-400">YOUR TEAM</div>
                    <div
                      className="text-base font-bold mt-0.5"
                      style={{ color: playerContext.teamColor }}
                    >
                      {playerContext.teamName}
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      Role:{' '}
                      <strong className="text-white">
                        {isCaptain ? 'Team Captain (Answer Submitter)' : 'Team Member (Spectator)'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            ) : currentQuestion ? (
              /* ACTIVE GAMEPLAY VIEW */
              <div className="space-y-4">
                {/* Round Badge & Timer */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                      ROUND {currentQuestion.round}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      {currentQuestion.round === 1 && 'PREDICT THE OUTPUT'}
                      {currentQuestion.round === 2 && 'DEBUG THE CODE'}
                      {currentQuestion.round === 3 && 'ARRAY BATTLESHIP'}
                      {currentQuestion.round === 4 && 'RECURSION RUSH'}
                      {currentQuestion.round === 5 && 'FINAL BOSS'}
                    </span>
                  </div>

                  {event.questionState === 'ACTIVE' && (
                    <TimerDisplay
                      deadline={event.questionDeadline}
                      pausedRemainingSeconds={event.timerPausedRemainingSeconds}
                      totalSeconds={currentQuestion.timeLimitSeconds}
                      isPaused={event.timerPausedRemainingSeconds !== undefined}
                    />
                  )}

                  {event.questionState === 'LOCKED' && (
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      <Lock className="w-3.5 h-3.5" />
                      <span>SUBMISSIONS LOCKED</span>
                    </div>
                  )}

                  {(event.questionState === 'REVEALED' || event.questionState === 'SCORED') && (
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ANSWER REVEALED</span>
                    </div>
                  )}
                </div>

                {/* Question Title & Description */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                    {currentQuestion.title}
                  </h3>
                  <p className="text-xs text-slate-400">{currentQuestion.description}</p>
                </div>

                {/* C Syntax Code Snippet */}
                {currentQuestion.codeSnippet && (
                  <CodeViewer
                    code={currentQuestion.codeSnippet}
                    selectedLine={selectedLine}
                    highlightedLine={
                      event.questionState === 'REVEALED' || event.questionState === 'SCORED'
                        ? currentQuestion.bugLineNumber
                        : undefined
                    }
                    interactiveLines={
                      currentQuestion.type === 'BUG_IDENTIFY' &&
                      event.questionState === 'ACTIVE' &&
                      isCaptain &&
                      !hasSubmitted
                    }
                    onSelectLine={(line) => setSelectedLine(line)}
                  />
                )}

                {/* ROUND 2 Line Selection Notice */}
                {currentQuestion.type === 'BUG_IDENTIFY' && event.questionState === 'ACTIVE' && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                    <span>
                      {selectedLine
                        ? `Selected Faulty Line: Line ${selectedLine}`
                        : 'Tap the bug line in the code above to select it.'}
                    </span>
                    {selectedLine && (
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">
                        LINE {selectedLine} ARMED
                      </span>
                    )}
                  </div>
                )}

                {/* ROUND 3 Array Battleship Radar Grid */}
                {currentQuestion.round === 3 && (
                  <BattleshipRadar
                    tokensAvailable={playerContext?.attackTokensAvailable || 0}
                    revealedCells={playerContext?.teamBoard?.revealedCells || []}
                    isCaptain={isCaptain}
                    onAttack={handleBattleshipAttack}
                  />
                )}

                {/* ROUND 4 Recursion Call Stack Visualizer */}
                {currentQuestion.round === 4 &&
                  (event.questionState === 'REVEALED' || event.questionState === 'SCORED') &&
                  currentQuestion.callStackFrames && (
                    <CallStackVisualizer frames={currentQuestion.callStackFrames} />
                  )}

                {/* ROUND 5 Final Boss Wager Submissions */}
                {currentQuestion.round === 5 && event.questionState === 'ACTIVE' && isCaptain && (
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
                    <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5 mb-2">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>Finalist Wager</span>
                    </h4>
                    {playerContext?.finalWager?.isLocked ? (
                      <div className="text-xs text-emerald-400 font-bold">
                        Wager locked: {playerContext.finalWager.amount} PTS!
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={50}
                          max={playerContext?.teamScore || 500}
                          value={wagerInput}
                          onChange={(e) => setWagerInput(parseInt(e.target.value) || 0)}
                          className="w-32 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm"
                        />
                        <button
                          onClick={handleSubmitWager}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                        >
                          LOCK WAGER
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Multiple Choice Options */}
                {currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {currentQuestion.round === 2 ? 'Select Fix / Bug Option' : 'Answer Options'}
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {currentQuestion.options.map((opt) => {
                        const isSelected = selectedOption === opt.id;
                        const isRevealed =
                          event.questionState === 'REVEALED' || event.questionState === 'SCORED';
                        const isCorrectAnswer =
                          isRevealed && currentQuestion.correctAnswer === opt.id;

                        let optClass =
                          'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200';
                        if (isSelected) {
                          optClass =
                            'border-emerald-400 bg-emerald-500/15 text-white ring-1 ring-emerald-400 shadow-[0_0_15px_rgba(0,245,160,0.15)]';
                        }
                        if (isRevealed && isCorrectAnswer) {
                          optClass =
                            'border-emerald-400 bg-emerald-500/30 text-emerald-200 ring-2 ring-emerald-400 font-bold';
                        }

                        return (
                          <button
                            key={opt.id}
                            disabled={!isCaptain || hasSubmitted || event.questionState !== 'ACTIVE'}
                            onClick={() => setSelectedOption(opt.id)}
                            className={`p-3.5 rounded-xl border text-left flex items-start space-x-3 transition-all ${optClass}`}
                          >
                            <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold font-mono shrink-0">
                              {opt.label}
                            </span>
                            <span className="text-xs sm:text-sm font-mono flex-1 leading-relaxed">
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ROUND 2 Secondary Fix Selection */}
                {currentQuestion.round === 2 && currentQuestion.fixBonusOptionId && (
                  <div className="mt-3">
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      Secondary Fix Bonus (+50 PTS)
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setSecondaryOption('fix-1')}
                        disabled={!isCaptain || hasSubmitted || event.questionState !== 'ACTIVE'}
                        className={`p-3 rounded-xl border text-left text-xs font-mono transition-all ${
                          secondaryOption === 'fix-1'
                            ? 'border-amber-400 bg-amber-500/15 text-amber-200 ring-1 ring-amber-400'
                            : 'border-slate-800 bg-slate-900/70 text-slate-300'
                        }`}
                      >
                        Change Line 6 to: scanf(&quot;%d&quot;, &amp;score);
                      </button>
                    </div>
                  </div>
                )}

                {/* Captain Submission Action Bar */}
                {event.questionState === 'ACTIVE' && (
                  <div className="pt-2">
                    {isCaptain ? (
                      <div>
                        {hasSubmitted ? (
                          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>
                              Your team&apos;s official answer has been submitted! Awaiting host reveal.
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={handleSubmitAnswer}
                            disabled={submitting}
                            className="w-full py-4 rounded-xl font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                          >
                            <CheckCircle className="w-5 h-5" />
                            <span>{submitting ? 'RECORDING ANSWER...' : 'SUBMIT OFFICIAL TEAM ANSWER'}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                        <Lock className="w-4 h-4 text-slate-500" />
                        <span>
                          {hasSubmitted
                            ? 'Team Captain has submitted the answer!'
                            : 'Team Captain has official submission control.'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {actionMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                      actionMessage.isError
                        ? 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
                        : 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    {actionMessage.isError ? (
                      <XCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{actionMessage.text}</span>
                  </div>
                )}

                {/* REVEAL & EXPLANATION PANEL */}
                {(event.questionState === 'REVEALED' || event.questionState === 'SCORED') &&
                  currentQuestion.explanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl relative overflow-hidden"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                          Explanation & Solution
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                        {currentQuestion.explanation}
                      </p>

                      {/* Player submission outcome */}
                      {playerContext?.mySubmission && (
                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Team Result:</span>
                          <span
                            className={`font-bold ${
                              playerContext.mySubmission.isCorrect
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {playerContext.mySubmission.isCorrect
                              ? `CORRECT (+${playerContext.mySubmission.pointsAwarded || 100} PTS)`
                              : 'INCORRECT (+0 PTS)'}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
