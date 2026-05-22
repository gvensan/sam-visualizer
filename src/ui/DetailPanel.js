import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "preact/jsx-runtime";
import { useBusVersion } from "./useBusVersion";
export function DetailPanel({ bus, selected, onClose }) {
    useBusVersion(bus);
    if (!selected)
        return null;
    const state = bus.getState();
    let body;
    if (selected.kind === "agent" || selected.kind === "orchestrator") {
        const agent = state.agents.get(selected.label);
        body = agent ? (_jsxs(_Fragment, { children: [_jsx(Row, { label: "Type", value: agent.isOrchestrator ? "Orchestrator" : "Agent" }), _jsx(Row, { label: "Description", value: agent.description ?? "—" }), _jsx(Row, { label: "Last seen", value: fmtAge(agent.lastSeen) }), _jsx(Row, { label: `Skills (${agent.skills.length})`, value: agent.skills.length ? agent.skills.map((s) => s.name).join(", ") : "—" })] })) : (_jsx(Empty, {}));
    }
    else if (selected.kind === "gateway") {
        const gw = state.gateways.get(selected.label);
        body = gw ? (_jsxs(_Fragment, { children: [_jsx(Row, { label: "Gateway ID", value: gw.id }), _jsx(Row, { label: "Active tasks", value: String(gw.activeTasks) }), _jsx(Row, { label: "First seen", value: fmtAge(gw.firstSeen) }), _jsx(Row, { label: "Last seen", value: fmtAge(gw.lastSeen) })] })) : (_jsx(Empty, {}));
    }
    else {
        body = (_jsxs(_Fragment, { children: [_jsx(Row, { label: "Type", value: selected.kind }), _jsx(Row, { label: "Note", value: "Decorative node, not bound to live A2A traffic." })] }));
    }
    return (_jsxs("aside", { style: panelStyle, children: [_jsxs("div", { style: headerStyle, children: [_jsx("span", { style: { fontWeight: 600 }, children: selected.label }), _jsx("button", { onClick: onClose, style: closeBtn, title: "Close", children: "\u00D7" })] }), _jsx("div", { style: { padding: 12, fontSize: 13, lineHeight: 1.6 }, children: body })] }));
}
function Row({ label, value }) {
    return (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("div", { style: { color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }, children: label }), _jsx("div", { style: { color: "var(--text-primary)" }, children: value })] }));
}
function Empty() {
    return _jsx("div", { style: { color: "var(--text-muted)" }, children: "No data yet." });
}
function fmtAge(ts) {
    const dt = Date.now() - ts;
    if (dt < 1000)
        return "just now";
    if (dt < 60_000)
        return `${Math.round(dt / 1000)}s ago`;
    if (dt < 3_600_000)
        return `${Math.round(dt / 60_000)}m ago`;
    return `${Math.round(dt / 3_600_000)}h ago`;
}
const panelStyle = {
    position: "absolute",
    top: 12,
    right: 12,
    width: 280,
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-primary)",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "var(--shadow)",
};
const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderBottom: "1px solid var(--border)",
};
const closeBtn = {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    fontSize: 18,
    cursor: "pointer",
};
