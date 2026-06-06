import type { AgentId } from '@/types/agent';
import type { WebSocketMessage } from '@/types/websocket';

const DEMO_ROUNDS = [
  { round: 1, name: 'Opening Arguments', agents: ['analyst', 'optimist'] },
  { round: 2, name: 'Challenge', agents: ['critic', 'pessimist'] },
  { round: 3, name: 'Defense & Rebuttal', agents: ['analyst', 'optimist'] },
  { round: 4, name: 'Expert Analysis', agents: ['strategist', 'finance', 'risk'] },
  { round: 5, name: 'Final Verdict', agents: ['synthesizer'] },
] as const;

const DEMO_AGENT_TEXT: Record<string, string> = {
  analyst: (
    '<think>Frame the decision around reversibility, signal quality, and the cost of waiting.</think>' +
    '**My read:** treat this as a staged decision, not a binary leap. The strongest move is the one ' +
    'that creates new evidence quickly while keeping the downside bounded. Define the one metric that ' +
    'would prove the path is working, pick a small first cohort, and commit only after behavior matches the story.'
  ),
  optimist: (
    '<think>Push the upside: momentum, focus, and the hidden cost of hesitation.</think>' +
    'The upside case is real. Moving now can sharpen priorities, create a clearer market signal, and prevent ' +
    'the team from spending months optimizing the wrong option. If the opportunity is directionally right, ' +
    'a small decisive move beats another round of abstract debate.'
  ),
  critic: (
    '<think>Challenge the easy version of the recommendation.</think>' +
    'The weak point is assuming confidence equals evidence. A convincing narrative can hide missing data, ' +
    'especially when the decision feels urgent. Before committing, separate what people say they want from ' +
    'what they will actually choose, pay for, or change behavior around.'
  ),
  pessimist: (
    '<think>Make the downside concrete instead of generic.</think>' +
    'The risk is not just being wrong. It is being wrong in a way that burns trust, attention, or runway before ' +
    'the team learns enough to course-correct. If the first step is too large, the downside can look like a ' +
    'product failure when it was really a sequencing failure.'
  ),
  strategist: (
    '<think>Reconcile the sides into a sequencing recommendation.</think>' +
    'The strategic move is a controlled test with a public enough commitment to matter and a private enough ' +
    'blast radius to survive. Name the hypothesis, pick the smallest audience that can falsify it, and time-box ' +
    'the read. That preserves momentum while forcing the decision to meet reality.'
  ),
  finance: (
    '<think>Translate the decision into runway, opportunity cost, and break-even points.</think>' +
    'Financially, model three thresholds: the minimum upside needed to justify the move, the maximum downside ' +
    'the team can absorb, and the point where waiting becomes more expensive than acting. If the first step ' +
    'improves expected value without locking the company in, it is worth taking.'
  ),
  risk: (
    '<think>Define the kill switch before recommending action.</think>' +
    'Risk is manageable only with a kill switch. Predefine what failure means: the signal does not appear, ' +
    'the operational burden spikes, or the decision creates second-order problems the team cannot absorb. ' +
    'If any of those trip, pause and adjust before scaling.'
  ),
  synthesizer: (
    '<think>Give a decisive answer that uses the debate instead of averaging it.</think>' +
    '**Recommendation: move forward through a staged test, not a blind commitment.** The optimistic case is ' +
    'right that momentum matters and hesitation has a cost. The critic is also right that confidence has to be ' +
    'proven with behavior, not vibes. Choose the smallest meaningful version of the decision, set clear guardrails, ' +
    'and decide after the first real signal. If the metrics hold, scale it. If they wobble, fix the premise before ' +
    'increasing the bet.'
  ),
};

const GENERIC_AGENT_TEXT = (
  '<think>Adapt the scripted demo to this selected perspective.</think>' +
  'This perspective is weighing the decision through its own lens and looking for the highest-signal tradeoff. ' +
  'The key is to move in a way that creates evidence quickly, keeps downside bounded, and turns the next step ' +
  'into a clean decision point.'
);

interface RunClientDemoOptions {
  query: string;
  selectedAgents: AgentId[];
  signal?: AbortSignal;
  onMessage: (message: WebSocketMessage) => void;
}

const delay = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) {
    reject(new DOMException('Demo aborted', 'AbortError'));
    return;
  }

  const timeout = window.setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => {
    window.clearTimeout(timeout);
    reject(new DOMException('Demo aborted', 'AbortError'));
  }, { once: true });
});

