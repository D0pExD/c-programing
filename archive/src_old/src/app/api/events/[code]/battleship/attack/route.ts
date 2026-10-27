import { NextRequest, NextResponse } from 'next/server';
import { TournamentStore } from '@/lib/store/tournament-store';
import { z } from 'zod';

const AttackSchema = z.object({
  token: z.string().min(1),
  row: z.number().int().min(0).max(3),
  col: z.number().int().min(0).max(3),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = await req.json();
    const { token, row, col } = AttackSchema.parse(body);

    const result = TournamentStore.attackBattleshipCell(code, token, row, col);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Battleship attack failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
