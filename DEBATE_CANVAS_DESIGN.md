# Prism Debate Canvas - Design Document

## Design Philosophy

**"The graph is not just eye-candy; it is the control interface."** - PRD

This is a demo for Cerebras hackathon judges. Every design decision must answer:
1. Does this show off Cerebras speed?
2. Does this add to the "wow factor"?
3. Does this help users understand the debate?
4. Is this implementable in our timeline?

---

## The Experience (User Journey)

### 1. Question Entry
User types: "Should my startup focus on growth or profitability?"
→ Press Enter
→ Transition to debate canvas

### 2. The Debate Unfolds (~12 seconds)
- All 8 agents stream simultaneously
- Nodes bloom from center as agents activate
- Edges form showing relationships (supports/refutes/depends-on)
- Graph physics: agreements cluster, conflicts push apart

### 3. Convergence
- When 6/8 agents align → Synthesizer activates
- Final answer appears as prominent central node
- Debate freezes, user can explore

### 4. Post-Debate Exploration
- User can scrub timeline to any point
- Click any node → Inspector panel shows full text
- Input bar available to add constraints → debate restarts with new context

---

## Layout (Full Screen)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ◉ Prism                                                  ● LIVE │ 2,847 t/s        │
├───────────────────────────────────────────────────────────────────────┬──────────────┤
│                                                                       │              │
│   ┌─────────────────────────────────────────────────────────────┐     │   INSPECTOR  │
│   │  "Should my startup focus on growth or profitability?"      │     │              │
│   └─────────────────────────────────────────────────────────────┘     │   ┌────────┐ │
│                                                                       │   │ Avatar │ │
│                         ┌─────────────┐                               │   │ Agent  │ │
│                         │  Analyst    │                               │   │ Name   │ │
│              ┌──────────┤  ▒▒▒▒▒▒▒▒▒▒ │──────────┐                    │   └────────┘ │
│              │          └─────────────┘          │                    │              │
│              │                                   │                    │   Full text  │
│        ┌─────▼─────┐                       ┌─────▼─────┐              │   of the     │
│        │ Optimist  │ ───── supports ───── │ Strategist│              │   selected   │
│        │ ▒▒▒▒▒▒▒▒▒▒│                       │ ▒▒▒▒▒▒▒▒▒▒│              │   agent's    │
│        └───────────┘                       └───────────┘              │   response   │
│              │                                   │                    │   goes here  │
│              │          ┌─────────────┐          │                    │   ...        │
│              └─────────►│ Synthesizer │◄─────────┘                    │              │
│                         │  ▒▒▒▒▒▒▒▒▒▒ │                               │   ─────────  │
│                         │ FINAL ANSWER│                               │   Relations: │
│                         └─────────────┘                               │   → supports │
│                                                                       │   → refutes  │
│                           MAIN CANVAS                                 │              │
│                  (React Flow force-directed graph)                    │              │
│                                                                       │              │
├───────────────────────────────────────────────────────────────────────┴──────────────┤
│  ▶ ─────────●──────────────────────────────────────────────────────────────── 0:12  │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Add a constraint... (e.g., "We only have $5k budget")                  ➤ Send │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                            Powered by Cerebras ⚡    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Top Bar
- **Left:** Prism logo + product name
- **Right:** Live indicator + tokens/second counter
- Token counter proves Cerebras speed (updates every 100ms)

### 2. Question Display
- Pinned at top of canvas area
- The user's original question
- Glassmorphic card style, always visible

### 3. Main Canvas (Center)
The core visualization - a force-directed graph showing the debate.

**Agent Nodes:**
- Glassmorphic cards with agent color accent (left border)
- Avatar (DiceBear Notionists) + Agent name
- Live-streaming text (typing effect, truncated preview)
- Subtle glow when actively streaming
- Click to select → shows in Inspector

**Edges (Semantic Relationships):**
| Type | Style | Physics |
|------|-------|---------|
| `supports` | Thick green | Attraction (pulls nodes together) |
| `refutes` | Thick red | Repulsion (pushes nodes apart) |
| `depends-on` | Dashed blue | Weak attraction |
| `child-of` | Thin gray | Hierarchical |

**Synthesizer / Final Answer:**
- When convergence happens (6/8 agents align)
- Synthesizer node becomes prominent (larger, central, white glow)
- Contains the final synthesized answer
- All other nodes fade slightly

### 4. Right Sidebar: Inspector Panel
When user clicks any node, this panel shows:
- Agent avatar + name + color
- Full text of their response (scrollable)
- Relationships list (who they support/refute)
- Token count for this agent

**States:**
- Empty state: "Click a node to inspect"
- Selected: Shows full agent details
- Can be collapsed on mobile

### 5. Timeline Scrubber (Bottom)
- Simple horizontal progress bar
- Shows elapsed time (0:00 → 0:12)
- Playhead shows current position
- Click/drag to scrub to any point
- Play/pause button on left
- When scrubbing: graph reconstructs to that exact state

### 6. Input Bar (Bottom)
- Always active during and after debate
- Placeholder: "Add a constraint... (e.g., 'We only have $5k budget')"
- User types → presses Enter → all agents receive constraint immediately
- Spawns a UserProxy node (gray) connected to all active agents
- Debate continues with new context

