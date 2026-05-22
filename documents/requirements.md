# SAM Visualizer: requirements and reference

## What this is

A real-time visualizer for Solace Agent Mesh (SAM) that connects directly to a Solace event broker, subscribes to A2A protocol traffic, and renders an animated view of agent interactions as they happen. The visualizer observes. It does not participate in the mesh.

## Architecture decision: single HTML application

Build this as a single-page HTML application (no backend). The browser connects directly to the Solace broker over WebSocket using `solclientjs`. There is no server-side component.

Rationale: the visualizer's job is subscribe, parse, render. There is no user-generated data to persist, no multi-user coordination, no business logic requiring server-side protection. A backend would add complexity with no functional benefit.

### Technology stack

- `solclientjs` (Solace JavaScript client library, load from CDN or bundle)
- D3.js for the topology rendering and animated message flows
- Vanilla JS or a lightweight framework (Svelte, Preact) if state management warrants it; React is fine too but not required
- Single HTML file or a small Vite project; keep it minimal

---

## Layout: architecture-driven, not force-directed

Do NOT use a force-directed graph layout. SAM has a well-defined architectural grammar and the visualization should reinforce it, not abstract it away.

### Reference layout

Use the SAM architecture diagram (included as `reference-layout.png` alongside this file) as the spatial blueprint. The key zones, left to right:

1. **App interfaces / external systems** (far left): the outside world. Slack, Teams, GitHub, SAP, custom clients. These are the origins of requests.
2. **Gateways** (left-center): the boundary translators. WebUI gateway, REST gateway, Slack gateway, MCP gateway, Event Mesh gateway, custom gateways. Each gateway node appears here.
3. **Solace Event Mesh** (center): the messaging fabric. This is not a node, it is the space through which messages flow. Render it as the background/canvas, or as a central zone that messages traverse.
4. **Orchestrator** (top-center/right): the routing intelligence. Sits above the agents.
5. **Agents** (center-right): individual agent nodes. Custom agents, Solace-provided agents, third-party agents. Dynamically populated from AgentCard discovery.
6. **Services** (far right or bottom-right): AI services (LLMs), data management. These are downstream of agents and not directly visible on the A2A topic structure, so they can be decorative/static or omitted from the live view.

### Spatial encoding

- Left-to-right = outside to inside (external request → gateway → mesh → agent)
- Top-to-bottom = orchestration to execution (orchestrator → specialized agents)
- Message animations flow along these axes so the viewer reads direction and purpose instantly

### Dynamic population

- Gateway nodes: inferred from `gateway_id` values appearing in topic patterns (`{namespace}/a2a/v1/gateway/status/{gateway_id}/{task_id}`)
- Agent nodes: populated from AgentCard messages received on the discovery topic
- Orchestrator: typically an agent named `OrchestratorAgent` or similar; identify from AgentCards and position it in the orchestrator zone
- New agents/gateways appear in their respective zones as they are discovered

---

## Broker connection and subscriptions

### Connection configuration

The visualizer needs these inputs from the user (provide a config panel or URL parameters):

| Parameter | Example | Notes |
|-----------|---------|-------|
| Broker WebSocket URL | `wss://broker.example.com:8443` or `ws://localhost:8008` | Use `ws://` for local dev, `wss://` for production |
| VPN name | `default` | The message VPN |
| Username | `visualizer-user` | |
| Password | `***` | |
| Namespace | `my-sam-project` | The SAM namespace configured in the project |

### Subscriptions to add

Once connected, subscribe to:

```
{namespace}/a2a/v1/>
```

This single wildcard subscription captures ALL A2A protocol traffic: discovery, requests, status updates, responses, and delegation messages.

Optionally also subscribe to:

```
{namespace}/sam/feedback/v1
```

For user feedback events (thumbs up/down from the WebUI).

### RBAC note (enterprise)

If the SAM deployment uses RBAC (enterprise edition), the broker credentials used by the visualizer need the monitoring scope:

```
monitor/namespace/{namespace}:a2a_messages:subscribe
```

Or the wildcard scope `*`. Without this, the broker will reject the subscription.

---

## A2A topic structure reference

All SAM inter-component communication follows this topic hierarchy. The visualizer parses topics to classify every incoming message before touching the payload.

| Purpose | Topic pattern | What it tells the visualizer |
|---------|--------------|------------------------------|
| Agent discovery | `{namespace}/a2a/v1/discovery/agentcards` | An agent is announcing itself. Payload is an AgentCard JSON. |
| Task request (to agent) | `{namespace}/a2a/v1/agent/request/{target_agent_name}` | A gateway or agent is sending a task to `{target_agent_name}`. |
| Status update (to gateway) | `{namespace}/a2a/v1/gateway/status/{gateway_id}/{task_id}` | Streaming status from an agent back to gateway `{gateway_id}` for task `{task_id}`. |
| Final response (to gateway) | `{namespace}/a2a/v1/gateway/response/{gateway_id}/{task_id}` | Task `{task_id}` completed. Final result going back to gateway `{gateway_id}`. |
| Peer delegation status | `{namespace}/a2a/v1/agent/status/{delegating_agent_name}/{sub_task_id}` | Agent-to-agent delegation: status update flowing back to `{delegating_agent_name}`. |
| Peer delegation response | `{namespace}/a2a/v1/agent/response/{delegating_agent_name}/{sub_task_id}` | Agent-to-agent delegation: final response back to `{delegating_agent_name}`. |

