import { NextRequest, NextResponse } from 'next/server';
import { TournamentStore } from '@/lib/store/tournament-store';
import { z } from 'zod';

const SubmitSchema = z.object({
  token: z.string().min(1),
  submittedAnswer: z.string().min(1),
  secondaryAnswer: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = await req.json();
    const { token, submittedAnswer, secondaryAnswer } = SubmitSchema.parse(body);

    const submission = TournamentStore.submitAnswer(code, token, submittedAnswer, secondaryAnswer);
    return NextResponse.json({ success: true, submission });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit answer';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
