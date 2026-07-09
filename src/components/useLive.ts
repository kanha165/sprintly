'use client';

import { useEffect, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

/**
 * Custom hook to listen to board mutations live.
 * Triggers onChange callback on updates.
 * Progressive fallback: Supabase Realtime -> Local SSE Stream -> 5s Polling.
 */
export function useLive(onChange: (event: any) => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let active = true;
    let sseSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    // 1. Try Supabase Realtime (Browser Client is initialized if NEXT_PUBLIC_* env vars are present)
    if (supabaseBrowser) {
      console.log('Connecting to Supabase Realtime channel...');
      const channel = supabaseBrowser
        .channel('public:tasks')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            if (active) {
              console.log('Realtime change event received:', payload);
              onChangeRef.current({ type: 'realtime', payload });
            }
          }
        )
        .subscribe((status) => {
          console.log(`Supabase Realtime subscription status: ${status}`);
        });

      return () => {
        active = false;
        supabaseBrowser.removeChannel(channel);
      };
    }

    // 2. Fallback to Local SSE connection
    try {
      console.log('Connecting to local SSE route /api/stream...');
      sseSource = new EventSource('/api/stream');

      sseSource.onmessage = (event) => {
        if (!active) return;
        try {
          const parsed = JSON.parse(event.data);
          // Heartbeat connects or valid broadcast events
          if (parsed && parsed.type !== 'connected') {
            console.log('SSE mutation signal received:', parsed);
            onChangeRef.current(parsed);
          }
        } catch (e) {
          // Heartbeat comment or non-json message, ignore
        }
      };

      sseSource.onerror = () => {
        console.warn('Local SSE disconnected. Falling back to 5s polling.');
        if (sseSource) {
          sseSource.close();
          sseSource = null;
        }

        // Initialize polling if not already running
        if (active && !pollInterval) {
          pollInterval = setInterval(() => {
            console.log('Poll fallback fetching task state...');
            onChangeRef.current({ type: 'poll' });
          }, 5000);
        }
      };
    } catch (error) {
      console.warn('Failed to initiate SSE, initializing 5s polling:', error);
      pollInterval = setInterval(() => {
        onChangeRef.current({ type: 'poll' });
      }, 5000);
    }

    return () => {
      active = false;
      if (sseSource) {
        sseSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);
}
