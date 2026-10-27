import {
  TournamentEvent,
  EventState,
  QuestionState,
  Question,
  Team,
  Player,
  PlayerSession,
  Submission,
  BattleshipBoard,
  BattleshipCell,
  BattleshipAttack,
  FinalWager,
  ScoreLedgerEntry,
  AdminAuditLog,
  AuthoritativeSnapshot,
} from '@/types/tournament';
import { SEED_QUESTIONS } from '@/data/seed-questions';
import { calculateSubmissionScore, calculateBattleshipPoints, calculateWagerResult, computeRanks } from '@/lib/scoring';
import { validateEventTransition, validateQuestionTransition } from '@/lib/state-machine';

// In-memory persistent singleton structure for server environment
interface InMemoryDB {
  events: Map<string, TournamentEvent>;
  questions: Map<string, Question[]>; // eventId -> questions
  players: Map<string, Player>; // playerId -> Player
  sessions: Map<string, PlayerSession>; // token -> PlayerSession
  submissions: Map<string, Submission[]>; // eventId -> submissions
  battleshipBoards: Map<string, Map<string, BattleshipBoard>>; // eventId -> (teamId -> board)
  battleshipAttacks: Map<string, BattleshipAttack[]>; // eventId -> attacks
  attackTokens: Map<string, Map<string, number>>; // eventId -> (teamId -> token balance)
  finalWagers: Map<string, Map<string, FinalWager>>; // eventId -> (teamId -> wager)
  ledger: Map<string, ScoreLedgerEntry[]>; // eventId -> entries
  auditLogs: Map<string, AdminAuditLog[]>; // eventId -> logs
}

// Global declaration to survive Next.js Turbopack fast reloads
declare global {
  // eslint-disable-next-line no-var
  var __c_arena_db: InMemoryDB | undefined;
}

function getDB(): InMemoryDB {
  if (!globalThis.__c_arena_db) {
    globalThis.__c_arena_db = {
      events: new Map(),
      questions: new Map(),
      players: new Map(),
      sessions: new Map(),
      submissions: new Map(),
      battleshipBoards: new Map(),
      battleshipAttacks: new Map(),
      attackTokens: new Map(),
      finalWagers: new Map(),
      ledger: new Map(),
      auditLogs: new Map(),
    };
  }
  return globalThis.__c_arena_db;
}

export const TEAM_COLORS = [
  '#00F5A0', // Electric Mint
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F43F5E', // Rose
  '#6366F1', // Indigo
  '#EAB308', // Gold
];

export const TEAM_NAMES = [
  'Byte Brawlers',
  'Pointer Pistols',
  'Stack Overflows',
  'Null Pointers',
  'Bit Shifters',
  'Kernel Panic',
  'Memory Leaks',
  'Segfault Slayers',
  'Binary Beasts',
  'Cyber C-Coders',
];

/**
 * Generate a randomized 4x4 battleship board for a team.
 */
function createBattleshipBoard(teamId: string): BattleshipBoard {
  const grid: BattleshipCell[][] = [];
  for (let r = 0; r < 4; r++) {
    const row: BattleshipCell[] = [];
    for (let c = 0; c < 4; c++) {
      row.push({
        row: r,
        col: c,
        type: 'EMPTY',
        isHit: false,
      });
    }
    grid.push(row);
  }

  // Place 4 ships randomly
  let shipsPlaced = 0;
  while (shipsPlaced < 4) {
    const r = Math.floor(Math.random() * 4);
    const c = Math.floor(Math.random() * 4);
    if (grid[r][c].type === 'EMPTY') {
      grid[r][c].type = 'SHIP';
      shipsPlaced++;
    }
  }

  // Place 2 bonus cells
  let bonusPlaced = 0;
  while (bonusPlaced < 2) {
    const r = Math.floor(Math.random() * 4);
    const c = Math.floor(Math.random() * 4);
    if (grid[r][c].type === 'EMPTY') {
      grid[r][c].type = 'BONUS';
      bonusPlaced++;
    }
  }

  return {
    teamId,
    grid,
    totalShips: 4,
    sunkenShips: 0,
    bonusCollected: 0,
  };
}

export class TournamentStore {
  private static db = getDB();

