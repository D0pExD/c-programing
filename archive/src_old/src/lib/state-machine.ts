import { EventState, QuestionState } from '@/types/tournament';

// Valid event state transitions
const VALID_EVENT_TRANSITIONS: Record<EventState, EventState[]> = {
  DRAFT: ['LOBBY_OPEN', 'ARCHIVED'],
  LOBBY_OPEN: ['LOBBY_LOCKED', 'RUNNING', 'DRAFT', 'ARCHIVED'],
  LOBBY_LOCKED: ['LOBBY_OPEN', 'RUNNING', 'ARCHIVED'],
  RUNNING: ['PAUSED', 'FINISHED', 'ARCHIVED'],
  PAUSED: ['RUNNING', 'FINISHED', 'ARCHIVED'],
  FINISHED: ['ARCHIVED', 'DRAFT'], // DRAFT allowed for test reset
  ARCHIVED: ['DRAFT'],
};

// Valid question state transitions
const VALID_QUESTION_TRANSITIONS: Record<QuestionState, QuestionState[]> = {
  PREVIEW: ['READY', 'ACTIVE'],
  READY: ['ACTIVE', 'PREVIEW'],
  ACTIVE: ['LOCKED', 'PAUSED' as unknown as QuestionState, 'REVEALED'],
  LOCKED: ['REVEALED', 'SCORED', 'ACTIVE'], // ACTIVE allowed if admin reopens/restarts
  REVEALED: ['SCORED', 'ACTIVE'],
  SCORED: ['PREVIEW', 'READY'], // When moving to next question
};

export function canTransitionEvent(current: EventState, target: EventState): boolean {
  if (current === target) return true;
  const allowed = VALID_EVENT_TRANSITIONS[current];
  return !!allowed && allowed.includes(target);
}

export function canTransitionQuestion(current: QuestionState, target: QuestionState): boolean {
  if (current === target) return true;
  const allowed = VALID_QUESTION_TRANSITIONS[current];
  return !!allowed && allowed.includes(target);
}

export function validateEventTransition(current: EventState, target: EventState): void {
  if (!canTransitionEvent(current, target)) {
    throw new Error(`Invalid event state transition from ${current} to ${target}`);
  }
}

export function validateQuestionTransition(current: QuestionState, target: QuestionState): void {
  if (!canTransitionQuestion(current, target)) {
    throw new Error(`Invalid question state transition from ${current} to ${target}`);
  }
}