const nowMs = () => Date.now();

const chunks = (text: string, size = 8) => {
  const words = text.split(' ');
  const result: string[] = [];
  for (let index = 0; index < words.length; index += size) {
    const isLast = index + size >= words.length;
    result.push(`${words.slice(index, index + size).join(' ')}${isLast ? '' : ' '}`);
  }
  return result;
};

export async function runClientDemoDebate({
  query,
  selectedAgents,
  signal,
  onMessage,
}: RunClientDemoOptions) {
  const startedAt = performance.now();
  const selected = new Set<string>(selectedAgents.length > 0 ? selectedAgents : [
    'analyst',
    'optimist',
    'critic',
    'pessimist',
    'strategist',
    'finance',
    'risk',
    'synthesizer',
  ]);
  selected.add('synthesizer');

  let firstTokenAt: number | null = null;
  let totalChunks = 0;
  const benchmarkRounds: NonNullable<Extract<WebSocketMessage, { type: 'debate_complete' }>['benchmark']>['rounds'] = {};
  const benchmarkAgents: NonNullable<Extract<WebSocketMessage, { type: 'debate_complete' }>['benchmark']>['agents'] = {};

  for (const round of DEMO_ROUNDS) {
    const agents = round.agents.filter((agent) => selected.has(agent)) as AgentId[];
    if (agents.length === 0) continue;

    const roundStartedAt = performance.now();
    onMessage({
      type: 'round_start',
      round: round.round,
      name: round.name,
      agents,
      timestamp: nowMs(),
    });
    onMessage({
      type: 'phase_start',
      phase: round.round,
      name: round.name,
      agents,
      timestamp: nowMs(),
    });
    await delay(180, signal);

    for (const agentId of agents) {
      const agentStartedAt = performance.now();
      const rawText = DEMO_AGENT_TEXT[agentId] || GENERIC_AGENT_TEXT;
      const text = agentId === 'synthesizer'
        ? rawText.replace('the decision', `"${query}"`)
        : rawText;
      const agentChunks = chunks(text);

      for (const content of agentChunks) {
        if (firstTokenAt === null) firstTokenAt = performance.now();
        totalChunks += 1;
        onMessage({
          type: 'agent_token',
          agentId,
          content,
          timestamp: nowMs(),
        });
        await delay(55, signal);
      }

      const elapsedSec = Math.max((performance.now() - agentStartedAt) / 1000, 0.001);
      onMessage({
        type: 'agent_metrics',
        agentId,
        tokensPerSecond: Math.round((agentChunks.length / elapsedSec) * 10) / 10,
        totalTokens: agentChunks.length,
        promptTokens: 0,
        completionTokens: agentChunks.length,
        completionTime: Math.round(elapsedSec * 1000) / 1000,
        timestamp: nowMs(),
      });
      onMessage({
        type: 'agent_done',
        agentId,
        timestamp: nowMs(),
      });

      benchmarkAgents[agentId] = {
        round: round.round,
        model: 'browser-demo',
        ttftMs: 80,
        avgItlMs: 55,
        p50ItlMs: 55,
        p95ItlMs: 70,
        chunks: agentChunks.length,
        promptTokens: 0,
        completionTokens: agentChunks.length,
        totalTokens: agentChunks.length,
        completionTimeSec: Math.round(elapsedSec * 1000) / 1000,
        tokensPerSecond: Math.round((agentChunks.length / elapsedSec) * 10) / 10,
      };

      await delay(140, signal);
    }

    benchmarkRounds[String(round.round)] = {
      name: round.name,
      agents,
      durationMs: Math.round(performance.now() - roundStartedAt),
    };
  }

  const elapsedMs = Math.round(performance.now() - startedAt);
  onMessage({
    type: 'debate_complete',
    totalTokens: totalChunks,
    totalTime: Math.round((elapsedMs / 1000) * 100) / 100,
    avgTokensPerSecond: Math.round(totalChunks / Math.max(elapsedMs / 1000, 0.001)),
    benchmark: {
      e2eMs: elapsedMs,
      firstTokenMs: firstTokenAt === null ? null : Math.round(firstTokenAt - startedAt),
      rounds: benchmarkRounds,
      agents: benchmarkAgents,
    },
    timestamp: nowMs(),
  });
}
