import { NextRequest, NextResponse } from 'next/server';
import { TournamentStore } from '@/lib/store/tournament-store';
import { EventState, QuestionState } from '@/types/tournament';
import { z } from 'zod';

const ControlActionSchema = z.object({
  action: z.enum([
    'SET_EVENT_STATE',
    'SET_QUESTION_STATE',
    'PAUSE_TIMER',
    'RESUME_TIMER',
    'CALCULATE_SCORES',
    'SCORE_FINAL_BOSS',
    'ADVANCE_QUESTION',
    'SIMULATE_CLASSROOM',
    'RESET_EVENT',
  ]),
  targetState: z.string().optional(),
  targetQuestionId: z.string().optional(),
  adminId: z.string().default('HOST_ADMIN'),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { action, targetState, targetQuestionId, adminId } = ControlActionSchema.parse(body);

    const event = TournamentStore.getEventById(id);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    let updated = event;

    switch (action) {
      case 'SET_EVENT_STATE':
        if (!targetState) throw new Error('targetState required for SET_EVENT_STATE');
        updated = TournamentStore.updateEventState(id, targetState as EventState, adminId);
        break;

      case 'SET_QUESTION_STATE':
        if (!targetState) throw new Error('targetState required for SET_QUESTION_STATE');
        updated = TournamentStore.setQuestionState(id, targetState as QuestionState, adminId);
        break;

      case 'PAUSE_TIMER':
        updated = TournamentStore.pauseTimer(id);
        break;

      case 'RESUME_TIMER':
        updated = TournamentStore.resumeTimer(id);
        break;

      case 'CALCULATE_SCORES':
        updated = TournamentStore.calculateQuestionScores(id);
        break;

      case 'SCORE_FINAL_BOSS':
        updated = TournamentStore.scoreFinalBoss(id);
        break;

      case 'ADVANCE_QUESTION':
        updated = TournamentStore.advanceQuestion(id, targetQuestionId);
        break;

      case 'SIMULATE_CLASSROOM':
        updated = TournamentStore.seedSimulatedClassroom(id);
        break;

      case 'RESET_EVENT':
        // Reset event for new trial
        event.state = 'LOBBY_OPEN';
        event.currentRound = 1;
        event.questionState = 'PREVIEW';
        event.currentQuestionId = TournamentStore.getQuestions(id)[0]?.id;
        event.questionStartedAt = undefined;
        event.questionDeadline = undefined;
        event.timerPausedRemainingSeconds = undefined;
        event.teams.forEach((t) => {
          t.score = 0;
          t.correctCount = 0;
          t.totalResponseTimeMs = 0;
          t.rank = 1;
          t.prevRank = undefined;
        });
        event.revision++;
        updated = event;
        break;

      default:
        throw new Error('Unsupported control action');
    }

    return NextResponse.json({ success: true, event: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Control action failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
