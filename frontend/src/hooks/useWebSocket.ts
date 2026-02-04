import { useEffect, useRef, useCallback, useState } from 'react';
import { useDebateStore } from '@/hooks/useDebateStore';
import type { WebSocketMessage } from '@/types';
import type { Phase, AgentId } from '@/types/agent';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/debate';
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
    setAgentMetrics,
    setPhase,
    setAgentDone,
    setAgentError,
    updateMetrics,
    endDebate,
    setError,
    startDebate,
    addConstraint,
    addCheckpoint,
    setUserProxyNode,
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
          const debateStartTime = useDebateStore.getState().debateStartTime;
          const getTimestamp = () => debateStartTime ? Date.now() - debateStartTime : 0;

          switch (data.type) {
            case 'agent_token': {
              appendToken(data.agentId, data.content);
              break;
            }

            case 'agent_metrics': {
              setAgentMetrics(data.agentId, data.tokensPerSecond, data.totalTokens);
              break;
            }

            case 'agent_done': {
              setAgentDone(data.agentId);
              // Create checkpoint when agent finishes
              const agentName = data.agentId.charAt(0).toUpperCase() + data.agentId.slice(1);
              addCheckpoint({
                id: `agent-${data.agentId}-${Date.now()}`,
                timestamp: getTimestamp(),
                type: 'agent_done',
                label: `${agentName} finished`,
                agentId: data.agentId,
              });
              break;
            }

            case 'agent_error': {
              setAgentError(data.agentId, data.error);
              break;
            }

            case 'phase_change': {
              setPhase(data.phase, data.activeAgents);
              break;
            }

            case 'phase_start': {
              // New round-based streaming message - use round name directly
              console.log(`Round ${data.phase} started: ${data.name}`);
              // Use the round name directly as the phase (cast to Phase since names are valid phases)
              setPhase(data.name as Phase, (data.agents || []) as AgentId[]);
              break;
            }

            case 'round_start': {
              // New round-based debate message
              console.log(`Round ${data.round} started: ${data.name}`);
              setPhase(data.name as Phase, (data.agents || []) as AgentId[]);
              break;
            }

            case 'metrics': {
              updateMetrics(data.tokensPerSecond, data.totalTokens);
              break;
            }

            case 'debate_complete': {
              endDebate();
              console.log('Debate complete');
              break;
            }

            case 'error': {
              setError(data.message);
              break;
            }

            case 'constraint_acknowledged': {
              console.log('Constraint acknowledged:', data.constraint);
              addConstraint(data.constraint);
              // Create UserProxy node for visualization
              setUserProxyNode({
                id: `userproxy-${Date.now()}`,
                text: data.constraint,
                timestamp: Date.now(),
              });
              // Create checkpoint for constraint
              addCheckpoint({
                id: `constraint-${Date.now()}`,
                timestamp: getTimestamp(),
                type: 'constraint',
                label: `You: "${data.constraint.slice(0, 30)}${data.constraint.length > 30 ? '...' : ''}"`,
              });
              break;
            }

            default: {
              console.warn('Unknown message type:', data);
            }
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to connect to server');
    }
  }, [setConnectionState, appendToken, setAgentMetrics, setPhase, setAgentDone, setAgentError, updateMetrics, endDebate, setError, addConstraint, addCheckpoint, setUserProxyNode]);

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

  // Start a debate by sending start_debate message
  const startDebateSession = useCallback((
    query: string, 
    model?: string, 
    previousContext?: string,
    selectedAgents?: AgentId[]
  ) => {
    // Update local state first
    startDebate(query);
    // Send to server with model selection, context, and agent selection
    return sendMessage({ 
      type: 'start_debate', 
      query, 
      model: model || 'pro',
      previousContext: previousContext || '',
      selectedAgents: selectedAgents || null,
    });
  }, [sendMessage, startDebate]);

  // Start a follow-up debate WITHOUT resetting store state (for multi-turn conversations)
  const startFollowUpSession = useCallback((
    query: string, 
    model?: string, 
    previousContext?: string,
    selectedAgents?: AgentId[]
  ) => {
    // DON'T call startDebate - it resets completedTurns/followUpNodes
    // Just send the message to the server
    return sendMessage({ 
      type: 'start_debate', 
      query, 
      model: model || 'pro',
      previousContext: previousContext || '',
      selectedAgents: selectedAgents || null,
    });
  }, [sendMessage]);

  // Inject a constraint mid-debate (PRD: Interrupt & Inject feature)
  const injectConstraint = useCallback((constraint: string): boolean => {
    console.log('Injecting constraint:', constraint);
    return sendMessage({ type: 'inject_constraint', constraint });
  }, [sendMessage]);

  return { sendMessage, isReady, retry, startDebateSession, startFollowUpSession, injectConstraint };
}
