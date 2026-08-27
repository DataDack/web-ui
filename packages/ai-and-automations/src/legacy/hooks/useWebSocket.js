import { useEffect, useRef } from 'react';
import { wsService } from '../services/websocket';

/**
 * Subscribe to a WebSocket topic and receive messages.
 * @param {string} topic - e.g. "deploy-status:wf-abc123"
 * @param {function} onMessage - callback(payload, fullMessage)
 * @param {object} options - { enabled: true }
 */
export function useWebSocket(topic, onMessage, { enabled = true } = {}) {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !topic) return;

    wsService.ensureConnected();

    const handler = (payload, msg) => callbackRef.current(payload, msg);
    return wsService.subscribe(topic, handler);
  }, [topic, enabled]);
}
