import { NextRequest, NextResponse } from 'next/server';
import { TournamentStore } from '@/lib/store/tournament-store';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const event = TournamentStore.getEventByCode(code);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const playerToken = searchParams.get('token') || undefined;

    const snapshot = TournamentStore.getAuthoritativeSnapshot(event.id, playerToken);
    return NextResponse.json({ success: true, snapshot });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve snapshot';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