  /**
   * Initialize a default demo tournament event if none exists.
   */
  public static ensureDemoEvent(): TournamentEvent {
    const defaultCode = 'CARENA';
    const existing = this.getEventByCode(defaultCode);
    if (existing) return existing;

    const eventId = 'c-arena-univ-2024';
    const now = new Date().toISOString();

    const teams: Team[] = TEAM_NAMES.map((name, idx) => ({
      id: `team-${idx + 1}`,
      eventId,
      name,
      color: TEAM_COLORS[idx % TEAM_COLORS.length],
      members: [],
      score: 0,
      rank: idx + 1,
      correctCount: 0,
      totalResponseTimeMs: 0,
      isLocked: false,
    }));

    const event: TournamentEvent = {
      id: eventId,
      title: 'BCA 1st Year C Programming Championship',
      code: defaultCode,
      state: 'LOBBY_OPEN',
      currentRound: 1,
      currentQuestionId: SEED_QUESTIONS[0].id,
      questionState: 'PREVIEW',
      revision: 1,
      settings: {
        maxTeams: 10,
        teamCapacity: 6,
        allowSelfRegistration: true,
        enableSpeedBonus: true,
        hideStandingsRound4: false,
        wagerMinPoints: 50,
        wagerMaxPercent: 50,
        allowNegativeFinalScore: false,
        soundEffects: true,
      },
      teams,
      createdAt: now,
      updatedAt: now,
    };

    this.db.events.set(eventId, event);
    this.db.questions.set(eventId, JSON.parse(JSON.stringify(SEED_QUESTIONS)));
    this.db.submissions.set(eventId, []);
    this.db.battleshipAttacks.set(eventId, []);
    this.db.ledger.set(eventId, []);
    this.db.auditLogs.set(eventId, []);

    // Initialize battleship boards
    const boardsMap = new Map<string, BattleshipBoard>();
    const tokensMap = new Map<string, number>();
    for (const t of teams) {
      boardsMap.set(t.id, createBattleshipBoard(t.id));
      tokensMap.set(t.id, 1); // 1 starter token
    }
    this.db.battleshipBoards.set(eventId, boardsMap);
    this.db.attackTokens.set(eventId, tokensMap);
    this.db.finalWagers.set(eventId, new Map());

    return event;
  }

  public static getEventById(id: string): TournamentEvent | undefined {
    return this.db.events.get(id);
  }

  public static getEventByCode(code: string): TournamentEvent | undefined {
    const cleanCode = code.trim().toUpperCase();
    for (const ev of this.db.events.values()) {
      if (ev.code.toUpperCase() === cleanCode) {
        return ev;
      }
    }
    return undefined;
  }

  public static listEvents(): TournamentEvent[] {
    this.ensureDemoEvent();
    return Array.from(this.db.events.values());
  }

  public static createEvent(title: string, customCode?: string): TournamentEvent {
    const id = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const code = (customCode || Math.random().toString(36).substring(2, 8)).toUpperCase();
    const now = new Date().toISOString();

    const teams: Team[] = TEAM_NAMES.slice(0, 8).map((name, idx) => ({
      id: `team-${id}-${idx + 1}`,
      eventId: id,
      name,
      color: TEAM_COLORS[idx % TEAM_COLORS.length],
      members: [],
      score: 0,
      rank: idx + 1,
      correctCount: 0,
      totalResponseTimeMs: 0,
      isLocked: false,
    }));

    const event: TournamentEvent = {
      id,
      title,
      code,
      state: 'DRAFT',
      currentRound: 1,
      currentQuestionId: SEED_QUESTIONS[0].id,
      questionState: 'PREVIEW',
      revision: 1,
      settings: {
        maxTeams: 8,
        teamCapacity: 6,
        allowSelfRegistration: true,
        enableSpeedBonus: true,
        hideStandingsRound4: false,
        wagerMinPoints: 50,
        wagerMaxPercent: 50,
        allowNegativeFinalScore: false,
        soundEffects: true,
      },
      teams,
      createdAt: now,
      updatedAt: now,
    };

    this.db.events.set(id, event);
    this.db.questions.set(id, JSON.parse(JSON.stringify(SEED_QUESTIONS)));
    this.db.submissions.set(id, []);
    this.db.battleshipAttacks.set(id, []);
    this.db.ledger.set(id, []);
    this.db.auditLogs.set(id, []);

    const boardsMap = new Map<string, BattleshipBoard>();
    const tokensMap = new Map<string, number>();
    for (const t of teams) {
      boardsMap.set(t.id, createBattleshipBoard(t.id));
      tokensMap.set(t.id, 1);
    }
    this.db.battleshipBoards.set(id, boardsMap);
    this.db.attackTokens.set(id, tokensMap);
    this.db.finalWagers.set(id, new Map());

    return event;
  }

