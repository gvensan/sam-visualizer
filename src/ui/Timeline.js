import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useBusVersion } from "./useBusVersion";
import { useAnimations } from "./useAnimations";
function rootTaskOf(state, taskId) {
    const visited = new Set();
    let id = taskId;
    while (!visited.has(id)) {
        visited.add(id);
        const t = state.tasks.get(id);
        if (!t || !t.parentTask)
            return id;
        id = t.parentTask;
    }
    return id;
}
function eventRoot(state, e) {
    const tid = e.taskId ?? e.subTaskId;
    if (!tid)
        return null;
    return rootTaskOf(state, tid);
}
const LABEL = {
    discovery: "DISCOVERY",
    request: "REQUEST",
    status: "STATUS",
    response: "RESPONSE",
    "delegation-status": "DELEGATE-S",
    "delegation-response": "DELEGATE-R",
};
const COLOR = {
    discovery: "#aab3c0",
    request: "#3b82f6",
    status: "#00C895",
    response: "#22c55e",
    "delegation-status": "#f59e0b",
    "delegation-response": "#fbbf24",
};
function describe(e) {
    switch (e.kind) {
        case "discovery":
            return "AgentCard published";
        case "request":
            return `→ ${e.agentName ?? "?"}`;
        case "status":
            return `${e.taskId ?? "?"} → gw:${e.gatewayId ?? "?"}`;
        case "response":
            return `${e.taskId ?? "?"} → gw:${e.gatewayId ?? "?"}`;
        case "delegation-status":
        case "delegation-response":
            return `${e.subTaskId ?? "?"} → ${e.delegatingAgent ?? "?"}`;
    }
}
function fmtTime(ts) {
    const d = new Date(ts);
    const pad = (n, w = 2) => String(n).padStart(w, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
export function Timeline({ bus, animations, limit = 80, onClear, onRewind, rewindEnabled = false, onReplay, replayEnabled = false, replaying = false, caughtUp = false, showDiscovery, setShowDiscovery, spotlightTask, onSpotlight, }) {
    useBusVersion(bus);
    const active = useAnimations(animations);
    const history = bus.getHistory();
    const total = history.length;
    const filtered = showDiscovery
        ? history
        : history.filter((e) => e.kind !== "discovery");
    const hiddenDiscoveries = total - filtered.length;
    const recent = filtered.slice(-limit).reverse();
    const latestSeq = total > 0 ? history[total - 1].seq : undefined;
    // Replay button's enable state must track bus history, not App's render
    // cycle (App doesn't subscribe to bus). Timeline already re-renders on
    // every event via useBusVersion, so derive it here.
    const liveReplayEnabled = onReplay ? replayEnabled && total > 0 : false;
    return (_jsxs("div", { style: wrap, children: [_jsxs("div", { style: header, children: [_jsx("span", { children: "EVENTS" }), _jsx("span", { style: count, title: hiddenDiscoveries > 0
                            ? `${filtered.length} shown · ${hiddenDiscoveries} discovery hidden · ${total} total`
                            : `${filtered.length} of ${total}`, children: showDiscovery || hiddenDiscoveries === 0
                            ? total
                            : `${filtered.length}/${total}` }), _jsxs("label", { style: checkbox, title: "Show or hide AgentCard discovery heartbeats in the list", children: [_jsx("input", { type: "checkbox", checked: showDiscovery, onChange: (e) => setShowDiscovery(e.target.checked), style: { marginRight: 4 } }), "Discovery"] }), _jsx("div", { style: spacer }), onReplay && (replaying ? (
                    // While a replay is in progress the same button morphs into a
                    // STOP control. Clicking it cancels the replay and live events
                    // resume animating on the canvas. The text label doubles as
                    // the "● replaying"/"● caught up" status indicator.
                    _jsxs("button", { style: replayActiveBtn(caughtUp), onClick: onReplay, title: "Stop replay and resume live rendering", children: [_jsx(StopIcon, {}), _jsx("span", { style: { marginLeft: 6 }, children: caughtUp ? "Caught up" : "Replaying" })] })) : (_jsx("button", { style: btn(liveReplayEnabled), onClick: onReplay, disabled: !liveReplayEnabled, title: "Replay the captured event history from the beginning", children: "Replay" }))), onRewind && (_jsx("button", { style: btn(rewindEnabled), onClick: onRewind, disabled: !rewindEnabled, title: "Restart current scenario from the beginning", children: "Rewind" })), onClear && (_jsx("button", { style: iconBtn(total > 0), onClick: onClear, disabled: total === 0, title: "Clear events and reset the canvas", "aria-label": "Clear events", children: _jsx(TrashIcon, {}) }))] }), _jsxs("div", { style: list, children: [recent.map((e) => {
                        const fresh = e.seq === latestSeq;
                        const playing = active.has(e.seq ?? -1);
                        const root = eventRoot(bus.getState(), e);
                        const inSpotlight = spotlightTask !== null && spotlightTask === root;
                        const dimmed = spotlightTask != null && !inSpotlight;
                        const classes = ["timeline-row"];
                        if (fresh)
                            classes.push("timeline-row-fresh");
                        if (playing)
                            classes.push("timeline-row-playing");
                        return (_jsxs("div", { className: classes.join(" "), style: {
                                ...row,
                                cursor: onSpotlight && root ? "pointer" : "default",
                                background: inSpotlight ? "var(--bg-hover)" : undefined,
                                opacity: dimmed ? 0.45 : 1,
                            }, onClick: () => {
                                if (!onSpotlight || !root)
                                    return;
                                onSpotlight(spotlightTask === root ? null : root);
                            }, title: root ? `Spotlight task ${root}` : describe(e), children: [_jsx("span", { style: timeCell, children: fmtTime(e.ts) }), _jsx("span", { style: { ...kindCell, color: COLOR[e.kind] }, children: LABEL[e.kind] }), _jsx("span", { style: descCell, title: describe(e), children: describe(e) })] }, e.seq));
                    }), recent.length === 0 && (_jsx("div", { style: empty, children: total > 0
                            ? "All events filtered. Toggle Discovery on to see them."
                            : "No events yet — start a simulation or connect to a broker." }))] })] }));
}
function StopIcon() {
    return (_jsx("svg", { width: 9, height: 9, viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true", children: _jsx("rect", { x: "3", y: "3", width: "10", height: "10", rx: "1.5" }) }));
}
function TrashIcon() {
    return (_jsxs("svg", { width: 12, height: 12, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("path", { d: "M2.5 4.5h11" }), _jsx("path", { d: "M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5" }), _jsx("path", { d: "M4.2 4.5l.5 8.5a1.4 1.4 0 001.4 1.3h3.8a1.4 1.4 0 001.4-1.3l.5-8.5" }), _jsx("path", { d: "M6.7 7.5v4.2" }), _jsx("path", { d: "M9.3 7.5v4.2" })] }));
}
const wrap = {
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-primary)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    minWidth: 0,
    width: "100%",
};
const header = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderBottom: "1px solid var(--border)",
    color: "var(--text-muted)",
    letterSpacing: 2,
    fontSize: 11,
};
const count = {
    color: "var(--text-dim)",
    letterSpacing: 0,
    fontSize: 11,
    whiteSpace: "nowrap",
};
const spacer = { flex: 1 };
const checkbox = {
    display: "inline-flex",
    alignItems: "center",
    color: "var(--text-secondary)",
    fontSize: 11,
    letterSpacing: 0,
    textTransform: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
};
/** Style for the Replay button while a replay is in flight. The same
 * button serves as the stop control AND the status indicator (Replaying
 * vs Caught up), so its colour reflects the phase. */
function replayActiveBtn(caughtUp) {
    const accent = caughtUp ? "var(--accent-teal)" : "var(--accent-amber)";
    return {
        display: "inline-flex",
        alignItems: "center",
        background: "transparent",
        color: accent,
        border: `1px solid ${accent}`,
        borderRadius: 6,
        padding: "3px 9px",
        fontSize: 11,
        letterSpacing: 1,
        textTransform: "uppercase",
        cursor: "pointer",
        fontFamily: "inherit",
    };
}
const list = {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "4px 0",
    minWidth: 0,
};
const row = {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    padding: "3px 10px",
    minWidth: 0,
};
const timeCell = {
    color: "var(--text-muted)",
    flex: "0 0 96px",
    whiteSpace: "nowrap",
};
const kindCell = {
    flex: "0 0 84px",
    whiteSpace: "nowrap",
    fontWeight: 600,
};
const descCell = {
    color: "var(--text-secondary)",
    flex: "1 1 auto",
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
};
const empty = {
    color: "var(--text-muted)",
    padding: 12,
    lineHeight: 1.5,
};
function btn(enabled) {
    return {
        background: enabled ? "var(--bg-hover)" : "transparent",
        color: enabled ? "var(--text-primary)" : "var(--text-dim)",
        border: `1px solid ${enabled ? "var(--border)" : "var(--border-subtle)"}`,
        borderRadius: 6,
        padding: "3px 9px",
        fontSize: 11,
        letterSpacing: 1,
        cursor: enabled ? "pointer" : "not-allowed",
        fontFamily: "inherit",
    };
}
/** Compact icon-only variant of `btn`. Used for Clear so the header doesn't
 * overflow when Replay/Rewind are also present. */
function iconBtn(enabled) {
    return {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        background: "transparent",
        color: enabled ? "var(--text-primary)" : "var(--text-dim)",
        border: `1px solid ${enabled ? "var(--border)" : "var(--border-subtle)"}`,
        borderRadius: 6,
        padding: 0,
        cursor: enabled ? "pointer" : "not-allowed",
        flexShrink: 0,
    };
}
