import { NextRequest } from 'next/server';
import { subscribeToChanges } from '@/lib/events';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  // 1. Authenticate user context
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Establish persistent SSE stream using ReadableStream
  const responseStream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection verification
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      // Subscribe to global in-memory event bus
      const unsubscribe = subscribeToChanges((data) => {
        try {
          const chunk = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch (error) {
          console.error('SSE controller write failed:', error);
        }
      });

      // Periodic keep-alive heartbeats to prevent timeout drops
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (_) {
          // Connection likely closed
        }
      }, 15000);

      // Clean up subscription and timer when connection terminates
      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch (_) {}
      });
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in proxy layers (like Nginx)
    },
  });
}
export const dynamic = 'force-dynamic';
