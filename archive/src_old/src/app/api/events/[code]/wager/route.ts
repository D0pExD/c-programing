import { NextRequest, NextResponse } from 'next/server';
import { TournamentStore } from '@/lib/store/tournament-store';
import { z } from 'zod';

const WagerSchema = z.object({
  token: z.string().min(1),
  wagerAmount: z.number().int().min(0),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = await req.json();
    const { token, wagerAmount } = WagerSchema.parse(body);

    const wager = TournamentStore.submitWager(code, token, wagerAmount);
    return NextResponse.json({ success: true, wager });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Wager submission failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