### 7. Footer Attribution
- "Powered by Cerebras ⚡" - subtle branding
- Right-aligned, small text

---

## Key Interactions

### Click Node → Inspect
- Clicking any agent node selects it
- Selected node gets highlight ring
- Inspector panel slides in with full details

### Scrub Timeline → Replay
- Dragging the timeline reconstructs the graph state at that moment
- Useful for "I missed what the Critic said" moments
- Paused state: graph frozen, can click to inspect any node

### Type Constraint → Inject
- User types in bottom input mid-debate
- Creates UserProxy node (gray) in the graph
- All agents receive this as new context
- Debate adapts in real-time (<200ms latency)

### Convergence → Final Answer
- System detects when 6/8 agents align on key points
- Synthesizer activates and produces final answer
- Synthesizer node expands to prominence
- Other nodes cluster around it
- Debate "freezes" - user can explore freely

---

## Visual Polish

### Node Animations
- **Spawn:** Scale 0→1 with spring physics, bloom from center
- **Streaming:** Subtle border pulse/glow while text streams
- **Selected:** Ring highlight + slight scale up

### Edge Animations
- **Draw:** Animate from source to target
- **Active:** Subtle particle flow showing direction

### Convergence Animation
- All nodes gravitationally pull toward Synthesizer
- Final "lock" with subtle flash
- Synthesizer card expands with the answer

---

## Technical Notes

### WebSocket Messages
```typescript
// Incoming from backend
{ type: 'agent_token', agent_id: 'analyst', token: 'The' }
{ type: 'agent_complete', agent_id: 'analyst' }
{ type: 'edge_created', from: 'analyst', to: 'critic', relationship: 'refutes' }
{ type: 'convergence', synthesizer_response: '...' }
{ type: 'snapshot', timestamp: 2500, state: {...} }
```

### State Snapshots (for scrubbing)
- Backend sends snapshot every 100ms
- Frontend stores in array
- Scrub bar reconstructs from snapshot

---

## What We're NOT Building (Scope Control)

| Feature | Why Not |
|---------|---------|
| Fork/branch timelines | Too complex for demo timeline |
| Constraint pinning (drag-to-sidebar) | Nice-to-have, not MVP |
| GPU kill switch toggle | Nice-to-have, not MVP |
| Speed controls (0.5x, 2x) | Just use play/pause |
| Right-click context menus | Adds complexity |
| Confidence scores on nodes | Context-dependent, confusing |

---

## MVP Checklist

### PHASE 1: Canvas Foundation
**Goal:** Get the basic debate page structure rendering with placeholder nodes

- [ ] Create `/debate` route
- [ ] Debate page layout (top bar, canvas, bottom bar)
- [ ] Question header card
- [ ] React Flow canvas setup with custom background
- [ ] 8 placeholder agent nodes (static, no streaming yet)
- [ ] Agent node component (avatar, name, placeholder text)
- [ ] Basic positioning (nodes visible on screen)

### PHASE 2: Inspector Panel + Node Selection
**Goal:** Click a node → see details in sidebar

- [ ] Right sidebar Inspector component
- [ ] Empty state: "Click a node to inspect"
- [ ] Click node → highlight + show in Inspector
- [ ] Full text display in Inspector
- [ ] Agent avatar, name, color in Inspector

### PHASE 3: Edges + Physics
**Goal:** Semantic edges with force-directed layout

- [ ] Semantic edge component (green/red/blue)
- [ ] d3-force physics simulation
- [ ] Edge animations (draw-in effect)
- [ ] Nodes cluster/repel based on relationships

### PHASE 4: WebSocket + Live Streaming
**Goal:** Connect to backend, show live streaming text

- [ ] WebSocket connection to backend
- [ ] Live text streaming in nodes
- [ ] Node glow while streaming
- [ ] Token counter (top right, updates live)

### PHASE 5: Timeline Scrubber
**Goal:** Replay the debate

- [ ] Scrub bar UI at bottom
- [ ] Play/pause button
- [ ] State reconstruction from snapshots
- [ ] Drag to scrub

### PHASE 6: Input Bar + Constraints
**Goal:** User can inject constraints mid-debate

- [ ] Input bar component (always active)
- [ ] Send constraint → UserProxy node spawns
- [ ] All agents receive new context

### PHASE 7: Convergence + Polish
**Goal:** Final answer + animations

- [ ] Convergence detection visual
- [ ] Synthesizer node expands
- [ ] Spawn animations
- [ ] Streaming glow effects
- [ ] "Powered by Cerebras" footer

---

## Summary

**UI Shell (from PRD §6):**
- ✅ Center Canvas: The graph
- ✅ Right Sidebar: Inspector panel
- ✅ Bottom Bar: Timeline + Input
- ✅ Top Badge: Token counter

**Must-Have Features (from PRD §10):**
- ✅ 8 concurrent streaming agents
- ✅ Interactive canvas (React Flow)
- ✅ Live interrupt capability
- ✅ Convergence → Synthesizer → Final Answer
- ✅ Token/sec counter
- ✅ Click node → see full reasoning (Inspector)

**Branding:**
- Product name: **Prism**
- Attribution: "Powered by Cerebras ⚡"
