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
  questions: Question[];
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
      questions: [...QUESTIONS],
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
          if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            globalThis.__fff_game.questions = parsed.questions;
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
            questions: this.game.questions,
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
    return this.game.questions;
  }

  public static addQuestion(q: Omit<Question, 'id'> & { id?: number }): Question {
    const nextId =
      this.game.questions.length > 0 ? Math.max(...this.game.questions.map((item) => item.id)) + 1 : 1;
    const newQuestion: Question = { ...q, id: q.id || nextId };
    this.game.questions.push(newQuestion);
    this.persist();
    this.notify();
    return newQuestion;
  }

  public static updateQuestion(id: number, updated: Partial<Question>): Question | null {
    const idx = this.game.questions.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    this.game.questions[idx] = { ...this.game.questions[idx], ...updated, id };
    this.persist();
    this.notify();
    return this.game.questions[idx];
  }

  public static deleteQuestion(id: number): boolean {
    const idx = this.game.questions.findIndex((q) => q.id === id);
    if (idx === -1) return false;
    this.game.questions.splice(idx, 1);
    if (this.game.questionIndex >= this.game.questions.length) {
      this.game.questionIndex = Math.max(0, this.game.questions.length - 1);
    }
    this.persist();
    this.notify();
    return true;
  }

  public static resetQuestions(): Question[] {
    this.game.questions = [...QUESTIONS];
    this.persist();
    this.notify();
    return this.game.questions;
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
    if (index >= 0 && index < this.game.questions.length) {
      this.game.questionIndex = index;
      this.game.state = 'QUESTION';
      this.game.questionStartTime = Date.now();
      const currentQ = this.game.questions[index];
      if (currentQ && !this.game.submissions.has(currentQ.id)) {
        this.game.submissions.set(currentQ.id, new Map());
      }
      this.notify();
    }
  }

  public static submitAnswer(
    playerId: string,
    rawAnswer: string,
    fallbackInfo?: { name?: string; rollNo?: string }
  ): { isCorrect: boolean; points: number; timeMs: number } {
    let player = this.game.players.get(playerId);

    // Fallback 1: Lookup by PRN / Roll Number
    if (!player && fallbackInfo?.rollNo) {
      const cleanRoll = fallbackInfo.rollNo.trim().toUpperCase();
      for (const p of this.game.players.values()) {
        if (p.rollNo.toUpperCase() === cleanRoll) {
          player = p;
          break;
        }
      }
    }

    // Fallback 2: Auto-register seamlessly if student info provided
    if (!player && fallbackInfo?.name && fallbackInfo?.rollNo) {
      player = this.join(fallbackInfo.name, fallbackInfo.rollNo);
    }

    // Fallback 3: Create guest student record so player is NEVER missing
    if (!player) {
      const guestRoll = fallbackInfo?.rollNo || `PRN-${Math.floor(1000 + Math.random() * 9000)}`;
      const guestName = fallbackInfo?.name || 'Student';
      player = {
        id: playerId,
        name: guestName,
        rollNo: guestRoll,
        score: 0,
        rank: this.game.players.size + 1,
        correctCount: 0,
        totalTimeMs: 0,
        joinedAt: Date.now(),
      };
      this.game.players.set(playerId, player);
    }

    if (this.game.state !== 'QUESTION') {
      throw new Error('Submissions are not currently active');
    }

    const currentQ = this.game.questions[this.game.questionIndex];
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

    // Check correctness
    let isCorrect = false;
    const cleanInput = rawAnswer.trim();

    if (currentQ.type === 'mcq') {
      isCorrect = cleanInput.toUpperCase() === currentQ.correctAnswer.toUpperCase();
    } else if (currentQ.type === 'code_fix') {
      // Code fix evaluation: smart syntax and whitespace normalization
      const normalize = (str: string) =>
        str
          .replace(/\/\/.*$/gm, '') // strip single line comments
          .replace(/\/\*[\s\S]*?\*\//g, '') // strip multi-line comments
          .replace(/\s+/g, ' ') // collapse whitespace
          .replace(/\s*([;{}()=+\-*/<>!&|,])\s*/g, '$1') // normalize around operators/punctuations
          .trim()
          .toLowerCase();

      const normUser = normalize(cleanInput);
      const acceptedOptions = currentQ.correctAnswer.split('||').map((opt) => normalize(opt));

      isCorrect = Boolean(
        acceptedOptions.some(
          (opt) => opt === normUser || (opt.length >= 4 && normUser.includes(opt))
        ) ||
        cleanInput.toLowerCase() === currentQ.correctAnswer.trim().toLowerCase()
      );
    } else {
      // output prediction: case-insensitive & whitespace trimmed
      isCorrect = cleanInput.toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    }

    let points = 0;
    if (isCorrect) {
      const timeSec = timeMs / 1000;
      let speedBonus = 5;

      // Second-by-second Speed Bonus Economy (Up to +50 bonus points):
      if (timeSec <= 1.5) {
        speedBonus = 50; // Lightning fast (<= 1.5s)
      } else if (timeSec <= 2.5) {
        speedBonus = 45; // <= 2.5s
      } else if (timeSec <= 4.0) {
        speedBonus = 40; // <= 4.0s
      } else if (timeSec <= 6.0) {
        speedBonus = 35; // <= 6.0s
      } else if (timeSec <= 8.0) {
        speedBonus = 30; // <= 8.0s
      } else if (timeSec <= 10.0) {
        speedBonus = 25; // <= 10.0s
      } else if (timeSec <= 12.0) {
        speedBonus = 20; // <= 12.0s
      } else if (timeSec <= 15.0) {
        speedBonus = 15; // <= 15.0s
      } else if (timeSec <= 18.0) {
        speedBonus = 10; // <= 18.0s
      } else {
        speedBonus = 5;  // Clutch finish before timer expiry
      }

      points = 100 + speedBonus; // 100 Base + up to 50 Speed Bonus = up to 150 pts
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
    if (nextIdx < this.game.questions.length) {
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
    const currentQ = this.game.questions[this.game.questionIndex];
    const questionSubs = currentQ ? this.game.submissions.get(currentQ.id) : undefined;
    const submittedCount = questionSubs ? questionSubs.size : 0;

    const isRevealed =
      this.game.state === 'REVEAL' || this.game.state === 'LEADERBOARD' || this.game.state === 'FINISHED';

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
      totalQuestions: this.game.questions.length,
      currentQuestion: sanitizedQ,
      questions: this.game.questions,
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
