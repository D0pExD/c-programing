import { describe, it, expect } from 'vitest';
import { calculateSubmissionScore, calculateBattleshipPoints, calculateWagerResult, computeRanks } from '../scoring';
import { canTransitionEvent, canTransitionQuestion, validateEventTransition } from '../state-machine';
import { Question, Team, FinalWager } from '@/types/tournament';

describe('Scoring Engine', () => {
  const dummyQuestion: Question = {
    id: 'q1',
    round: 1,
    type: 'SINGLE_CHOICE',
    title: 'Pointer arithmetic',
    description: 'Output prediction',
    codeSnippet: 'int a = 5;',
    options: [
      { id: 'opt1', label: 'A', text: '5' },
      { id: 'opt2', label: 'B', text: '6' },
    ],
    correctAnswer: 'opt1',
    explanation: 'Basic assignment',
    difficulty: 'EASY',
    timeLimitSeconds: 30,
    basePoints: 100,
    speedBonusMax: 50,
    tags: ['pointers'],
    orderIndex: 1,
  };

  it('awards base 100 points and speed bonus for fast correct answers', () => {
    // 5 seconds elapsed out of 30 seconds -> 25s remaining / 30s = ~83.3% * 50 = ~42 speed points
    const result = calculateSubmissionScore(dummyQuestion, 'opt1', undefined, 5000, 30, true);
    expect(result.isCorrect).toBe(true);
    expect(result.basePointsAwarded).toBe(100);
    expect(result.speedBonusAwarded).toBe(42);
    expect(result.totalPointsAwarded).toBe(142);
  });

  it('awards 0 points for incorrect answers', () => {
    const result = calculateSubmissionScore(dummyQuestion, 'opt2', undefined, 2000, 30, true);
    expect(result.isCorrect).toBe(false);
    expect(result.totalPointsAwarded).toBe(0);
  });

  it('scores Round 2 bug identification and fix bonus correctly', () => {
    const debugQuestion: Question = {
      ...dummyQuestion,
      round: 2,
      correctAnswer: 'line-4',
      fixBonusOptionId: 'fix-pointer',
      basePoints: 150,
    };

    const res = calculateSubmissionScore(debugQuestion, 'line-4', 'fix-pointer', 10000, 30, false);
    expect(res.isCorrect).toBe(true);
    expect(res.basePointsAwarded).toBe(150);
    expect(res.secondaryPointsAwarded).toBe(50);
    expect(res.totalPointsAwarded).toBe(200);
  });

  it('scores Battleship hits, bonuses, and misses', () => {
    expect(calculateBattleshipPoints('SHIP')).toBe(100);
    expect(calculateBattleshipPoints('BONUS')).toBe(50);
    expect(calculateBattleshipPoints('EMPTY')).toBe(0);
  });

  it('applies wager correctly for win and loss, respecting negative score boundary', () => {
    const wager: FinalWager = {
      id: 'w1',
      eventId: 'ev1',
      teamId: 't1',
      wagerAmount: 300,
      submittedAt: new Date().toISOString(),
      isLocked: true,
      isRevealed: true,
    };

    // Correct answer
    const win = calculateWagerResult(500, wager, true, false);
    expect(win.pointsDelta).toBe(300);
    expect(win.newScore).toBe(800);

    // Wrong answer, score clamped to 0 if allowNegative is false
    const loss = calculateWagerResult(200, wager, false, false);
    expect(loss.newScore).toBe(0);
    expect(loss.pointsDelta).toBe(-200);

    // Wrong answer allowing negative
    const lossNegative = calculateWagerResult(200, wager, false, true);
    expect(lossNegative.newScore).toBe(-100);
    expect(lossNegative.pointsDelta).toBe(-300);
  });

  it('ranks teams with strict tie-breaking rules', () => {
    const teams: Team[] = [
      { id: 't1', eventId: 'e', name: 'Alpha', color: '#ff0000', members: [], score: 200, rank: 0, correctCount: 2, totalResponseTimeMs: 15000, isLocked: false },
      { id: 't2', eventId: 'e', name: 'Beta', color: '#00ff00', members: [], score: 300, rank: 0, correctCount: 3, totalResponseTimeMs: 18000, isLocked: false },
      { id: 't3', eventId: 'e', name: 'Gamma', color: '#0000ff', members: [], score: 200, rank: 0, correctCount: 2, totalResponseTimeMs: 12000, isLocked: false }, // faster than t1!
    ];

    const ranked = computeRanks(teams);
    expect(ranked[0].id).toBe('t2'); // 300 pts -> 1st
    expect(ranked[1].id).toBe('t3'); // 200 pts, faster cumulative response time (12s vs 15s) -> 2nd
    expect(ranked[2].id).toBe('t1'); // 200 pts, slower -> 3rd
  });
});

describe('State Machine', () => {
  it('allows valid event state transitions', () => {
    expect(canTransitionEvent('DRAFT', 'LOBBY_OPEN')).toBe(true);
    expect(canTransitionEvent('LOBBY_OPEN', 'RUNNING')).toBe(true);
    expect(canTransitionEvent('RUNNING', 'PAUSED')).toBe(true);
    expect(canTransitionEvent('PAUSED', 'RUNNING')).toBe(true);
    expect(canTransitionEvent('RUNNING', 'FINISHED')).toBe(true);
  });

  it('rejects invalid state transitions', () => {
    expect(canTransitionEvent('DRAFT', 'RUNNING')).toBe(false);
    expect(canTransitionEvent('FINISHED', 'RUNNING')).toBe(false);
    expect(() => validateEventTransition('DRAFT', 'FINISHED')).toThrow();
  });

  it('validates question state progression', () => {
    expect(canTransitionQuestion('PREVIEW', 'ACTIVE')).toBe(true);
    expect(canTransitionQuestion('ACTIVE', 'LOCKED')).toBe(true);
    expect(canTransitionQuestion('LOCKED', 'REVEALED')).toBe(true);
    expect(canTransitionQuestion('REVEALED', 'SCORED')).toBe(true);
  });
});
