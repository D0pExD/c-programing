import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../game';

describe('Fastest Finger First GameEngine', () => {
  beforeEach(() => {
    GameEngine.resetGame();
  });

  it('allows players to join and recovers session on duplicate roll number', () => {
    const p1 = GameEngine.join('Aarav Sharma', 'BCA-001');
    expect(p1.name).toBe('Aarav Sharma');
    expect(p1.rollNo).toBe('BCA-001');

    // Reconnecting with same roll number recovers same identity
    const p1Reconn = GameEngine.join('Aarav Sharma', 'BCA-001');
    expect(p1Reconn.id).toBe(p1.id);

    // Another player joins
    const p2 = GameEngine.join('Bhavya Reddy', 'BCA-002');
    expect(p2.id).not.toBe(p1.id);
  });

  it('starts question and calculates faster answers with higher speed bonuses', () => {
    const p1 = GameEngine.join('Fast Player', 'FAST-01');
    const p2 = GameEngine.join('Slow Player', 'SLOW-02');

    // Question 1: Output prediction, correct is "12"
    GameEngine.startQuestion(0);

    // Fast player answers
    const fastRes = GameEngine.submitAnswer(p1.id, '12');
    expect(fastRes.isCorrect).toBe(true);
    expect(fastRes.points).toBeGreaterThan(150); // 100 base + high speed bonus!

    // Slow player answers with wrong answer
    const wrongRes = GameEngine.submitAnswer(p2.id, '99');
    expect(wrongRes.isCorrect).toBe(false);
    expect(wrongRes.points).toBe(0);

    expect(p1.score).toBeGreaterThan(0);
    expect(p2.score).toBe(0);
  });

  it('ranks players strictly by highest points: the one with the most points wins', () => {
    const p1 = GameEngine.join('Player 1', 'P-1');
    const p2 = GameEngine.join('Player 2', 'P-2');
    const _p3 = GameEngine.join('Player 3', 'P-3');

    GameEngine.startQuestion(0);

    GameEngine.submitAnswer(p1.id, '12'); // correct!
    GameEngine.submitAnswer(p2.id, '99'); // wrong!
    // p3 did not submit

    const snap = GameEngine.getSnapshot();
    expect(snap.leaderboard[0].id).toBe(p1.id); // Highest points = Rank 1!
    expect(snap.leaderboard[0].rank).toBe(1);
    expect(snap.leaderboard[0].score).toBeGreaterThan(0);
  });

  it('prevents multiple submissions for the same question', () => {
    const p = GameEngine.join('Bob', 'B-10');
    GameEngine.startQuestion(0);

    GameEngine.submitAnswer(p.id, '12');
    expect(() => GameEngine.submitAnswer(p.id, '12')).toThrow(/already submitted/);
  });
});