  public static duplicateEvent(sourceEventId: string): TournamentEvent {
    const source = this.getEventById(sourceEventId);
    if (!source) throw new Error('Source event not found');

    const newEvent = this.createEvent(`${source.title} (Copy)`);
    newEvent.settings = { ...source.settings };
    const srcQuestions = this.db.questions.get(sourceEventId) || SEED_QUESTIONS;
    this.db.questions.set(newEvent.id, JSON.parse(JSON.stringify(srcQuestions)));
    return newEvent;
  }

  public static updateEventState(eventId: string, targetState: EventState, adminId = 'ADMIN'): TournamentEvent {
    const event = this.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    validateEventTransition(event.state, targetState);
    const prevState = event.state;
    event.state = targetState;
    event.revision++;
    event.updatedAt = new Date().toISOString();

    this.recordAuditLog(eventId, adminId, 'CHANGE_EVENT_STATE', prevState, targetState);
    return event;
  }

  /**
   * Atomic student joining with duplicate roll number prevention and slot locking.
   */
  public static joinEvent(
    code: string,
    playerName: string,
    rollNumber: string,
    teamId: string
  ): { player: Player; session: PlayerSession; team: Team } {
    const event = this.getEventByCode(code);
    if (!event) throw new Error('Tournament event not found for code: ' + code);

    if (event.state !== 'LOBBY_OPEN' && event.state !== 'RUNNING') {
      throw new Error(`Registration is not currently open (Event is ${event.state})`);
    }

    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanName = playerName.trim();

    // Reconnection check: if roll number already joined this event, recover session!
    for (const team of event.teams) {
      const existingPlayer = team.members.find(
        (m) => m.rollNumber.toUpperCase() === cleanRoll
      );
      if (existingPlayer) {
        // Reuse session or issue fresh one
        const token = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        const session: PlayerSession = {
          token,
          playerId: existingPlayer.id,
          eventId: event.id,
          teamId: team.id,
          isCaptain: existingPlayer.isCaptain,
          createdAt: new Date().toISOString(),
          revoked: false,
        };
        this.db.sessions.set(token, session);
        return { player: existingPlayer, session, team };
      }
    }

    // New student registration
    const targetTeam = event.teams.find((t) => t.id === teamId);
    if (!targetTeam) throw new Error('Selected team does not exist');

    if (targetTeam.isLocked) {
      throw new Error('This team is locked by the tournament administrator');
    }

    if (targetTeam.members.length >= event.settings.teamCapacity) {
      throw new Error(`Team ${targetTeam.name} is full (Capacity: ${event.settings.teamCapacity})`);
    }

    const playerId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const isFirstMember = targetTeam.members.length === 0;

    const newPlayer: Player = {
      id: playerId,
      eventId: event.id,
      teamId: targetTeam.id,
      name: cleanName,
      rollNumber: cleanRoll,
      isCaptain: isFirstMember,
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    targetTeam.members.push(newPlayer);
    if (isFirstMember) {
      targetTeam.captainId = newPlayer.id;
      targetTeam.captainName = newPlayer.name;
    }

    this.db.players.set(playerId, newPlayer);

    const token = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const session: PlayerSession = {
      token,
      playerId,
      eventId: event.id,
      teamId: targetTeam.id,
      isCaptain: newPlayer.isCaptain,
      createdAt: new Date().toISOString(),
      revoked: false,
    };
    this.db.sessions.set(token, session);

    event.revision++;
    event.updatedAt = new Date().toISOString();

    return { player: newPlayer, session, team: targetTeam };
  }

  public static getSession(token: string): PlayerSession | undefined {
    const sess = this.db.sessions.get(token);
    if (!sess || sess.revoked) return undefined;
    return sess;
  }

  public static revokeSession(token: string): void {
    const sess = this.db.sessions.get(token);
    if (sess) {
      sess.revoked = true;
    }
  }

  public static updateTeamCaptain(eventId: string, teamId: string, newCaptainId: string): Team {
    const event = this.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    const team = event.teams.find((t) => t.id === teamId);
    if (!team) throw new Error('Team not found');

    const member = team.members.find((m) => m.id === newCaptainId);
    if (!member) throw new Error('Player is not a member of this team');

    // Revoke previous captain status
    team.members.forEach((m) => {
      m.isCaptain = m.id === newCaptainId;
    });
    team.captainId = newCaptainId;
    team.captainName = member.name;

    // Update active sessions
    for (const sess of this.db.sessions.values()) {
      if (sess.eventId === eventId && sess.teamId === teamId) {
        sess.isCaptain = sess.playerId === newCaptainId;
      }
    }

    event.revision++;
    return team;
  }

  public static getQuestions(eventId: string): Question[] {
    let q = this.db.questions.get(eventId);
    if (!q) {
      q = JSON.parse(JSON.stringify(SEED_QUESTIONS)) as Question[];
      this.db.questions.set(eventId, q);
    }
    return q;
  }

  public static getCurrentQuestion(eventId: string): Question | undefined {
    const event = this.getEventById(eventId);
    if (!event || !event.currentQuestionId) return undefined;
    const questions = this.getQuestions(eventId);
    return questions.find((q) => q.id === event.currentQuestionId);
  }

  /**
   * Question live control transitions
   */
  public static setQuestionState(
    eventId: string,
    targetState: QuestionState,
    adminId = 'ADMIN'
  ): TournamentEvent {
    const event = this.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    validateQuestionTransition(event.questionState, targetState);
    const prev = event.questionState;
    event.questionState = targetState;

    const currentQ = this.getCurrentQuestion(eventId);
    const now = new Date();

    if (targetState === 'ACTIVE') {
      event.questionStartedAt = now.toISOString();
      if (currentQ) {
        event.questionDeadline = new Date(now.getTime() + currentQ.timeLimitSeconds * 1000).toISOString();
      }
      event.timerPausedRemainingSeconds = undefined;
    } else if (targetState === 'LOCKED') {
      event.timerPausedRemainingSeconds = 0;
    }

    event.revision++;
    event.updatedAt = now.toISOString();

    this.recordAuditLog(eventId, adminId, 'CHANGE_QUESTION_STATE', prev, targetState);
    return event;
  }

  public static pauseTimer(eventId: string): TournamentEvent {
    const event = this.getEventById(eventId);
    if (!event) throw new Error('Event not found');
    if (event.questionState !== 'ACTIVE' || !event.questionDeadline) return event;

    const remainingMs = Math.max(0, new Date(event.questionDeadline).getTime() - Date.now());
    event.timerPausedRemainingSeconds = Math.ceil(remainingMs / 1000);
    event.revision++;
    return event;
  }

  public static resumeTimer(eventId: string): TournamentEvent {
    const event = this.getEventById(eventId);
    if (!event) throw new Error('Event not found');
    if (event.questionState !== 'ACTIVE' || event.timerPausedRemainingSeconds === undefined) return event;

    const now = Date.now();
    event.questionDeadline = new Date(now + event.timerPausedRemainingSeconds * 1000).toISOString();
    event.timerPausedRemainingSeconds = undefined;
    event.revision++;
    return event;
  }

  public static advanceQuestion(eventId: string, targetQuestionId?: string): TournamentEvent {
    const event = this.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    const questions = this.getQuestions(eventId);
    let nextQ: Question | undefined;

    if (targetQuestionId) {
      nextQ = questions.find((q) => q.id === targetQuestionId);
    } else {
      const curIndex = questions.findIndex((q) => q.id === event.currentQuestionId);
      if (curIndex >= 0 && curIndex < questions.length - 1) {
        nextQ = questions[curIndex + 1];
      }
    }

    if (nextQ) {
      event.currentQuestionId = nextQ.id;
      event.currentRound = nextQ.round;
      event.questionState = 'PREVIEW';
      event.questionStartedAt = undefined;
      event.questionDeadline = undefined;
      event.timerPausedRemainingSeconds = undefined;
      event.revision++;
    }

    return event;
  }

  /**
   * Submit answer (Only team captain permitted)
   */
  public static submitAnswer(
    code: string,
    playerToken: string,
    submittedAnswer: string,
    secondaryAnswer?: string
  ): Submission {
    const event = this.getEventByCode(code);
    if (!event) throw new Error('Event not found');

    if (event.questionState !== 'ACTIVE') {
      throw new Error(`Submissions are not accepted (Question is ${event.questionState})`);
    }

    const session = this.getSession(playerToken);
    if (!session || session.eventId !== event.id) {
      throw new Error('Unauthorized or expired session');
    }

    if (!session.isCaptain) {
      throw new Error('Only the designated team captain can submit the official answer');
    }

    const currentQ = this.getCurrentQuestion(event.id);
    if (!currentQ) throw new Error('No active question found');

    // Server authoritative time validation
    const serverNow = new Date();
    if (event.questionDeadline && serverNow.getTime() > new Date(event.questionDeadline).getTime() + 1500) {
      throw new Error('Submission deadline has passed');
    }

    // Check idempotency / one final submission per team per question
    const eventSubmissions = this.db.submissions.get(event.id) || [];
    const alreadySubmitted = eventSubmissions.find(
      (s) => s.questionId === currentQ.id && s.teamId === session.teamId
    );
    if (alreadySubmitted) {
      throw new Error('Your team has already submitted an answer for this question');
    }

    const startTime = event.questionStartedAt ? new Date(event.questionStartedAt).getTime() : serverNow.getTime();
    const timeTakenMs = Math.max(0, serverNow.getTime() - startTime);

    const scoreResult = calculateSubmissionScore(
      currentQ,
      submittedAnswer,
      secondaryAnswer,
      timeTakenMs,
      currentQ.timeLimitSeconds,
      event.settings.enableSpeedBonus
    );

    const submission: Submission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventId: event.id,
      questionId: currentQ.id,
      teamId: session.teamId,
      captainId: session.playerId,
      submittedAnswer,
      secondaryAnswer,
      submittedAt: serverNow.toISOString(),
      serverReceivedAt: serverNow.toISOString(),
      isCorrect: scoreResult.isCorrect,
      basePointsAwarded: scoreResult.basePointsAwarded,
      speedBonusAwarded: scoreResult.speedBonusAwarded,
      secondaryPointsAwarded: scoreResult.secondaryPointsAwarded,
      totalPointsAwarded: scoreResult.totalPointsAwarded,
      timeTakenMs,
    };

    eventSubmissions.push(submission);
    this.db.submissions.set(event.id, eventSubmissions);

    // If Round 3 (Array coordinate questions), award attack token for correct answers!
    if (currentQ.round === 3 && scoreResult.isCorrect) {
      const tokensMap = this.db.attackTokens.get(event.id);
      if (tokensMap) {
        const curTokens = tokensMap.get(session.teamId) || 0;
        tokensMap.set(session.teamId, curTokens + 1);
      }
    }

    event.revision++;
    return submission;
  }