### Topic parsing strategy

Parse the topic string to classify the message type BEFORE inspecting the payload. Use the topic hierarchy as the primary event router:

```
Split topic by "/"
Verify prefix matches {namespace}/a2a/v1/

Then match on the segment after v1/:
  "discovery"  → agent discovery event
  "agent"      → next segment is "request", "status", or "response"
  "gateway"    → next segment is "status" or "response"
```

Extract agent names, gateway IDs, and task IDs directly from the topic structure.

---

## Message payloads

The A2A protocol uses JSON-RPC 2.0. The visualizer needs only a subset of fields from each message type.

### AgentCard (discovery messages)

Published periodically by every agent host. Contains:

```json
{
  "name": "WeatherAgent",
  "description": "An agent that provides weather forecasts...",
  "defaultInputModes": ["text"],
  "defaultOutputModes": ["text", "file"],
  "skills": [
    {
      "id": "get_forecast",
      "name": "Get Forecast",
      "description": "Retrieves weather forecast for a location."
    }
  ]
}
```

Fields the visualizer should extract and display:
- `name` (node label)
- `description` (tooltip/detail panel)
- `skills` (list in detail panel; also used by MCP gateway to create tools)

### Task request messages

The visualizer needs:
- `task_id` (from the JSON-RPC payload) to correlate with subsequent status/response messages
- Source: inferred from context (which gateway or agent originated it; may need to parse the `id` field or Solace user properties)
- Target: extracted from the topic (`{target_agent_name}`)

### Status update messages

The visualizer needs:
- `task_id` (from topic or payload)
- Status value (e.g., `working`, `completed`, `failed`)
- Discard the actual content/text payload to avoid buffering LLM output

### Delegation messages

When Agent A delegates to Agent B:
- The request goes to `{namespace}/a2a/v1/agent/request/{AgentB}`
- Agent B's status/response goes to `{namespace}/a2a/v1/agent/status/{AgentA}/{sub_task_id}` and `{namespace}/a2a/v1/agent/response/{AgentA}/{sub_task_id}`

The parent-child relationship between the original task and the sub-task is NOT fully encoded in the topic structure. You will need to inspect the JSON-RPC payload to find any parent task reference. This linkage needs verification against actual SAM message payloads; it may require tracing the `task_id` / `sub_task_id` relationship through the request that initiated the delegation.

---

## In-memory state model

Maintain three data structures client-side:

### 1. Agent registry

```
Map<agent_name, {
  name: string,
  description: string,
  skills: Skill[],
  lastSeen: timestamp,    // updated on each AgentCard received
  isOrchestrator: boolean // heuristic: name contains "orchestrator"
}>
```

Implement TTL-based expiry: if an agent hasn't republished its AgentCard within `3 × publishing_interval` (default publishing interval is 10-30 seconds, so roughly 90 seconds as a safe TTL), mark it as potentially offline. There is no explicit "agent left" event.

### 2. Gateway registry

```
Map<gateway_id, {
  id: string,
  firstSeen: timestamp,
  lastSeen: timestamp,
  activeTasks: number
}>
```

Gateways are NOT discovered via AgentCards. They are inferred from topic patterns as `gateway_id` values appear in status/response topics. Build this registry dynamically.

### 3. Task tracker

```
Map<task_id, {
  id: string,
  sourceGateway: string | null,
  sourceAgent: string | null,   // for delegations
  targetAgent: string,
  status: string,
  startTime: timestamp,
  endTime: timestamp | null,
  subTasks: sub_task_id[],      // delegation children
  parentTask: task_id | null    // if this is a delegation
}>
```

Tasks are the edges in the visualization. Each task represents a flow from source → target, with status transitions over time.

---

## Visualization design

### Node types and visual encoding

