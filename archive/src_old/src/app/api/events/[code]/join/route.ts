import { NextRequest, NextResponse } from 'next/server';
import { TournamentStore } from '@/lib/store/tournament-store';
import { z } from 'zod';

const JoinSchema = z.object({
  name: z.string().min(2).max(50),
  rollNumber: z.string().min(2).max(30),
  teamId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = await req.json();
    const { name, rollNumber, teamId } = JoinSchema.parse(body);

    const result = TournamentStore.joinEvent(code, name, rollNumber, teamId);
    return NextResponse.json({
      success: true,
      player: result.player,
      session: result.session,
      team: result.team,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to join tournament';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
