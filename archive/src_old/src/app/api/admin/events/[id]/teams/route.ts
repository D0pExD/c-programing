import { NextRequest, NextResponse } from 'next/server';
import { TournamentStore } from '@/lib/store/tournament-store';
import { z } from 'zod';

const TeamActionSchema = z.object({
  action: z.enum(['UPDATE_CAPTAIN', 'TOGGLE_LOCK', 'RENAME_TEAM']),
  teamId: z.string().min(1),
  newCaptainId: z.string().optional(),
  newName: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { action, teamId, newCaptainId, newName } = TeamActionSchema.parse(body);

    const event = TournamentStore.getEventById(id);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const team = event.teams.find((t) => t.id === teamId);
    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    if (action === 'UPDATE_CAPTAIN') {
      if (!newCaptainId) throw new Error('newCaptainId is required');
      TournamentStore.updateTeamCaptain(id, teamId, newCaptainId);
    } else if (action === 'TOGGLE_LOCK') {
      team.isLocked = !team.isLocked;
      event.revision++;
    } else if (action === 'RENAME_TEAM') {
      if (!newName || newName.trim().length === 0) throw new Error('newName is required');
      team.name = newName.trim();
      event.revision++;
    }

    return NextResponse.json({ success: true, team });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Team operation failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