  /**
   * Authoritative scoring phase: apply question points to team totals & ledger
   */
  public static calculateQuestionScores(eventId: string): TournamentEvent {
    const event = this.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    const currentQ = this.getCurrentQuestion(eventId);
    if (!currentQ) throw new Error('No active question');

    const submissions = (this.db.submissions.get(eventId) || []).filter(
      (s) => s.questionId === currentQ.id
    );

    for (const team of event.teams) {
      const sub = submissions.find((s) => s.teamId === team.id);
      if (sub && sub.isCorrect) {
        const prevScore = team.score;
        team.score += sub.totalPointsAwarded;
        team.correctCount++;
        team.totalResponseTimeMs += sub.timeTakenMs;

        this.recordLedgerEntry(
          eventId,
          team.id,
          team.name,
          currentQ.round,
          currentQ.id,
          sub.totalPointsAwarded,
          prevScore,
          team.score,
          `Round ${currentQ.round} Question ${currentQ.title}: Base=${sub.basePointsAwarded}, Speed=${sub.speedBonusAwarded}`
        );
      }
    }

    // Recompute ranks with tie-breaking rules
    event.teams = computeRanks(event.teams);
    event.questionState = 'SCORED';
    event.revision++;
    return event;
  }

  /**
   * Battleship attack coordinate strike
   */
  public static attackBattleshipCell(
    code: string,
    playerToken: string,
    row: number,
    col: number
  ): { hitResult: 'SHIP' | 'BONUS' | 'EMPTY'; points: number; remainingTokens: number } {
    const event = this.getEventByCode(code);
    if (!event) throw new Error('Event not found');

    const session = this.getSession(playerToken);
    if (!session || session.eventId !== event.id) throw new Error('Unauthorized');
    if (!session.isCaptain) throw new Error('Only the team captain can execute attacks');

    if (row < 0 || row > 3 || col < 0 || col > 3) throw new Error('Coordinate out of bounds (0-3)');

    const tokensMap = this.db.attackTokens.get(event.id);
    const availableTokens = (tokensMap && tokensMap.get(session.teamId)) || 0;
    if (availableTokens <= 0) {
      throw new Error('No attack tokens available! Answer Round 3 questions correctly to earn radar strikes.');
    }

    const boardsMap = this.db.battleshipBoards.get(event.id);
    const board = boardsMap && boardsMap.get(session.teamId);
    if (!board) throw new Error('Board not found');

    const targetCell = board.grid[row][col];
    if (targetCell.isHit) {
      throw new Error('This coordinate has already been targeted');
    }

    targetCell.isHit = true;
    targetCell.hitByTeamId = session.teamId;
    targetCell.hitAt = new Date().toISOString();

    const points = calculateBattleshipPoints(targetCell.type);
    if (tokensMap) {
      tokensMap.set(session.teamId, availableTokens - 1);
    }

    if (targetCell.type === 'SHIP') board.sunkenShips++;
    if (targetCell.type === 'BONUS') board.bonusCollected++;

    // Apply points directly to team & ledger
    const team = event.teams.find((t) => t.id === session.teamId);
    if (team && points > 0) {
      const prevScore = team.score;
      team.score += points;
      this.recordLedgerEntry(
        event.id,
        team.id,
        team.name,
        3,
        undefined,
        points,
        prevScore,
        team.score,
        `Battleship Radar Strike [${row}, ${col}] - ${targetCell.type}`
      );
      event.teams = computeRanks(event.teams);
    }

    const attacks = this.db.battleshipAttacks.get(event.id) || [];
    attacks.push({
      id: `atk-${Date.now()}`,
      eventId: event.id,
      teamId: session.teamId,
      row,
      col,
      cellType: targetCell.type,
      pointsAwarded: points,
      attackedAt: new Date().toISOString(),
    });
    this.db.battleshipAttacks.set(event.id, attacks);

    event.revision++;
    return {
      hitResult: targetCell.type,
      points,
      remainingTokens: availableTokens - 1,
    };
  }

