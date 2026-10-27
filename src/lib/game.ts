import { Question, QUESTIONS } from '@/data/questions';

export type GameState = 'LOBBY' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'FINISHED';

export interface Player {
  id: string;
  name: string;
  rollNo: string;
  score: number;
  rank: number;
  correctCount: number;
  totalTimeMs: number;
  joinedAt: number;
  lastAnswer?: {
    answer: string;
    isCorrect: boolean;
    points: number;
    timeMs: number;
  };
}

export interface Submission {
  playerId: string;
  questionId: number;
  answer: string;
  isCorrect: boolean;
  points: number;
  timeMs: number;
}

type Listener = () => void;

interface ServerGameState {
  state: GameState;
  questionIndex: number;
  questionStartTime: number;
  players: Map<string, Player>; // id -> Player
  submissions: Map<number, Map<string, Submission>>; // questionId -> (playerId -> Submission)
  listeners: Set<Listener>;
}

declare global {
  var __fff_game: ServerGameState | undefined;
}

function getGame(): ServerGameState {
  if (!globalThis.__fff_game) {
    globalThis.__fff_game = {
      state: 'LOBBY',
      questionIndex: 0,
      questionStartTime: 0,
      players: new Map(),
      submissions: new Map(),
      listeners: new Set(),
    };

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fff_host_game_backup');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.players && Array.isArray(parsed.players)) {
            parsed.players.forEach((p: Player) => {
              globalThis.__fff_game!.players.set(p.id, p);
            });
          }
          if (parsed.state) globalThis.__fff_game.state = parsed.state;
          if (typeof parsed.questionIndex === 'number') {
            globalThis.__fff_game.questionIndex = parsed.questionIndex;
          }
        }
      } catch {
        // ignore
      }
    }
  }
  return globalThis.__fff_game;
}

export class GameEngine {
  private static game = getGame();

