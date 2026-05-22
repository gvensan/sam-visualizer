# SAM Visualizer

Real-time visualizer for [Solace Agent Mesh](https://solacelabs.github.io/solace-agent-mesh/) (SAM). Connects directly to a Solace event broker over WebSocket, subscribes to A2A protocol traffic, and renders an animated view of agent interactions as they happen. The visualizer observes; it does not participate in the mesh.

A single-page application — no backend, no server-side component. The browser talks to the broker directly via `solclientjs`.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints. The app opens in **Simulation** mode — pick a scenario, click **Play**, and you should see particles flow between zones.

To connect to a real broker, click the **Live broker** tab → **Configure broker**.

## Modes

### Simulation

Four built-in scenarios drive synthetic A2A events through the exact same pipeline that live broker traffic uses:

- **Simple request/response** — gateway → orchestrator → agent → response
- **Multi-agent delegation chain** — orchestrator delegates to A, A delegates to B
- **Concurrent tasks across gateways** — two gateways with overlapping in-flight tasks
- **Mesh scaling: agents appear over time** — staggered AgentCard discovery

Speed slider (0.25x–3x) and loop toggle let you sit on a scenario or speed through it.

### Live broker

Click **Configure broker** and fill in:

| Field | Example | Notes |
|-------|---------|-------|
| WebSocket URL | `wss://broker.example.com:443` / `ws://localhost:8008` | Solace Cloud → Connect → Secured WebSocket Host; or local PubSub+ broker |
| Message VPN | `default` | Cluster manager → Message VPNs |
| Username / Password | — | Client username with subscribe rights |
| SAM namespace | `my-sam-project` | Must match the `namespace` in your SAM project config exactly |
| Subscribe feedback | unchecked | Optional: adds `{namespace}/sam/feedback/v1` |

Values persist to `localStorage`. The visualizer subscribes to `{namespace}/a2a/v1/>` — a single wildcard that captures discovery, requests, status updates, responses, and delegation traffic.

**Enterprise RBAC:** the client username needs `monitor/namespace/{namespace}:a2a_messages:subscribe` (or wildcard `*`). Without it, subscription is silently rejected.

## Architecture

Single dispatch point. Everything — live messages, simulation, future replay — flows through one `EventBus`. The reducer mutates state, then listeners notify. This seam is why simulation looks identical to live mode and why replay is trivial to add later.

```
Topic on Solace broker
  → parseTopic() classifies by hierarchy
  → A2AEvent dispatched onto EventBus
  → reducer updates registries (agents, gateways, tasks)
  → UI re-reads state, D3 animates a particle along the source→target path
```

### File map

```
src/
  bus/
    eventBus.ts          single dispatch point, history buffer
    types.ts             A2AEvent, MeshState, AgentRecord, GatewayRecord, TaskRecord
  parse/
    topic.ts             parseTopic(topic, namespace) -> A2AEvent | null
    payload.ts           extractAgentCard, extractTaskId, extractStatus
  state/
    registries.ts        applyEvent reducer for agents/gateways/tasks
    ttl.ts               90s agent expiry
  sim/
    scenarios.ts         four canned scenarios
    runner.ts            plays a scenario into the bus with original timing
  layout/
    zones.ts             fixed-zone slot allocator (External | Gateway | Mesh | Orchestrator | Agent | Service)
  broker/
    solaceClient.ts      solclientjs over WebSocket, routes into the bus
  ui/
    App.tsx              top-level shell, mode switching
    Canvas.tsx           D3 SVG renderer + particle animations
    Controls.tsx         toolbar
    DetailPanel.tsx      click-node drill-down
    Timeline.tsx         scrolling event log
    ConfigPanel.tsx      broker connection modal
    useBusVersion.ts     Preact hook that rerenders on every bus dispatch
  main.tsx               entry point
```

### Topic hierarchy

The parser matches every A2A topic published by SAM:

| Purpose | Topic pattern |
|---------|---------------|
| Agent discovery | `{ns}/a2a/v1/discovery/agentcards` |
| Task request | `{ns}/a2a/v1/agent/request/{target_agent_name}` |
| Status update | `{ns}/a2a/v1/gateway/status/{gateway_id}/{task_id}` |
| Final response | `{ns}/a2a/v1/gateway/response/{gateway_id}/{task_id}` |
| Peer delegation status | `{ns}/a2a/v1/agent/status/{delegating_agent}/{sub_task_id}` |
| Peer delegation response | `{ns}/a2a/v1/agent/response/{delegating_agent}/{sub_task_id}` |

Names, gateway IDs, and task IDs are extracted from the topic. Payload parsing is best-effort and never blocks animation — text fields from status messages (often full LLM stream chunks) are discarded.

### Layout

Architecture-driven, not force-directed. Six fixed zones laid out left to right, reinforcing SAM's grammar:

```
External  ->  Gateway  ->  Event Mesh  ->  Orchestrator  ->  Agent  ->  Service
```

- Gateway nodes appear as `gateway_id` values are observed in status/response topics.
- Agent nodes are populated from AgentCard discovery payloads.
- Orchestrators are agents whose name contains `orchestrator` (case-insensitive); they get the gold accent and the orchestrator zone.
- Stale agents (no AgentCard in 90s) dim to 40% opacity but are not deleted.

### Message flow encoding

| Event | Particle color | Direction |
|-------|---------------|-----------|
| Request | Blue | Source → target agent |
| Status | Teal | Agent → gateway |
| Response | Green (thicker) | Agent → gateway |
| Delegation status | Amber | Agent → agent |
| Delegation response | Amber (thicker) | Agent → agent |
| Discovery | (no particle) | — |

Target nodes glow briefly when traffic arrives.

## Tech stack

- Vite + TypeScript + Preact for the SPA
- D3 v7 for SVG layout and particle animation
- `solclientjs` (npm, ^10.18) for the Solace WebSocket client
- Vitest for unit tests

## Scripts

```bash
npm run dev          # dev server with HMR
npm run build        # production build (tsc -b + vite build)
npm run preview      # serve the production build locally
npm test             # run vitest suite
npm run test:watch   # watch mode
```

The test suite covers the topic parser, payload extraction, state reducer, TTL helper, event bus, layout, and simulation runner — 26 tests, all of the non-UI logic.

## What the visualizer does not see

A2A is the only thing on the wire. The following are invisible by design:

- **Intra-agent execution** — tool calls, LLM inference, chain-of-thought are not published to the broker.
- **Agent internals** — which LLM, which tools, inference latency.
- **Ordering guarantees** — events are asynchronous. The visualizer correlates by `task_id` and handles out-of-order arrival.

## Open questions

Items called out in `documents/requirements.md` that need verification against actual SAM traffic:

1. **Parent/child task linkage in delegation payloads.** The topic carries `{delegating_agent}/{sub_task_id}` but the link to the originating `task_id` likely lives in the JSON-RPC payload. Needs confirmation.
2. **Originating gateway in request messages.** Likely in Solace user properties; current implementation does not yet read user properties.
3. **AgentCard wire format.** The parser handles the documented YAML schema; on-the-wire JSON should match but has not been compared against a live mesh.
4. **Status payload size.** Streaming status messages may contain large LLM chunks; the parser discards text aggressively but heavy concurrent traffic should be load-tested.

## Roadmap (not in v1)

The bus is replay-safe by design — every event is a plain object dispatched through one channel. Adding recording (serialize history to JSONL with timestamps) and replay (read JSONL, redispatch with original timing, speed control) is a small follow-up.

If the live broker bundle weight matters, `solclientjs` can be dynamically imported only when Live mode is selected, keeping the simulation-only bundle small.

## Reference

- Layout blueprint: `documents/reference-layout.png`
- Full requirements: `documents/requirements.md`
- SAM docs: <https://solacelabs.github.io/solace-agent-mesh/>
