import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
/**
 * Small persistent guide rendered inside the canvas explaining the visual
 * encoding so viewers don't have to guess what solid vs dashed means.
 */
export function Legend() {
    return (_jsxs("aside", { style: panel, "aria-label": "Edge legend", children: [_jsx("div", { style: title, children: "LEGEND" }), _jsxs(Row, { children: [_jsx(Line, { dashed: false, thickness: 2.5 }), _jsx(Label, { children: "Request / Response" })] }), _jsxs(Row, { children: [_jsx(Line, { dashed: true, thickness: 1.8 }), _jsx(Label, { children: "Status updates (in flight)" })] }), _jsx("div", { style: hint, children: "Each task gets its own color \u2014 sub-tasks inherit the parent's hue." })] }));
}
function Row({ children }) {
    return _jsx("div", { style: { display: "flex", alignItems: "center", gap: 10, marginTop: 4 }, children: children });
}
function Label({ children }) {
    return _jsx("span", { style: { color: "var(--text-secondary)" }, children: children });
}
function Line({ dashed, thickness }) {
    return (_jsx("svg", { width: 52, height: 10, style: { flexShrink: 0, color: "var(--text-secondary)" }, children: _jsx("line", { x1: 1, y1: 5, x2: 51, y2: 5, style: {
                stroke: "currentColor",
                strokeWidth: thickness,
                strokeLinecap: dashed ? "butt" : "round",
                strokeDasharray: dashed ? "5 4" : "none",
            } }) }));
}
const panel = {
    position: "absolute",
    left: 14,
    bottom: 14,
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "10px 12px",
    fontFamily: "system-ui, sans-serif",
    fontSize: 12,
    color: "var(--text-muted)",
    boxShadow: "var(--shadow)",
    pointerEvents: "none",
    maxWidth: 280,
};
const title = {
    fontSize: 10,
    letterSpacing: 2,
    color: "var(--text-muted)",
    marginBottom: 4,
};
const hint = {
    marginTop: 8,
    fontSize: 11,
    color: "var(--text-muted)",
    lineHeight: 1.4,
};