| Node type | Shape | Color | Position zone |
|-----------|-------|-------|---------------|
| Gateway | Rounded rectangle | Teal/cyan border | Left-center column |
| Orchestrator | Larger rounded rectangle or distinct icon | Gold/amber accent | Top-center |
| Agent | Rounded rectangle | Green (#00C895) border | Center-right grid |
| External interface | Small icon/label | Gray | Far left (static/decorative) |

Nodes should show:
- Name label
- Subtle pulse/glow when actively processing
- Dim/fade when TTL expires (agent offline)
- Skill count or description snippet on hover

### Message flow animations

When an event arrives, animate a "particle" or "pulse" along the path between source and target:

| Message type | Animation color | Direction |
|-------------|----------------|-----------|
| Request | Blue (#3b82f6) | Left → right (gateway → agent) or top → bottom (orchestrator → agent) |
| Status update | Teal (#00C895) | Right → left (agent → gateway) |
| Response (final) | Bright green | Right → left, thicker/brighter |
| Delegation request | Amber (#f59e0b) | Agent → agent (horizontal within agent zone) |
| Delegation response | Amber, dimmer | Agent → agent, reverse direction |
| Discovery | Subtle white pulse | Radiate from agent node |

Particles should travel along curved or straight paths between node positions. Use SVG `<path>` elements with D3 transitions, or canvas-based particle animation for higher throughput.

### Event timeline (optional sidebar)

A scrolling log at the bottom or right side showing recent events in chronological order:

```
12:04:32.451  REQUEST   WebUI → OrchestratorAgent    task-abc123
12:04:32.892  DELEGATE  OrchestratorAgent → WeatherAgent    subtask-def456
12:04:33.210  STATUS    WeatherAgent → WebUI    task-abc123 (working)
12:04:34.001  RESPONSE  WeatherAgent → OrchestratorAgent    subtask-def456
12:04:34.312  RESPONSE  OrchestratorAgent → WebUI    task-abc123 (completed)
```

### Detail panel

Clicking a node should show a detail panel with:
- Agent: name, description, skills list, time since last heartbeat
- Gateway: ID, active task count, first/last seen
- Task (if clicking an animated flow): task ID, source, target, status, duration, sub-tasks

---

## Simulation mode

For demos and development, include a simulation mode that generates synthetic events without a broker connection. This is essential for:
- Developing the UI without a live SAM instance
- Creating recordings for content (blog posts, videos)
- Conference demos where a live broker may not be available

### Simulation scenarios

1. **Simple request/response**: Gateway sends request to orchestrator, orchestrator delegates to one agent, agent responds, orchestrator responds to gateway.
2. **Multi-agent delegation**: Orchestrator delegates to Agent A, which delegates to Agent B. Both respond back up the chain.
3. **Concurrent tasks**: Multiple gateways sending requests simultaneously, multiple tasks in flight.
4. **Agent discovery**: New agents appearing over time, simulating a mesh scaling up.

Simulation should use the same internal event pipeline as live mode (generate synthetic messages with the same structure, feed them through the same parsing and rendering logic).

---

## Replay capability (future, but design for it now)

Structure the internal event pipeline so that every parsed event (after topic classification and payload extraction) passes through a single event bus. This enables:

- **Recording**: serialize the event stream to JSONL with timestamps
- **Replay**: read JSONL, feed events into the same bus with original timing
- **Speed control**: replay at 1x, 2x, 0.5x

This doesn't need to be built in v1, but the architecture should make it trivial to add. Specifically: do not have the Solace message callback directly mutate state. Instead, have it produce a normalized event object that gets dispatched through a handler. The handler is the single place where state is updated and rendering is triggered.

---

## What the visualizer will NOT see

Important limitations to document in the UI (e.g., a small info tooltip):

- **Intra-agent execution**: tool calls, LLM inference, chain-of-thought within an agent are NOT published to the broker. The visualizer only sees A2A-level communication (requests in, status updates, responses out).
- **Agent internals**: which LLM an agent is using, what tools it invoked, how long inference took. None of this is on the wire.
- **Guaranteed message ordering**: events arrive asynchronously. The visualizer must correlate by task ID and handle out-of-order arrival gracefully.

---

## Open questions to verify against the codebase

These items came up during design and need verification against actual SAM source or a running instance:

1. **Parent-child task linkage in delegation payloads**: when Agent A delegates to Agent B, does the delegation request payload contain a reference to the parent `task_id`? What field carries this? This is needed to build the delegation tree.

2. **Gateway identity in request messages**: when a gateway publishes a task request to `{namespace}/a2a/v1/agent/request/{agent}`, how is the originating gateway identified? Is it in the Solace message user properties, or in the JSON-RPC payload? The visualizer needs this to draw the source end of the edge.

3. **AgentCard payload structure**: confirm the exact JSON schema of AgentCards as published on the discovery topic. The fields listed above (name, description, skills) are from the YAML config docs. Verify the on-the-wire JSON matches.

4. **solclientjs WebSocket compatibility**: confirm the Solace broker being used exposes a WebSocket port (typically 8008 for `ws://` or 8443 for `wss://`). The Solace Cloud broker supports this. Self-hosted software brokers need the WebSocket service enabled.

5. **Message payload size**: for the topic subscription `{namespace}/a2a/v1/>`, status messages may contain full LLM-generated text (streaming chunks). Confirm whether the visualizer should expect large payloads and plan to discard content fields aggressively to avoid memory pressure.

---

## File reference

If building this in Claude Code, include the reference layout image alongside the project:

- `reference-layout.png`: the SAM architecture diagram showing the spatial organization of gateways, event mesh, orchestrator, agents, and services. Use this as the layout blueprint, not a literal reproduction (no logos, no brand assets in the visualizer; just the spatial grammar).