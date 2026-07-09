// Global Event Bus for Server-Sent Events (SSE)

type ChangeListener = (data: any) => void;

const globalForEvents = global as unknown as {
  listeners?: Set<ChangeListener>;
};

if (!globalForEvents.listeners) {
  globalForEvents.listeners = new Set();
}

/**
 * Registers a client SSE stream listener
 */
export function subscribeToChanges(listener: ChangeListener) {
  globalForEvents.listeners?.add(listener);
  return () => {
    globalForEvents.listeners?.delete(listener);
  };
}

/**
 * Broadcasts a board mutation to all active client stream connections
 */
export function notifyChange(message: any = { type: 'change' }) {
  if (!globalForEvents.listeners) return;
  console.log(`Broadcasting change event to ${globalForEvents.listeners.size} active SSE connections.`);
  
  for (const listener of globalForEvents.listeners) {
    try {
      listener(message);
    } catch (error) {
      console.error('Failed to notify SSE listener, removing...', error);
      globalForEvents.listeners.delete(listener);
    }
  }
}