  /**
   * Submit Final Boss Wager
   */
  public static submitWager(
    code: string,
    playerToken: string,
    wagerAmount: number
  ): FinalWager {
    const event = this.getEventByCode(code);
    if (!event) throw new Error('Event not found');

    const session = this.getSession(playerToken);
    if (!session || session.eventId !== event.id) throw new Error('Unauthorized');
    if (!session.isCaptain) throw new Error('Only the captain can submit the team wager');

    const team = event.teams.find((t) => t.id === session.teamId);
    if (!team) throw new Error('Team not found');

    const maxAllowed = Math.max(
      event.settings.wagerMinPoints,
      Math.floor((team.score * event.settings.wagerMaxPercent) / 100)
    );

    if (wagerAmount < event.settings.wagerMinPoints || wagerAmount > maxAllowed) {
      throw new Error(`Wager must be between ${event.settings.wagerMinPoints} and ${maxAllowed} points`);
    }

    const wagers = this.db.finalWagers.get(event.id) || new Map();
    const wager: FinalWager = {
      id: `wager-${team.id}`,
      eventId: event.id,
      teamId: team.id,
      wagerAmount,
      submittedAt: new Date().toISOString(),
      isLocked: true,
      isRevealed: false,
    };

    wagers.set(team.id, wager);
    this.db.finalWagers.set(event.id, wagers);

    event.revision++;
    return wager;
  }

