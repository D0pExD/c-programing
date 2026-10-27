import { NextRequest, NextResponse } from 'next/server';
import { TournamentStore } from '@/lib/store/tournament-store';
import { z } from 'zod';

const CreateEventSchema = z.object({
  title: z.string().min(3).max(100),
  customCode: z.string().min(3).max(8).optional(),
});

export async function GET() {
  try {
    const events = TournamentStore.listEvents();
    return NextResponse.json({ success: true, events });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch events';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateEventSchema.parse(body);
    const event = TournamentStore.createEvent(parsed.title, parsed.customCode);
    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid request payload';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
