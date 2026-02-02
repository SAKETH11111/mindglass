import { useEffect, useRef, useCallback, useState } from 'react';
import { useDebateStore } from './useDebateStore';
import type { WebSocketMessage } from '@/types/websocket';

const WS_URL = 'ws://localhost:8000/ws/debate';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isReady, setIsReady] = useState(false);

  const {
    setConnectionState,
    appendToken,
    setError,
    startStreaming,
    stopStreaming,
  } = useDebateStore();

  const connect = useCallback(() => {
    try {
      setConnectionState('connecting');
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
        retryCount.current = 0;
        setIsReady(true);
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionState('disconnected');
        setIsReady(false);

        // Attempt reconnection if we haven't exceeded max retries
        if (retryCount.current < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount.current);
          console.log(`Reconnecting in ${delay}ms (attempt ${retryCount.current + 1}/${MAX_RETRIES})`);

          retryTimeoutRef.current = setTimeout(() => {
            retryCount.current += 1;
            connect();
          }, delay);
        } else {
          setError('Connection lost. Click retry to reconnect.');
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
      };

      ws.current.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);

          switch (data.type) {
            case 'agent_token': {
              // Start streaming if this is the first token
              const store = useDebateStore.getState();
              if (!store.isStreaming && store.currentAgentId !== data.agentId) {
                startStreaming(data.agentId);
              }
              appendToken(data.agentId, data.content);
              break;
            }

            case 'agent_done':
              stopStreaming();
              break;

            case 'debate_complete':
              // Debate finished successfully - ensure streaming is stopped
              stopStreaming();
              console.log('Debate complete');
              break;

            case 'error':
              setError(data.message);
              stopStreaming();
              break;

            default:
              console.warn('Unknown message type:', data);
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to connect to server');
    }
  }, [setConnectionState, appendToken, setError, startStreaming, stopStreaming]);

  useEffect(() => {
    connect();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not ready, message not sent');
    return false;
  }, []);

  // Manual retry function for when automatic retries are exhausted
  const retry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    retryCount.current = 0;
    setError(null);
    connect();
  }, [connect, setError]);

  return { sendMessage, isReady, retry };
}