  /**
   * Final Boss Scoring
   */
  public static scoreFinalBoss(eventId: string): TournamentEvent {
    const event = this.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    const currentQ = this.getCurrentQuestion(eventId);
    if (!currentQ || currentQ.round !== 5) throw new Error('Not at Final Boss');

    const wagers = this.db.finalWagers.get(eventId) || new Map();
    const submissions = (this.db.submissions.get(eventId) || []).filter(
      (s) => s.questionId === currentQ.id
    );

    for (const team of event.teams) {
      const wager = wagers.get(team.id);
      if (!wager) continue;

      const sub = submissions.find((s) => s.teamId === team.id);
      const isCorrect = !!(sub && sub.isCorrect);

      const result = calculateWagerResult(
        team.score,
        wager,
        isCorrect,
        event.settings.allowNegativeFinalScore
      );

      const prevScore = team.score;
      team.score = result.newScore;
      wager.isRevealed = true;
      wager.result = isCorrect ? 'CORRECT' : 'WRONG';
      wager.pointsEffect = result.pointsDelta;

      this.recordLedgerEntry(
        eventId,
        team.id,
        team.name,
        5,
        currentQ.id,
        result.pointsDelta,
        prevScore,
        team.score,
        `Final Boss Wager (${isCorrect ? 'WON' : 'LOST'}): Wager was ${wager.wagerAmount}`
      );
    }

    event.teams = computeRanks(event.teams);
    event.questionState = 'SCORED';
    event.state = 'FINISHED';
    event.revision++;
    return event;
  }

  /**
   * Manual score adjustment with mandatory audit reason.
   */
  public static adjustTeamScore(
    eventId: string,
    teamId: string,
    pointsDelta: number,
    reason: string,
    adminId = 'ADMIN'
  ): TournamentEvent {
    const event = this.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    const team = event.teams.find((t) => t.id === teamId);
    if (!team) throw new Error('Team not found');

    const prevScore = team.score;
    team.score += pointsDelta;

    this.recordLedgerEntry(
      eventId,
      team.id,
      team.name,
      event.currentRound,
      undefined,
      pointsDelta,
      prevScore,
      team.score,
      `Manual Adjustment by ${adminId}: ${reason}`,
      adminId
    );

    event.teams = computeRanks(event.teams);
    event.revision++;
    return event;
  }

