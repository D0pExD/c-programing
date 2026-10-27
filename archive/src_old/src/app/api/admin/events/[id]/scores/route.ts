import { NextRequest, NextResponse } from 'next/server';
import { TournamentStore } from '@/lib/store/tournament-store';
import { z } from 'zod';

const AdjustScoreSchema = z.object({
  teamId: z.string().min(1),
  pointsDelta: z.number().int(),
  reason: z.string().min(3),
  adminId: z.string().default('HOST_ADMIN'),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { teamId, pointsDelta, reason, adminId } = AdjustScoreSchema.parse(body);

    const updatedEvent = TournamentStore.adjustTeamScore(id, teamId, pointsDelta, reason, adminId);
    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Score adjustment failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
