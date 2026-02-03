import { useEffect, useRef } from 'react';
import { useDebateStore } from '@/hooks/useDebateStore';
import { AGENT_COLORS, type AgentId } from '@/types/agent';
import type { GraphNode } from '@/types/graph';

/**
 * Hook to automatically create graph nodes when agents become active.
 * Subscribes to agent state changes and creates nodes for newly active agents.
 */
export function useAutoCreateNodes() {
    const addNode = useDebateStore((s) => s.addNode);
    const agents = useDebateStore((s) => s.agents);
    const phase = useDebateStore((s) => s.phase);
    const isDebating = useDebateStore((s) => s.isDebating);

    // Track which agents already have nodes to prevent duplicates
    const createdNodesRef = useRef<Set<string>>(new Set());

    // Reset created nodes tracking when debate resets
    useEffect(() => {
        if (!isDebating) {
            createdNodesRef.current.clear();
        }
    }, [isDebating]);

    // Watch for newly active agents and create nodes
    useEffect(() => {
        if (!isDebating || phase === 'idle' || phase === 'complete') {
            return;
        }

        // Check each agent
        Object.values(agents).forEach((agent) => {
            // Create a unique key for this agent in this phase
            const nodeKey = `${agent.id}-${phase}`;

            // Create node only if agent is active and we haven't created one yet
            if (agent.isActive && !createdNodesRef.current.has(nodeKey)) {
                // Mark as created before adding to prevent duplicates
                createdNodesRef.current.add(nodeKey);

                // Calculate initial position with some spread
                const centerX = 400;
                const centerY = 300;
                const spread = 200;
                const randomOffset = () => (Math.random() - 0.5) * spread;

                const newNode: GraphNode = {
                    id: `node-${agent.id}-${phase}-${Date.now()}`,
                    agentId: agent.id as AgentId,
                    text: agent.text || '',
                    confidence: undefined,
                    x: centerX + randomOffset(),
                    y: centerY + randomOffset(),
                    color: AGENT_COLORS[agent.id as AgentId] || agent.color,
                    phase: phase,
                    isStreaming: agent.isStreaming,
                };

                addNode(newNode);
            }
        });
    }, [agents, phase, isDebating, addNode]);

    // Update existing node text when agent text changes
    const updateNodeText = useDebateStore((s) => s.updateNodeText);
    const updateNodeStreaming = useDebateStore((s) => s.updateNodeStreaming);
    const nodes = useDebateStore((s) => s.nodes);

    useEffect(() => {
        if (!isDebating) return;

        // Find nodes that need text updates
        nodes.forEach((node) => {
            const agent = agents[node.agentId];
            if (agent) {
                // Update text if different
                if (agent.text !== node.text) {
                    updateNodeText(node.id, agent.text);
                }
                // Update streaming state if different
                if (agent.isStreaming !== node.isStreaming) {
                    updateNodeStreaming(node.id, agent.isStreaming);
                }
            }
        });
    }, [agents, nodes, isDebating, updateNodeText, updateNodeStreaming]);
}