  /**
   * Create Authoritative Snapshot for clients.
   * Strips correct answers when question is in active/unrevealed state!
   */
  public static getAuthoritativeSnapshot(eventId: string, playerToken?: string): AuthoritativeSnapshot {
    const event = this.getEventById(eventId) || this.ensureDemoEvent();
    const currentQ = this.getCurrentQuestion(event.id);
    const submissions = this.db.submissions.get(event.id) || [];
    const tokensMap = this.db.attackTokens.get(event.id);
    const boardsMap = this.db.battleshipBoards.get(event.id);
    const wagersMap = this.db.finalWagers.get(event.id);

    const isRevealed = event.questionState === 'REVEALED' || event.questionState === 'SCORED';

    // Build sanitised question for display/players
    let sanitisedQ: AuthoritativeSnapshot['currentQuestion'];
    if (currentQ) {
      sanitisedQ = {
        id: currentQ.id,
        round: currentQ.round,
        type: currentQ.type,
        title: currentQ.title,
        description: currentQ.description,
        codeSnippet: currentQ.codeSnippet,
        options: currentQ.options.map((o) => ({
          id: o.id,
          label: o.label,
          text: o.text,
          isCorrect: isRevealed ? o.isCorrect : undefined,
        })),
        difficulty: currentQ.difficulty,
        timeLimitSeconds: currentQ.timeLimitSeconds,
        basePoints: currentQ.basePoints,
        speedBonusMax: currentQ.speedBonusMax,
        correctAnswer: isRevealed ? currentQ.correctAnswer : undefined,
        explanation: isRevealed ? currentQ.explanation : undefined,
        callStackFrames: isRevealed ? currentQ.callStackFrames : undefined,
        bugLineNumber: isRevealed ? currentQ.bugLineNumber : undefined,
        fixBonusOptionId: currentQ.fixBonusOptionId,
      };
    }

    // Leaderboard
    const leaderboard = event.teams.map((t) => {
      const hasSubmitted = currentQ
        ? submissions.some((s) => s.questionId === currentQ.id && s.teamId === t.id)
        : false;
      return {
        id: t.id,
        name: t.name,
        color: t.color,
        score: t.score,
        rank: t.rank,
        prevRank: t.prevRank,
        correctCount: t.correctCount,
        memberCount: t.members.length,
        hasSubmittedCurrent: hasSubmitted,
      };
    });

    // Total participants
    const totalParticipants = event.teams.reduce((acc, t) => acc + t.members.length, 0);

    // Player Context (if token provided)
    let playerContext: AuthoritativeSnapshot['playerContext'];
    if (playerToken) {
      const session = this.getSession(playerToken);
      if (session && session.eventId === event.id) {
        const team = event.teams.find((t) => t.id === session.teamId);
        const player = team?.members.find((m) => m.id === session.playerId);
        const mySub = currentQ
          ? submissions.find((s) => s.questionId === currentQ.id && s.teamId === session.teamId)
          : undefined;

        const board = boardsMap?.get(session.teamId);
        const revealedCells = board
          ? board.grid
              .flat()
              .filter((c) => c.isHit)
              .map((c) => ({ row: c.row, col: c.col, type: c.type }))
          : [];

        const wager = wagersMap?.get(session.teamId);

        if (team && player) {
          playerContext = {
            playerId: player.id,
            playerName: player.name,
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color,
            isCaptain: session.isCaptain,
            teamScore: team.score,
            teamRank: team.rank,
            hasSubmitted: !!mySub,
            mySubmission: mySub
              ? {
                  submittedAnswer: mySub.submittedAnswer,
                  submittedAt: mySub.submittedAt,
                  isCorrect: isRevealed ? mySub.isCorrect : undefined,
                  pointsAwarded: isRevealed ? mySub.totalPointsAwarded : undefined,
                }
              : undefined,
            attackTokensAvailable: tokensMap?.get(team.id) || 0,
            teamBoard: { revealedCells },
            finalWager: wager ? { amount: wager.wagerAmount, isLocked: wager.isLocked } : undefined,
          };
        }
      }
    }

    return {
      event: {
        id: event.id,
        title: event.title,
        code: event.code,
        state: event.state,
        currentRound: event.currentRound,
        questionState: event.questionState,
        questionStartedAt: event.questionStartedAt,
        questionDeadline: event.questionDeadline,
        timerPausedRemainingSeconds: event.timerPausedRemainingSeconds,
        revision: event.revision,
        serverTime: new Date().toISOString(),
      },
      currentQuestion: sanitisedQ,
      leaderboard,
      totalParticipants,
      totalTeams: event.teams.length,
      playerContext,
    };
  }

