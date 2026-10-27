import { NextRequest } from 'next/server';
import { GameEngine } from '@/lib/game';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get('playerId') || undefined;

  const encoder = new TextEncoder();
  let sendUpdate: (() => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial snapshot immediately
      try {
        const initial = GameEngine.getSnapshot(playerId);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initial)}\n\n`));
      } catch {
        // stream closed
      }

      // 2. Subscribe to server events
      sendUpdate = () => {
        try {
          const snap = GameEngine.getSnapshot(playerId);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(snap)}\n\n`));
        } catch {
          // stream closed
        }
      };

      GameEngine.subscribe(sendUpdate);

      // 3. Keep-alive heartbeat every 20s
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          // stream closed
        }
      }, 20000);
    },
    cancel() {
      if (sendUpdate) {
        GameEngine.unsubscribe(sendUpdate);
      }
      if (heartbeat) {
        clearInterval(heartbeat);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
