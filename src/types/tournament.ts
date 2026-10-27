export type EventState = 
  | 'DRAFT'
  | 'LOBBY_OPEN'
  | 'LOBBY_LOCKED'
  | 'RUNNING'
  | 'PAUSED'
  | 'FINISHED'
  | 'ARCHIVED';

export type QuestionState = 
  | 'PREVIEW'
  | 'READY'
  | 'ACTIVE'
  | 'LOCKED'
  | 'REVEALED'
  | 'SCORED';

export type QuestionType = 
  | 'SINGLE_CHOICE'
  | 'BUG_IDENTIFY'
  | 'CODE_LINE'
  | 'NUMERIC'
  | 'TEXT_EXACT'
  | 'ARRAY_COORD'
  | 'CALL_STACK'
  | 'FINAL_WAGER';

export type RoundNumber = 1 | 2 | 3 | 4 | 5;

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
  isCorrect?: boolean; // Stripped before sending to players/projector in active state
}

export interface CallStackFrame {
  call: string;
  returns: string;
  depth: number;
}

export interface Question {
  id: string;
  round: RoundNumber;
  type: QuestionType;
  title: string;
  description: string;
  codeSnippet: string;
  options: QuestionOption[];
  correctAnswer: string; // Answer option id, line number, coordinate, or text
  bugLineNumber?: number; // For Round 2 line selection
  fixBonusOptionId?: string; // For Round 2 secondary fix
  explanation: string;
  callStackFrames?: CallStackFrame[]; // For Round 4 Recursion stack animation
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimitSeconds: number;
  basePoints: number;
  speedBonusMax: number;
  tags: string[];
  orderIndex: number;
}

export interface EventSettings {
  maxTeams: number;
  teamCapacity: number;
  allowSelfRegistration: boolean;
  enableSpeedBonus: boolean;
  hideStandingsRound4: boolean;
  wagerMinPoints: number;
  wagerMaxPercent: number; // e.g. 50% of available score
  allowNegativeFinalScore: boolean;
  soundEffects: boolean;
}

export interface Player {
  id: string;
  eventId: string;
  teamId: string;
  name: string;
  rollNumber: string; // BCA roll number, e.g. "BCA-2024-042"
  isCaptain: boolean;
  joinedAt: string;
  lastActiveAt: string;
}

export interface PlayerSession {
  token: string;
  playerId: string;
  eventId: string;
  teamId: string;
  isCaptain: boolean;
  createdAt: string;
  revoked: boolean;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  color: string;
  icon?: string;
  captainId?: string;
  captainName?: string;
  members: Player[];
  score: number;
  rank: number;
  prevRank?: number;
  correctCount: number;
  totalResponseTimeMs: number;
  isLocked: boolean;
}

export interface Submission {
  id: string;
  eventId: string;
  questionId: string;
  teamId: string;
  captainId: string;
  submittedAnswer: string;
  secondaryAnswer?: string; // fix bonus or secondary choice
  submittedAt: string;
  serverReceivedAt: string;
  isCorrect: boolean;
  basePointsAwarded: number;
  speedBonusAwarded: number;
  secondaryPointsAwarded: number;
  totalPointsAwarded: number;
  timeTakenMs: number;
}

export interface BattleshipCell {
  row: number; // 0 to 3
  col: number; // 0 to 3
  type: 'SHIP' | 'BONUS' | 'EMPTY';
  isHit: boolean;
  hitByTeamId?: string;
  hitAt?: string;
}

export interface BattleshipBoard {
  teamId: string;
  grid: BattleshipCell[][]; // 4x4
  totalShips: number;
  sunkenShips: number;
  bonusCollected: number;
}

export interface BattleshipAttack {
  id: string;
  eventId: string;
  teamId: string;
  row: number;
  col: number;
  cellType: 'SHIP' | 'BONUS' | 'EMPTY';
  pointsAwarded: number;
  attackedAt: string;
}

export interface FinalWager {
  id: string;
  eventId: string;
  teamId: string;
  wagerAmount: number;
  submittedAt: string;
  isLocked: boolean;
  isRevealed: boolean;
  result?: 'CORRECT' | 'WRONG' | 'NO_SUBMISSION';
  pointsEffect?: number;
}

export interface ScoreLedgerEntry {
  id: string;
  eventId: string;
  teamId: string;
  teamName: string;
  round: RoundNumber;
  questionId?: string;
  pointsDelta: number;
  previousScore: number;
  newScore: number;
  reason: string;
  performedBy: string; // 'SYSTEM_SCORING' | 'ADMIN_<ID>'
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  eventId: string;
  adminId: string;
  action: string;
  previousState?: string;
  newState?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface TournamentEvent {
  id: string;
  title: string;
  code: string; // 6-character code (e.g. "CArena" or "C9X2PQ")
  state: EventState;
  currentRound: RoundNumber;
  currentQuestionId?: string;
  questionState: QuestionState;
  questionStartedAt?: string; // Server ISO timestamp
  questionDeadline?: string; // Server ISO timestamp
  timerPausedRemainingSeconds?: number;
  revision: number; // Incremented on every authoritative change for client sync
  settings: EventSettings;
  teams: Team[];
  createdAt: string;
  updatedAt: string;
}

// Client snapshot sent to players / projector
export interface AuthoritativeSnapshot {
  event: {
    id: string;
    title: string;
    code: string;
    state: EventState;
    currentRound: RoundNumber;
    questionState: QuestionState;
    questionStartedAt?: string;
    questionDeadline?: string;
    timerPausedRemainingSeconds?: number;
    revision: number;
    serverTime: string;
  };
  currentQuestion?: {
    id: string;
    round: RoundNumber;
    type: QuestionType;
    title: string;
    description: string;
    codeSnippet: string;
    options: QuestionOption[];
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    timeLimitSeconds: number;
    basePoints: number;
    speedBonusMax: number;
    correctAnswer?: string; // ONLY included if questionState === 'REVEALED' or 'SCORED'
    explanation?: string; // ONLY included if questionState === 'REVEALED' or 'SCORED'
    callStackFrames?: CallStackFrame[]; // ONLY included if revealed
    bugLineNumber?: number; // ONLY included if revealed
    fixBonusOptionId?: string;
  };
  leaderboard: {
    id: string;
    name: string;
    color: string;
    score: number;
    rank: number;
    prevRank?: number;
    correctCount: number;
    memberCount: number;
    hasSubmittedCurrent?: boolean;
    lastDelta?: number;
  }[];
  totalParticipants: number;
  totalTeams: number;
  // Specific to current player context (if player token provided)
  playerContext?: {
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
    teamColor: string;
    isCaptain: boolean;
    teamScore: number;
    teamRank: number;
    hasSubmitted: boolean;
    mySubmission?: {
      submittedAnswer: string;
      submittedAt: string;
      isCorrect?: boolean;
      pointsAwarded?: number;
    };
    attackTokensAvailable?: number;
    teamBoard?: {
      revealedCells: { row: number; col: number; type: 'SHIP' | 'BONUS' | 'EMPTY' }[];
    };
    finalWager?: {
      amount: number;
      isLocked: boolean;
    };
  };
}
