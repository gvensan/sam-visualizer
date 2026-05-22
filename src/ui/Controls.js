import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { SCENARIOS } from "../sim/scenarios";
export function Controls(p) {
    return (_jsxs("header", { style: bar, children: [_jsx("span", { style: { fontWeight: 700, letterSpacing: 1 }, children: "SAM VISUALIZER" }), _jsxs("div", { style: group, children: [_jsx("button", { style: tabBtn(p.mode === "sim"), onClick: () => p.setMode("sim"), children: "Simulation" }), _jsx("button", { style: tabBtn(p.mode === "live"), onClick: () => p.setMode("live"), children: "Live broker" })] }), p.mode === "sim" ? (_jsxs("div", { style: group, children: [_jsx("select", { value: p.scenarioId, onChange: (e) => p.setScenarioId(e.target.value), style: select, disabled: p.running, children: SCENARIOS.map((s) => (_jsx("option", { value: s.id, children: s.name }, s.id))) }), _jsxs("label", { style: lbl, children: [_jsx("input", { type: "checkbox", checked: p.loop, onChange: (e) => p.setLoop(e.target.checked), style: { marginRight: 4 } }), "Loop"] }), p.running ? (_jsx("button", { style: primary, onClick: p.onStop, children: "Stop" })) : (_jsx("button", { style: primary, onClick: p.onStart, children: "Play" }))] })) : (_jsxs("div", { style: group, children: [_jsx("span", { style: statusStyle(p.liveStatus), children: p.liveStatus }), _jsx("button", { style: primary, onClick: p.onOpenConnect, children: "Configure broker" }), _jsx("button", { style: iconCtrlBtn(p.liveStatus === "connected" || p.liveStatus === "connecting" || p.paused), onClick: p.onLiveStart, disabled: p.liveStatus === "connecting", title: "Start fresh: disconnect, clear, reconnect with the saved broker config", "aria-label": "Start", children: _jsx(PlayIcon, {}) }), _jsx("button", { style: iconCtrlBtn(p.liveStatus === "connected"), onClick: p.onLivePauseResume, disabled: p.liveStatus !== "connected", title: p.paused ? "Resume — replay missed events, then live" : "Pause visual rendering (events still recorded)", "aria-label": p.paused ? "Resume" : "Pause", "aria-pressed": p.paused, children: p.paused ? _jsx(PlayIcon, {}) : _jsx(PauseIcon, {}) }), _jsx("button", { style: iconCtrlBtn(p.liveStatus === "connected" || p.paused), onClick: p.onLiveStop, disabled: p.liveStatus !== "connected" && !p.paused, title: "Stop: disconnect and clear the canvas", "aria-label": "Stop", children: _jsx(StopIcon, {}) })] })), _jsx("div", { style: spacer }), _jsxs("div", { style: speedGroup, title: "Slow the visualization down to read each interaction, or speed it up.", children: [_jsx("span", { style: speedSideLabel, children: "Slow" }), _jsxs("div", { style: speedSliderWrap, children: [_jsxs("div", { style: speedTrackWrap, children: [_jsx("span", { style: {
                                            ...speedFloatLabel,
                                            // Map slider position [-2, +2] to a 0..100% offset so the
                                            // bubble sits centred over the current thumb position.
                                            left: `${((p.speedPos - -2) / 4) * 100}%`,
                                        }, children: formatSpeed(p.speedPos, p.speed) }), _jsx("input", { type: "range", min: -2, max: 2, step: 0.25, value: p.speedPos, onInput: (e) => p.setSpeedPos(Number(e.target.value)), list: "speed-ticks", style: speedSlider }), _jsxs("datalist", { id: "speed-ticks", children: [_jsx("option", { value: -2 }), _jsx("option", { value: -1 }), _jsx("option", { value: 0 }), _jsx("option", { value: 1 }), _jsx("option", { value: 2 })] })] }), _jsxs("div", { style: speedAnchors, children: [_jsx("span", { children: "\u22122" }), _jsx("span", { style: speedNormalTick, children: "Normal" }), _jsx("span", { children: "+2" })] })] }), _jsx("span", { style: speedSideLabel, children: "Fast" })] }), _jsxs("div", { style: group, title: "How animations on the canvas are paced", children: [_jsx("span", { style: lblMuted, children: "Render" }), _jsx("button", { style: tabBtn(p.renderMode === "sequence"), onClick: () => p.setRenderMode("sequence"), title: "Play one animation at a time so each interaction is readable", children: "Sequence" }), _jsx("button", { style: tabBtn(p.renderMode === "realtime"), onClick: () => p.setRenderMode("realtime"), title: "Animate every event the instant it arrives (may overlap)", children: "Real-time" })] }), _jsxs("div", { style: panelTogglesGroup, children: [_jsx("button", { style: panelToggleBtn(p.showBottomPanel), onClick: p.toggleBottomPanel, title: p.showBottomPanel ? "Hide bottom narration panel" : "Show bottom narration panel", "aria-label": "Toggle bottom panel", "aria-pressed": p.showBottomPanel, children: _jsx(BottomPanelIcon, { active: p.showBottomPanel }) }), _jsx("button", { style: panelToggleBtn(p.showTimeline), onClick: p.toggleTimeline, title: p.showTimeline ? "Hide right timeline" : "Show right timeline", "aria-label": "Toggle right timeline", "aria-pressed": p.showTimeline, children: _jsx(RightPanelIcon, { active: p.showTimeline }) })] }), _jsx("div", { style: group, children: _jsxs("button", { style: gearBtn, onClick: p.onOpenSettings, title: "Settings \u2014 theme, labels, capture, expiry", "aria-label": "Open settings", children: [_jsx(Gear, {}), " Settings"] }) })] }));
}
/** Show the relative factor instead of an absolute multiplier — that's how
 * the user thinks about Slow/Normal/Fast. e.g. "Slow ×2", "Fast ×1.5". */
