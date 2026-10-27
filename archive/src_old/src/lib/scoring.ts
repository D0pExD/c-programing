import { Question, Team, Submission, FinalWager } from '@/types/tournament';

export interface ScoreCalculationResult {
  isCorrect: boolean;
  basePointsAwarded: number;
  speedBonusAwarded: number;
  secondaryPointsAwarded: number;
  totalPointsAwarded: number;
}

/**
 * Calculates authoritative points for an answer submission.
 */
export function calculateSubmissionScore(
  question: Question,
  submittedAnswer: string,
  secondaryAnswer: string | undefined,
  timeTakenMs: number,
  timeLimitSeconds: number,
  enableSpeedBonus: boolean
): ScoreCalculationResult {
  const isCorrect = String(submittedAnswer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();

  if (!isCorrect) {
    return {
      isCorrect: false,
      basePointsAwarded: 0,
      speedBonusAwarded: 0,
      secondaryPointsAwarded: 0,
      totalPointsAwarded: 0,
    };
  }

  // Base points according to round/question difficulty
  let basePoints = question.basePoints;
  if (question.round === 1) {
    basePoints = 100;
  } else if (question.round === 2) {
    basePoints = 150;
  } else if (question.round === 4) {
    if (question.difficulty === 'EASY') basePoints = 100;
    else if (question.difficulty === 'MEDIUM') basePoints = 150;
    else if (question.difficulty === 'HARD') basePoints = 200;
  }

  // Speed bonus
  let speedBonus = 0;
  if (enableSpeedBonus && question.speedBonusMax > 0 && timeLimitSeconds > 0) {
    const totalDurationMs = timeLimitSeconds * 1000;
    const remainingMs = Math.max(0, totalDurationMs - timeTakenMs);
    const speedRatio = Math.max(0, Math.min(1, remainingMs / totalDurationMs));
    speedBonus = Math.round(speedRatio * question.speedBonusMax);
  }

  // Round 2 Secondary Fix Bonus
  let secondaryPoints = 0;
  if (
    question.round === 2 && 
    question.fixBonusOptionId && 
    secondaryAnswer && 
    String(secondaryAnswer).trim().toLowerCase() === String(question.fixBonusOptionId).trim().toLowerCase()
  ) {
    secondaryPoints = 50;
  }

  return {
    isCorrect: true,
    basePointsAwarded: basePoints,
    speedBonusAwarded: speedBonus,
    secondaryPointsAwarded: secondaryPoints,
    totalPointsAwarded: basePoints + speedBonus + secondaryPoints,
  };
}

/**
 * Battleship strike scoring.
 */
export function calculateBattleshipPoints(cellType: 'SHIP' | 'BONUS' | 'EMPTY'): number {
  switch (cellType) {
    case 'SHIP':
      return 100;
    case 'BONUS':
      return 50;
    case 'EMPTY':
    default:
      return 0;
  }
}

/**
 * Final Boss Wager calculation.
 */
export function calculateWagerResult(
  currentScore: number,
  wager: FinalWager,
  isCorrect: boolean,
  allowNegativeFinalScore: boolean
): { pointsDelta: number; newScore: number } {
  let delta = isCorrect ? wager.wagerAmount : -wager.wagerAmount;
  let newScore = currentScore + delta;

  if (!allowNegativeFinalScore && newScore < 0) {
    newScore = 0;
    delta = -currentScore;
  }

  return {
    pointsDelta: delta,
    newScore,
  };
}

/**
 * Sorts teams and computes authoritative rank with tie-breaking rules:
 * 1. Total score (descending)
 * 2. Number of correct answers (descending)
 * 3. Lower cumulative response time (ascending)
 * 4. Stable team creation order / ID
 */
export function computeRanks(teams: Team[]): Team[] {
  const sorted = [...teams].sort((a, b) => {
    // 1. Total score
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // 2. Correct answer count
    if (b.correctCount !== a.correctCount) {
      return b.correctCount - a.correctCount;
    }
    // 3. Lower cumulative response time
    if (a.totalResponseTimeMs !== b.totalResponseTimeMs) {
      return a.totalResponseTimeMs - b.totalResponseTimeMs;
    }
    // 4. Stable name or id
    return a.id.localeCompare(b.id);
  });

  return sorted.map((team, index) => ({
    ...team,
    prevRank: team.rank,
    rank: index + 1,
  }));
}
