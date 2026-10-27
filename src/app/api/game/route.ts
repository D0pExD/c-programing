import { NextRequest, NextResponse } from 'next/server';
import { GameEngine } from '@/lib/game';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId') || undefined;
    const snapshot = GameEngine.getSnapshot(playerId);
    return NextResponse.json({ success: true, snapshot });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, adminPassword } = body;
    const expectedPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'oversmart';

    // Verify admin credentials for host actions
    if (typeof action === 'string' && action.startsWith('HOST_')) {
      if (!adminPassword || adminPassword !== expectedPassword) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Invalid Admin Password' },
          { status: 401 }
        );
      }
    }

    switch (action) {
      case 'ADMIN_LOGIN': {
        const { password } = body;
        if (password === expectedPassword) {
          return NextResponse.json({ success: true });
        }
        return NextResponse.json(
          { success: false, error: 'Incorrect Admin Password' },
          { status: 401 }
        );
      }

      case 'JOIN': {
        const { name, rollNo } = body;
        if (!name || !rollNo) {
          return NextResponse.json({ success: false, error: 'Name and Roll Number required' }, { status: 400 });
        }
        const player = GameEngine.join(name, rollNo);
        return NextResponse.json({ success: true, player });
      }

      case 'SUBMIT': {
        const { playerId, answer } = body;
        if (!playerId || answer === undefined) {
          return NextResponse.json({ success: false, error: 'Missing answer or player ID' }, { status: 400 });
        }
        const result = GameEngine.submitAnswer(playerId, String(answer));
        return NextResponse.json({ success: true, ...result });
      }

      case 'HOST_START': {
        const { index } = body;
        GameEngine.startQuestion(Number(index) || 0);
        return NextResponse.json({ success: true, snapshot: GameEngine.getSnapshot() });
      }

      case 'HOST_REVEAL': {
        GameEngine.revealAnswer();
        return NextResponse.json({ success: true, snapshot: GameEngine.getSnapshot() });
      }

      case 'HOST_LEADERBOARD': {
        GameEngine.showLeaderboard();
        return NextResponse.json({ success: true, snapshot: GameEngine.getSnapshot() });
      }

      case 'HOST_NEXT': {
        GameEngine.nextQuestion();
        return NextResponse.json({ success: true, snapshot: GameEngine.getSnapshot() });
      }

      case 'HOST_RESET': {
        GameEngine.resetGame();
        return NextResponse.json({ success: true, snapshot: GameEngine.getSnapshot() });
      }

      case 'HOST_SEED': {
        GameEngine.seedMockPlayers(20);
        return NextResponse.json({ success: true, snapshot: GameEngine.getSnapshot() });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Action failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