function formatSpeed(pos, _multiplier) {
    if (pos === 0)
        return "Normal";
    const factor = 1 + Math.abs(pos) / 2;
    const f = Math.round(factor * 100) / 100;
    const str = f % 1 === 0 ? `${f}` : f.toFixed(2).replace(/0$/, "");
    return pos > 0 ? `Fast ×${str}` : `Slow ×${str}`;
}
function PlayIcon() {
    return (_jsx("svg", { width: 12, height: 12, viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M4 3.5v9l8-4.5-8-4.5z" }) }));
}
function PauseIcon() {
    return (_jsxs("svg", { width: 12, height: 12, viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true", children: [_jsx("rect", { x: "4", y: "3", width: "3", height: "10", rx: "0.5" }), _jsx("rect", { x: "9", y: "3", width: "3", height: "10", rx: "0.5" })] }));
}
function StopIcon() {
    return (_jsx("svg", { width: 12, height: 12, viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true", children: _jsx("rect", { x: "4", y: "4", width: "8", height: "8", rx: "1" }) }));
}
function BottomPanelIcon({ active }) {
    return (_jsxs("svg", { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: [_jsx("rect", { x: "2", y: "2.5", width: "12", height: "11", rx: "1.5", stroke: "currentColor", strokeWidth: "1.2" }), _jsx("rect", { x: "2.5", y: "9.5", width: "11", height: "3.5", rx: "0.6", fill: active ? "currentColor" : "transparent", opacity: active ? 0.9 : 0 }), _jsx("line", { x1: "2", y1: "9.5", x2: "14", y2: "9.5", stroke: "currentColor", strokeWidth: "1" })] }));
}
function RightPanelIcon({ active }) {
    return (_jsxs("svg", { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: [_jsx("rect", { x: "2", y: "2.5", width: "12", height: "11", rx: "1.5", stroke: "currentColor", strokeWidth: "1.2" }), _jsx("rect", { x: "10", y: "3", width: "3.5", height: "10", rx: "0.6", fill: active ? "currentColor" : "transparent", opacity: active ? 0.9 : 0 }), _jsx("line", { x1: "10", y1: "2.5", x2: "10", y2: "13.5", stroke: "currentColor", strokeWidth: "1" })] }));
}
function Gear() {
    return (_jsxs("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("circle", { cx: "12", cy: "12", r: "3" }), _jsx("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" })] }));
}
const bar = {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "10px 16px",
    background: "var(--bg-panel-header)",
    borderBottom: "1px solid var(--border)",
    color: "var(--text-primary)",
    fontFamily: "system-ui, sans-serif",
    fontSize: 13,
};
const group = { display: "flex", alignItems: "center", gap: 8 };
const lbl = { color: "var(--text-secondary)", fontSize: 12, display: "inline-flex", alignItems: "center" };
const lblMuted = {
    color: "var(--text-muted)",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
};
const spacer = { flex: 1 };
const select = {
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "4px 6px",
};
const primary = {
    background: "var(--accent-teal)",
    color: "#031312",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    fontWeight: 600,
    cursor: "pointer",
};
const speedGroup = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "var(--text-secondary)",
    fontSize: 12,
};
const speedSideLabel = {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "var(--text-muted)",
};
const speedSliderWrap = {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    width: 180,
};
const speedSlider = {
    width: "100%",
    margin: 0,
    accentColor: "var(--accent-teal)",
};
const speedAnchors = {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 9,
    color: "var(--text-dim)",
    marginTop: 2,
    letterSpacing: 0.5,
};
const speedNormalTick = {
    color: "var(--text-muted)",
    fontWeight: 600,
};
const speedTrackWrap = {
    position: "relative",
    paddingTop: 18,
};
const speedFloatLabel = {
    position: "absolute",
    top: 0,
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text-primary)",
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: 4,
    padding: "0 5px",
    lineHeight: 1.4,
};
function iconCtrlBtn(enabled) {
    return {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        background: "transparent",
        color: enabled ? "var(--text-primary)" : "var(--text-dim)",
        border: `1px solid ${enabled ? "var(--border)" : "var(--border-subtle)"}`,
        borderRadius: 6,
        padding: 0,
        cursor: enabled ? "pointer" : "not-allowed",
        opacity: enabled ? 1 : 0.5,
    };
}
const panelTogglesGroup = {
    display: "flex",
    alignItems: "center",
    gap: 2,
    paddingRight: 12,
    marginRight: 4,
    borderRight: "1px solid var(--border)",
};
function panelToggleBtn(active) {
    return {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 26,
        background: "transparent",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        border: "1px solid transparent",
        borderRadius: 6,
        cursor: "pointer",
        padding: 0,
    };
}
const gearBtn = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "5px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
};
function tabBtn(active) {
    return {
        background: active ? "var(--bg-hover)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        border: `1px solid ${active ? "var(--border)" : "transparent"}`,
        borderRadius: 6,
        padding: "5px 10px",
        cursor: "pointer",
        fontSize: 12,
    };
}
function statusStyle(s) {
    const color = s === "connected" ? "var(--accent-teal)" : s === "connecting" ? "var(--accent-amber)" : "var(--text-muted)";
    return { color, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 };
}
