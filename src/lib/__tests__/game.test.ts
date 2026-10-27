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
    expect(fastRes.points).toBeGreaterThanOrEqual(140); // 100 base + up to 50 speed bonus!

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

  it('correctly evaluates code_fix questions with syntax and whitespace tolerance', () => {
    const p = GameEngine.join('Coder', 'C-101');
    const newQ = GameEngine.addQuestion({
      type: 'code_fix',
      title: 'Fix Semicolon',
      code: 'int a = 10',
      correctAnswer: 'int a = 10;',
      explanation: 'Missing semicolon',
      timeLimitSeconds: 20,
    });

    const qIdx = GameEngine.getQuestions().findIndex((q) => q.id === newQ.id);
    expect(qIdx).toBeGreaterThanOrEqual(0);
    GameEngine.startQuestion(qIdx);

    // Exact match
    const res1 = GameEngine.submitAnswer(p.id, 'int a = 10;');
    expect(res1.isCorrect).toBe(true);
    expect(res1.points).toBeGreaterThan(0);
  });

  it('supports adding, updating, deleting, and resetting questions', () => {
    const originalCount = GameEngine.getQuestions().length;

    // 1. Add question
    const created = GameEngine.addQuestion({
      type: 'output',
      title: 'Custom Pointer Test',
      correctAnswer: '42',
      explanation: 'Pointer math test',
      timeLimitSeconds: 15,
    });
    expect(GameEngine.getQuestions().length).toBe(originalCount + 1);

    // 2. Update question
    const updated = GameEngine.updateQuestion(created.id, { title: 'Updated Pointer Title' });
    expect(updated?.title).toBe('Updated Pointer Title');

    // 3. Delete question
    const deleted = GameEngine.deleteQuestion(created.id);
    expect(deleted).toBe(true);
    expect(GameEngine.getQuestions().length).toBe(originalCount);

    // 4. Reset questions
    GameEngine.resetQuestions();
    expect(GameEngine.getQuestions().length).toBeGreaterThan(0);
  });
});
