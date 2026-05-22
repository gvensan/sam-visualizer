import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useEffect, useRef, useState } from "preact/hooks";
import { shortTaskId } from "../state/colors";
import { extractMessageText } from "../parse/payload";
const MAX_CARDS = 4;
/** Floor on per-card duration so the narration never flashes by faster
 * than a human can register that something happened. */
const MIN_DURATION_MS = 250;
const KIND_LABEL = {
    discovery: "Discovery",
    request: "Request",
    status: "Status",
    response: "Response",
    "delegation-status": "Sub-status",
    "delegation-response": "Sub-response",
};
const KIND_COLOR = {
    discovery: "#94a3b8",
    request: "#3b82f6",
    status: "#00C895",
    response: "#22c55e",
    "delegation-status": "#f59e0b",
    "delegation-response": "#fbbf24",
};
const GENERIC_PUBLISHERS = new Set(["default_client", "default", "anonymous", ""]);
/**
 * Base canvas particle duration per event kind. Mirrors planFromEvent in
 * Canvas.tsx — kept in sync manually because they're the same conceptual
 * value (how long the dot takes to fly from source to destination at 1×).
 */
function baseDurationFor(kind) {
    switch (kind) {
        case "request": return 900;
        case "status": return 700;
        case "response": return 900;
        case "delegation-status": return 800;
        case "delegation-response": return 800;
        case "discovery": return 1000;
    }
}
function findEventBySeq(history, seq) {
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].seq === seq)
            return history[i];
    }
    return undefined;
}
function resolveSource(e, state) {
    if (e.publisher && !GENERIC_PUBLISHERS.has(e.publisher))
        return e.publisher;
    const tid = e.taskId ?? e.subTaskId;
    if (tid) {
        const task = state.tasks.get(tid);
        if (task) {
            if (task.targetAgent)
                return task.targetAgent;
            if (task.sourceAgent)
                return task.sourceAgent;
            if (task.sourceGateway)
                return task.sourceGateway;
        }
    }
    return e.publisher || "unknown";
}
function routingFor(e, state) {
    const from = resolveSource(e, state);
    switch (e.kind) {
        case "request":
            return { from, to: e.agentName ?? "?", taskId: e.taskId };
        case "status":
        case "response":
            return { from, to: `gw:${e.gatewayId ?? "?"}`, taskId: e.taskId };
        case "delegation-status":
        case "delegation-response":
            return { from, to: e.delegatingAgent ?? "?", taskId: e.subTaskId };
        case "discovery":
            return { from, to: "" };
    }
}
function prettyPayload(p) {
    if (p == null)
        return "";
    if (typeof p === "string")
        return p;
    try {
        return JSON.stringify(p, null, 2);
    }
    catch {
        return String(p);
    }
}
function fmtTime(ts) {
    const d = new Date(ts);
    const pad = (n, w = 2) => String(n).padStart(w, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
export function NarrationPanel({ bus, animations, speed }) {
    const [cards, setCards] = useState([]);
    const speedRef = useRef(speed);
    speedRef.current = speed;
    // User-dismissed seqs we should not re-add even if their animation is
    // still active — cleaned up when the animation ends.
    const dismissedRef = useRef(new Set());
    // Card lifecycle is tied directly to the canvas animation lifecycle. A
    // card appears the moment a particle begins flying and disappears the
    // moment it lands. AnimationRegistry's active set is the source of truth.
    useEffect(() => {
        return animations.on(() => {
            const active = animations.get();
            const history = bus.getHistory();
            setCards((prev) => {
                // Keep only cards whose animation is still in flight.
                const kept = prev.filter((c) => active.has(c.id));
                const haveIds = new Set(kept.map((c) => c.id));
                // Add a card for every newly active non-discovery seq.
                const additions = [];
                for (const seq of active) {
                    if (haveIds.has(seq))
                        continue;
                    if (dismissedRef.current.has(seq))
                        continue;
                    const ev = findEventBySeq(history, seq);
                    if (!ev || ev.kind === "discovery")
                        continue;
                    const sNow = Math.max(0.1, speedRef.current);
                    const d = Math.max(MIN_DURATION_MS, Math.round(baseDurationFor(ev.kind) / sNow));
                    additions.push({
                        id: seq,
                        event: ev,
                        durationMs: d,
                        expanded: false,
                        showRaw: false,
                    });
                }
                // Sort by seq so newest sits at the bottom (oldest at top).
                const all = [...kept, ...additions].sort((a, b) => a.id - b.id);
                // Cap by dropping the oldest if we're over.
                return all.length > MAX_CARDS ? all.slice(all.length - MAX_CARDS) : all;
            });
            // Garbage-collect dismissed entries whose animation has ended.
            for (const id of Array.from(dismissedRef.current)) {
                if (!active.has(id))
                    dismissedRef.current.delete(id);
            }
        });
    }, [animations, bus]);
    // Reset on bus clear.
    useEffect(() => {
        return bus.on((e) => {
            if (!e) {
                setCards([]);
                dismissedRef.current.clear();
            }
        });
    }, [bus]);
    const dismiss = (id) => {
        dismissedRef.current.add(id);
        setCards((prev) => prev.filter((c) => c.id !== id));
    };
    const setCardFlag = (id, key, value) => {
        setCards((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
    };
    const state = bus.getState();
    return (_jsx("div", { style: panelOuter, children: cards.length === 0 ? (_jsx("div", { style: empty, children: "Waiting for events\u2026" })) : (_jsx("div", { style: stack, children: cards.map((card) => (_jsx(Card, { card: card, state: state, onDismiss: () => dismiss(card.id), onToggleExpanded: () => setCardFlag(card.id, "expanded", !card.expanded), onToggleRaw: () => setCardFlag(card.id, "showRaw", !card.showRaw) }, card.id))) })) }));
}
function Card({ card, state, onDismiss, onToggleExpanded, onToggleRaw }) {
    const { event, durationMs } = card;
    const color = KIND_COLOR[event.kind];
    const route = routingFor(event, state);
    const messageText = extractMessageText(event.payload);
    return (_jsxs("div", { style: { ...cardStyle, borderColor: color + "55" }, className: "narration-card-enter", children: [_jsxs("div", { style: cardTopRow, children: [_jsx("span", { style: { ...kindChip, color, borderColor: color + "55" }, children: KIND_LABEL[event.kind] }), _jsx("span", { style: topic, title: event.topic, children: event.topic }), _jsx("span", { style: timeText, children: fmtTime(event.ts) }), _jsx("button", { style: iconBtn, onClick: onDismiss, title: "Dismiss", "aria-label": "Dismiss", children: "\u2715" })] }), _jsxs("div", { style: routingRow, children: [_jsx("span", { style: nodeChip, children: route.from }), _jsx("span", { style: arrow, children: "\u2192" }), _jsx("span", { style: hop, children: "broker" }), _jsx("span", { style: arrow, children: "\u2192" }), _jsx("span", { style: nodeChip, children: route.to }), route.taskId && (_jsx("span", { style: taskPill, title: `Task ${route.taskId}`, children: shortTaskId(route.taskId) }))] }), messageText ? (_jsxs("div", { style: {
                    ...quote,
                    borderLeftColor: color,
                    maxHeight: card.expanded ? 200 : 44,
                    cursor: messageText.split("\n").length > 2 || messageText.length > 140
                        ? "pointer"
                        : "default",
                }, onClick: () => {
                    if (messageText.length > 140 || messageText.includes("\n"))
                        onToggleExpanded();
                }, title: card.expanded ? "Click to collapse" : "Click to expand", children: [_jsx("span", { style: quoteMark, children: "\u201C" }), _jsx("div", { style: card.expanded ? quoteBodyExpanded : quoteBodyCollapsed, children: messageText })] })) : (_jsx("div", { style: noText, children: "No readable text in this event." })), _jsxs("div", { style: cardFooter, children: [_jsx("button", { style: linkBtn, onClick: onToggleRaw, children: card.showRaw ? "Hide raw payload" : "View raw payload" }), _jsx("div", { style: ttlTrack, children: _jsx("div", { className: "narration-ttl-fill", style: { background: color, animationDuration: `${durationMs}ms` } }) })] }), card.showRaw && _jsx("pre", { style: rawBox, children: prettyPayload(event.payload) })] }));
}
// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────
const panelOuter = {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--bg-panel)",
    borderTop: "1px solid var(--border)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: 12,
    color: "var(--text-primary)",
    overflow: "hidden",
    minHeight: 0,
};
const stack = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "8px 10px",
    overflowY: "auto",
    minHeight: 0,
};
const empty = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    fontStyle: "italic",
    fontSize: 12,
};
const cardStyle = {
    position: "relative",
    background: "color-mix(in srgb, var(--bg-hover) 30%, transparent)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 10px 4px",
};
const cardTopRow = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
};
const kindChip = {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    padding: "1px 6px",
    borderRadius: 999,
    background: "transparent",
    border: "1px solid",
    whiteSpace: "nowrap",
};
const topic = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 10.5,
    color: "var(--text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
    minWidth: 0,
};
const timeText = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 10,
    color: "var(--text-dim)",
    flexShrink: 0,
};
const iconBtn = {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 12,
    lineHeight: 1,
    padding: "0 4px",
    borderRadius: 4,
};
const routingRow = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
    fontSize: 11,
    flexWrap: "wrap",
};
const nodeChip = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontWeight: 600,
    color: "var(--text-primary)",
    background: "var(--bg-hover)",
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: 10.5,
    maxWidth: 180,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
};
const hop = {
    color: "var(--text-muted)",
    fontStyle: "italic",
    fontSize: 10.5,
};
const arrow = {
    color: "var(--text-muted)",
    fontSize: 12,
};
const taskPill = {
    marginLeft: "auto",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 9.5,
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
    padding: "0 5px",
    borderRadius: 999,
};
const quote = {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    padding: "5px 8px",
    background: "color-mix(in srgb, var(--bg-hover) 50%, transparent)",
    borderLeft: "3px solid",
    borderRadius: "0 6px 6px 0",
    fontSize: 12,
    lineHeight: 1.4,
    color: "var(--text-primary)",
    overflowY: "auto",
    transition: "max-height 180ms ease-out",
};
const quoteMark = {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 18,
    lineHeight: 1,
    color: "var(--text-muted)",
    marginTop: -2,
    flexShrink: 0,
};
const quoteBodyCollapsed = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
    minWidth: 0,
};
const quoteBodyExpanded = {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    flex: 1,
    minWidth: 0,
};
const noText = {
    fontSize: 11,
    color: "var(--text-muted)",
    fontStyle: "italic",
    padding: "3px 0",
};
const cardFooter = {
    display: "flex",
    alignItems: "center",
    marginTop: 5,
    gap: 8,
};
const linkBtn = {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 10.5,
    padding: 0,
    textDecoration: "underline",
    textDecorationStyle: "dotted",
    textUnderlineOffset: 3,
    fontFamily: "inherit",
};
const ttlTrack = {
    flex: 1,
    height: 2,
    background: "var(--border-subtle)",
    borderRadius: 1,
    overflow: "hidden",
    marginLeft: 8,
};
const rawBox = {
    margin: "8px 0 0",
    padding: "6px 8px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 6,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 10.5,
    lineHeight: 1.5,
    color: "var(--text-secondary)",
    maxHeight: 180,
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
};
