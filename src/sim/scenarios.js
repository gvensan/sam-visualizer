const t = (delayMs, topic, payload, publisher) => ({
    delayMs,
    topic,
    payload,
    publisher,
});
const NS = "demo";
const orchestratorCard = {
    name: "OrchestratorAgent",
    description: "Routes user requests across specialized agents.",
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    skills: [{ id: "plan", name: "Plan", description: "Break down requests." }],
};
const saOrchestratorCard = {
    name: "SAOrchestratorAgent",
    description: "Sub-orchestrator that fans out to a domain-specific cluster of leaf agents.",
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    skills: [{ id: "fanout", name: "Fanout", description: "Route to leaf agents." }],
};
const weatherCard = {
    name: "WeatherAgent",
    description: "Provides weather forecasts for any location.",
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    skills: [{ id: "get_forecast", name: "Get Forecast", description: "Forecast by location." }],
};
const sqlCard = {
    name: "SqlAgent",
    description: "Executes SQL against the analytics warehouse.",
    defaultInputModes: ["text"],
    defaultOutputModes: ["text", "file"],
    skills: [{ id: "query", name: "Query", description: "Run a SQL query." }],
};
const summaryCard = {
    name: "SummaryAgent",
    description: "Summarizes long documents.",
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    skills: [{ id: "summarize", name: "Summarize", description: "Condense text." }],
};
// Payload builders mirror the A2A canonical envelope so the narrator can
// surface the readable text. The simulator passes these through verbatim,
// the broker client would deliver the same shape.
const userMsg = (text) => ({
    message: { role: "user", parts: [{ kind: "text", text }] },
});
const agentMsg = (text) => ({
    message: { role: "agent", parts: [{ kind: "text", text }] },
});
const simpleRequestResponse = {
    id: "simple",
    name: "Simple request/response",
    description: "Gateway → orchestrator → weather agent → response.",
    steps: [
        t(0, `${NS}/a2a/v1/discovery/agentcards`, orchestratorCard, "OrchestratorAgent"),
        t(100, `${NS}/a2a/v1/discovery/agentcards`, weatherCard, "WeatherAgent"),
        t(400, `${NS}/a2a/v1/agent/request/OrchestratorAgent`, { id: "task-100", params: userMsg("What's the weather in Tokyo right now?") }, "webui-1"),
        t(150, `${NS}/a2a/v1/gateway/status/webui-1/task-100`, { params: { status: "working", ...agentMsg("Routing to WeatherAgent…") } }, "OrchestratorAgent"),
        t(200, `${NS}/a2a/v1/agent/request/WeatherAgent`, { id: "sub-100a", params: userMsg("Current weather for Tokyo, Japan in metric units.") }, "OrchestratorAgent"),
        t(150, `${NS}/a2a/v1/agent/status/OrchestratorAgent/sub-100a`, { params: { status: "working", ...agentMsg("Fetching from weather API…") } }, "WeatherAgent"),
        t(400, `${NS}/a2a/v1/agent/response/OrchestratorAgent/sub-100a`, { result: { status: "completed", ...agentMsg("Tokyo: 22°C, partly cloudy, light breeze from the east.") } }, "WeatherAgent"),
        t(150, `${NS}/a2a/v1/gateway/response/webui-1/task-100`, { result: { status: "completed", ...agentMsg("It's 22°C and partly cloudy in Tokyo right now.") } }, "OrchestratorAgent"),
    ],
};
const multiAgentDelegation = {
    id: "delegation",
    name: "Sub-orchestrator chain via broker",
    description: "Orchestrator → SAOrchestrator → SqlAgent → SummaryAgent.",
    steps: [
        t(0, `${NS}/a2a/v1/discovery/agentcards`, orchestratorCard, "OrchestratorAgent"),
        t(80, `${NS}/a2a/v1/discovery/agentcards`, saOrchestratorCard, "SAOrchestratorAgent"),
        t(80, `${NS}/a2a/v1/discovery/agentcards`, sqlCard, "SqlAgent"),
        t(80, `${NS}/a2a/v1/discovery/agentcards`, summaryCard, "SummaryAgent"),
        t(300, `${NS}/a2a/v1/agent/request/OrchestratorAgent`, { id: "task-200", params: userMsg("Summarize last quarter's top-selling products by region.") }, "slack-1"),
        t(120, `${NS}/a2a/v1/gateway/status/slack-1/task-200`, { params: { status: "working", ...agentMsg("Planning: need SQL pull, then summarize.") } }, "OrchestratorAgent"),
        // Orchestrator delegates to the sub-orchestrator…
        t(200, `${NS}/a2a/v1/agent/request/SAOrchestratorAgent`, { id: "sub-200a", params: userMsg("Get top products per region for Q4, then summarize for an exec audience.") }, "OrchestratorAgent"),
        t(150, `${NS}/a2a/v1/agent/status/OrchestratorAgent/sub-200a`, { params: { status: "working", ...agentMsg("Splitting work across SqlAgent and SummaryAgent.") } }, "SAOrchestratorAgent"),
        // …which in turn fans out to leaf agents.
        t(250, `${NS}/a2a/v1/agent/request/SqlAgent`, { id: "sub-200b", params: userMsg("SELECT region, product, SUM(revenue) FROM sales WHERE quarter='Q4' GROUP BY region, product ORDER BY 3 DESC LIMIT 5 per region.") }, "SAOrchestratorAgent"),
        t(120, `${NS}/a2a/v1/agent/status/SAOrchestratorAgent/sub-200b`, { params: { status: "working", ...agentMsg("Query running…") } }, "SqlAgent"),
        t(250, `${NS}/a2a/v1/agent/request/SummaryAgent`, { id: "sub-200c", params: userMsg("Condense the SQL result into 3 bullet points for a board memo.") }, "SAOrchestratorAgent"),
        t(120, `${NS}/a2a/v1/agent/status/SAOrchestratorAgent/sub-200c`, { params: { status: "working", ...agentMsg("Waiting for SQL results, then summarizing.") } }, "SummaryAgent"),
        t(400, `${NS}/a2a/v1/agent/response/SAOrchestratorAgent/sub-200b`, { result: { status: "completed", ...agentMsg("Top sellers: EMEA — Solar kits; APAC — Smart sensors; AMER — Battery packs. Rows: 15.") } }, "SqlAgent"),
        t(150, `${NS}/a2a/v1/agent/response/SAOrchestratorAgent/sub-200c`, { result: { status: "completed", ...agentMsg("• EMEA leans renewables\n• APAC drives IoT\n• AMER hardware-heavy") } }, "SummaryAgent"),
        t(150, `${NS}/a2a/v1/agent/response/OrchestratorAgent/sub-200a`, { result: { status: "completed", ...agentMsg("Compiled regional Q4 summary ready for the gateway.") } }, "SAOrchestratorAgent"),
        t(180, `${NS}/a2a/v1/gateway/response/slack-1/task-200`, { result: { status: "completed", ...agentMsg("Q4 highlights — EMEA: renewables, APAC: IoT sensors, AMER: hardware.") } }, "OrchestratorAgent"),
    ],
};
const concurrentTasks = {
    id: "concurrent",
    name: "Concurrent tasks across gateways",
    description: "Two gateways send overlapping requests.",
    steps: [
        t(0, `${NS}/a2a/v1/discovery/agentcards`, orchestratorCard, "OrchestratorAgent"),
        t(80, `${NS}/a2a/v1/discovery/agentcards`, weatherCard, "WeatherAgent"),
        t(80, `${NS}/a2a/v1/discovery/agentcards`, sqlCard, "SqlAgent"),
        t(300, `${NS}/a2a/v1/agent/request/OrchestratorAgent`, { id: "task-A" }, "webui-1"),
        t(50, `${NS}/a2a/v1/agent/request/OrchestratorAgent`, { id: "task-B" }, "rest-1"),
        t(100, `${NS}/a2a/v1/gateway/status/webui-1/task-A`, { status: "working" }, "OrchestratorAgent"),
        t(50, `${NS}/a2a/v1/gateway/status/rest-1/task-B`, { status: "working" }, "OrchestratorAgent"),
        t(200, `${NS}/a2a/v1/agent/request/WeatherAgent`, { id: "sub-A1" }, "OrchestratorAgent"),
        t(50, `${NS}/a2a/v1/agent/request/SqlAgent`, { id: "sub-B1" }, "OrchestratorAgent"),
        t(300, `${NS}/a2a/v1/agent/response/OrchestratorAgent/sub-A1`, { status: "completed" }, "WeatherAgent"),
        t(80, `${NS}/a2a/v1/agent/response/OrchestratorAgent/sub-B1`, { status: "completed" }, "SqlAgent"),
        t(120, `${NS}/a2a/v1/gateway/response/webui-1/task-A`, { status: "completed" }, "OrchestratorAgent"),
        t(80, `${NS}/a2a/v1/gateway/response/rest-1/task-B`, { status: "completed" }, "OrchestratorAgent"),
    ],
};
const agentDiscoveryWave = {
    id: "discovery",
    name: "Mesh scaling: agents appear over time",
    description: "New agents join the mesh periodically.",
    steps: [
        t(0, `${NS}/a2a/v1/discovery/agentcards`, orchestratorCard, "OrchestratorAgent"),
        t(800, `${NS}/a2a/v1/discovery/agentcards`, weatherCard, "WeatherAgent"),
        t(800, `${NS}/a2a/v1/discovery/agentcards`, sqlCard, "SqlAgent"),
        t(800, `${NS}/a2a/v1/discovery/agentcards`, summaryCard, "SummaryAgent"),
    ],
};
export const SCENARIOS = [
    simpleRequestResponse,
    multiAgentDelegation,
    concurrentTasks,
    agentDiscoveryWave,
];
export const SIM_NAMESPACE = NS;