  private static persist() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'fff_host_game_backup',
          JSON.stringify({
            players: Array.from(this.game.players.values()),
            state: this.game.state,
            questionIndex: this.game.questionIndex,
          })
        );
      } catch {
        // ignore
      }
    }
  }

  public static subscribe(fn: Listener) {
    this.game.listeners.add(fn);
  }

  public static unsubscribe(fn: Listener) {
    this.game.listeners.delete(fn);
  }

  public static notify() {
    this.game.listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        // closed client
      }
    });
  }

  public static getQuestions(): Question[] {
    return QUESTIONS;
  }

  public static join(name: string, rollNo: string): Player {
    const cleanName = name.trim();
    const cleanRoll = rollNo.trim().toUpperCase();

    // Reconnection check: if roll number already registered, recover profile!
    for (const p of this.game.players.values()) {
      if (p.rollNo.toUpperCase() === cleanRoll) {
        return p;
      }
    }

    const id = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPlayer: Player = {
      id,
      name: cleanName,
      rollNo: cleanRoll,
      score: 0,
      rank: this.game.players.size + 1,
      correctCount: 0,
      totalTimeMs: 0,
      joinedAt: Date.now(),
    };

    this.game.players.set(id, newPlayer);
    this.recomputeRanks();
    this.persist();
    this.notify();
    return newPlayer;
  }

  public static getPlayer(playerId: string): Player | undefined {
    return this.game.players.get(playerId);
  }

  public static startQuestion(index: number) {
    if (index >= 0 && index < QUESTIONS.length) {
      this.game.questionIndex = index;
      this.game.state = 'QUESTION';
      this.game.questionStartTime = Date.now();
      if (!this.game.submissions.has(QUESTIONS[index].id)) {
        this.game.submissions.set(QUESTIONS[index].id, new Map());
      }
      this.notify();
    }
  }

  public static submitAnswer(
    playerId: string,
    rawAnswer: string
  ): { isCorrect: boolean; points: number; timeMs: number } {
    const player = this.game.players.get(playerId);
    if (!player) throw new Error('Player not found');

    if (this.game.state !== 'QUESTION') {
      throw new Error('Submissions are not currently active');
    }

    const currentQ = QUESTIONS[this.game.questionIndex];
    if (!currentQ) throw new Error('No active question');

    let questionSubs = this.game.submissions.get(currentQ.id);
    if (!questionSubs) {
      questionSubs = new Map();
      this.game.submissions.set(currentQ.id, questionSubs);
    }

    if (questionSubs.has(playerId)) {
      throw new Error('You have already submitted an answer for this question');
    }

    const now = Date.now();
    const timeMs = Math.max(100, now - this.game.questionStartTime);
    const timeLimitMs = currentQ.timeLimitSeconds * 1000;

    // Check correctness
    let isCorrect = false;
    const cleanInput = rawAnswer.trim();

    if (currentQ.type === 'mcq') {
      isCorrect = cleanInput.toUpperCase() === currentQ.correctAnswer.toUpperCase();
    } else {
      // output prediction: case-insensitive & whitespace trimmed
      isCorrect = cleanInput.toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    }

    let points = 0;
    if (isCorrect) {
      // Fastest finger speed bonus: faster answers get up to 100 bonus points!
      const remainingMs = Math.max(0, timeLimitMs - timeMs);
      const speedRatio = Math.max(0, Math.min(1, remainingMs / timeLimitMs));
      const speedBonus = Math.round(speedRatio * 100);
      points = 100 + speedBonus; // e.g. 100 base + up to 100 speed = up to 200 pts

      player.score += points;
      player.correctCount++;
      player.totalTimeMs += timeMs;
    }

    player.lastAnswer = {
      answer: cleanInput,
      isCorrect,
      points,
      timeMs,
    };

    questionSubs.set(playerId, {
      playerId,
      questionId: currentQ.id,
      answer: cleanInput,
      isCorrect,
      points,
      timeMs,
    });

    this.recomputeRanks();
    this.notify();
    return { isCorrect, points, timeMs };
  }

  public static revealAnswer() {
    this.game.state = 'REVEAL';
    this.notify();
  }

  public static showLeaderboard() {
    this.game.state = 'LEADERBOARD';
    this.notify();
  }

  public static nextQuestion() {
    const nextIdx = this.game.questionIndex + 1;
    if (nextIdx < QUESTIONS.length) {
      this.startQuestion(nextIdx);
    } else {
      this.game.state = 'FINISHED';
      this.notify();
    }
  }

  public static resetGame() {
    this.game.state = 'LOBBY';
    this.game.questionIndex = 0;
    this.game.questionStartTime = 0;
    this.game.submissions.clear();
    this.game.players.clear();
    this.recomputeRanks();
    this.persist();
    this.notify();
  }

  public static seedMockPlayers(count = 25) {
    const names = [
      'Aarav Sharma', 'Aditi Verma', 'Akash Patel', 'Ananya Gupta', 'Aryan Singh',
      'Bhavya Reddy', 'Chetan Nair', 'Devansh Joshi', 'Diya Malhotra', 'Eshan Kumar',
      'Farhan Ali', 'Gauri Deshmukh', 'Harsh Mehta', 'Ishaan Rao', 'Jhanvi Bhat',
      'Kabir Sen', 'Kavya Pillai', 'Lakshya Jain', 'Meera Iyer', 'Nakul Kapoor',
      'Nisha Saxena', 'Omkar Kulkarni', 'Pranav Mishra', 'Pooja Bhatt', 'Raghav Das'
    ];

    for (let i = 0; i < Math.min(count, names.length); i++) {
      const roll = `BCA-2024-${String(i + 1).padStart(3, '0')}`;
      this.join(names[i], roll);
    }
    this.notify();
  }

  public static getSnapshot(playerId?: string) {
    const currentQ = QUESTIONS[this.game.questionIndex];
    const questionSubs = currentQ ? this.game.submissions.get(currentQ.id) : undefined;
    const submittedCount = questionSubs ? questionSubs.size : 0;

    const isRevealed = this.game.state === 'REVEAL' || this.game.state === 'LEADERBOARD' || this.game.state === 'FINISHED';

    // Sanitize question for student / projector
    let sanitizedQ = undefined;
    if (currentQ) {
      sanitizedQ = {
        id: currentQ.id,
        type: currentQ.type,
        title: currentQ.title,
        description: currentQ.description,
        code: currentQ.code,
        options: currentQ.options,
        timeLimitSeconds: currentQ.timeLimitSeconds,
        correctAnswer: isRevealed ? currentQ.correctAnswer : undefined,
        explanation: isRevealed ? currentQ.explanation : undefined,
      };
    }

    // Leaderboard sorted by rank (score DESC, correctCount DESC, totalTimeMs ASC)
    const leaderboard = Array.from(this.game.players.values())
      .sort((a, b) => a.rank - b.rank)
      .map((p) => ({
        id: p.id,
        name: p.name,
        rollNo: p.rollNo,
        score: p.score,
        rank: p.rank,
        correctCount: p.correctCount,
        totalTimeMs: p.totalTimeMs,
        lastPoints: p.lastAnswer?.points || 0,
        hasSubmittedCurrent: questionSubs ? questionSubs.has(p.id) : false,
      }));

    // Player personal context
    let playerInfo = undefined;
    if (playerId) {
      const p = this.game.players.get(playerId);
      if (p) {
        playerInfo = {
          id: p.id,
          name: p.name,
          rollNo: p.rollNo,
          score: p.score,
          rank: p.rank,
          correctCount: p.correctCount,
          hasSubmitted: questionSubs ? questionSubs.has(p.id) : false,
          lastAnswer: p.lastAnswer,
        };
      }
    }

    const elapsed = this.game.questionStartTime ? (Date.now() - this.game.questionStartTime) / 1000 : 0;
    const totalSec = currentQ ? currentQ.timeLimitSeconds : 20;
    const timeRemaining = Math.max(0, Math.ceil(totalSec - elapsed));

    return {
      state: this.game.state,
      questionIndex: this.game.questionIndex,
      totalQuestions: QUESTIONS.length,
      currentQuestion: sanitizedQ,
      questionStartTime: this.game.questionStartTime,
      timeRemaining,
      totalPlayers: this.game.players.size,
      submittedCount,
      leaderboard,
      playerInfo,
    };
  }

  private static recomputeRanks() {
    const sorted = Array.from(this.game.players.values()).sort((a, b) => {
      // 1. Most points wins!
      if (b.score !== a.score) return b.score - a.score;
      // 2. Most correct answers
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      // 3. Lower cumulative response time (faster finger)
      if (a.totalTimeMs !== b.totalTimeMs) return a.totalTimeMs - b.totalTimeMs;
      return a.joinedAt - b.joinedAt;
    });

    sorted.forEach((p, idx) => {
      p.rank = idx + 1;
    });
  }
}