  public static getLedger(eventId: string): ScoreLedgerEntry[] {
    return this.db.ledger.get(eventId) || [];
  }

  public static getAuditLogs(eventId: string): AdminAuditLog[] {
    return this.db.auditLogs.get(eventId) || [];
  }

  private static recordLedgerEntry(
    eventId: string,
    teamId: string,
    teamName: string,
    round: number,
    questionId: string | undefined,
    pointsDelta: number,
    previousScore: number,
    newScore: number,
    reason: string,
    performedBy = 'SYSTEM_SCORING'
  ): void {
    const list = this.db.ledger.get(eventId) || [];
    list.push({
      id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      teamId,
      teamName,
      round: round as 1 | 2 | 3 | 4 | 5,
      questionId,
      pointsDelta,
      previousScore,
      newScore,
      reason,
      performedBy,
      createdAt: new Date().toISOString(),
    });
    this.db.ledger.set(eventId, list);
  }

  private static recordAuditLog(
    eventId: string,
    adminId: string,
    action: string,
    previousState?: string,
    newState?: string,
    details?: Record<string, unknown>
  ): void {
    const logs = this.db.auditLogs.get(eventId) || [];
    logs.unshift({
      id: `audit-${Date.now()}`,
      eventId,
      adminId,
      action,
      previousState,
      newState,
      details,
      timestamp: new Date().toISOString(),
    });
    this.db.auditLogs.set(eventId, logs);
  }

  /**
   * Seed Simulation: populates 10 teams and 50 realistic BCA students.
   */
  public static seedSimulatedClassroom(eventId: string): TournamentEvent {
    const event = this.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    const studentNames = [
      'Aarav Sharma', 'Aditi Verma', 'Akash Patel', 'Ananya Gupta', 'Aryan Singh',
      'Bhavya Reddy', 'Chetan Nair', 'Devansh Joshi', 'Diya Malhotra', 'Eshan Kumar',
      'Farhan Ali', 'Gauri Deshmukh', 'Harsh Mehta', 'Ishaan Rao', 'Jhanvi Bhat',
      'Kabir Sen', 'Kavya Pillai', 'Lakshya Jain', 'Meera Iyer', 'Nakul Kapoor',
      'Nisha Saxena', 'Omkar Kulkarni', 'Pranav Mishra', 'Pooja Bhatt', 'Raghav Das',
      'Rhea Choudhury', 'Rohan Sethi', 'Saanvi Nambiar', 'Samarth Bansal', 'Sanaya Gill',
      'Shlok Tiwari', 'Siya Agrawal', 'Tanmay Roy', 'Tara Sengupta', 'Utkarsh Pandey',
      'Vaishnavi Hegde', 'Varun Shukla', 'Vidhi Chopra', 'Vihaan Varma', 'Yash Mittal',
      'Zoya Siddiqui', 'Abhinav Tyagi', 'Alok Pandey', 'Amrita Nanda', 'Aniket Biswas',
      'Anushka Ghosh', 'Arjun Khurana', 'Deepak Chauhan', 'Dhruv Soni', 'Gautam Menon'
    ];

    let nameIdx = 0;
    for (const team of event.teams) {
      team.members = [];
      const memberCount = 5; // 5 students per team = 50 total
      for (let m = 0; m < memberCount; m++) {
        const studentName = studentNames[nameIdx % studentNames.length];
        const rollNumber = `BCA-2024-${String(nameIdx + 1).padStart(3, '0')}`;
        nameIdx++;

        const isCaptain = m === 0;
        const player: Player = {
          id: `sim-p-${nameIdx}`,
          eventId: event.id,
          teamId: team.id,
          name: studentName,
          rollNumber,
          isCaptain,
          joinedAt: new Date(Date.now() - (50 - nameIdx) * 1000).toISOString(),
          lastActiveAt: new Date().toISOString(),
        };

        team.members.push(player);
        this.db.players.set(player.id, player);

        if (isCaptain) {
          team.captainId = player.id;
          team.captainName = player.name;
        }

        // Create player session
        const token = `sim-token-${player.id}`;
        this.db.sessions.set(token, {
          token,
          playerId: player.id,
          eventId: event.id,
          teamId: team.id,
          isCaptain,
          createdAt: player.joinedAt,
          revoked: false,
        });
      }
    }

    event.revision++;
    return event;
  }
}
