import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
export const DEFAULT_SETTINGS = {
    themeName: "dark",
    showLabels: true,
    showLegend: true,
    showBottomPanel: true,
    showTimeline: true,
    historyCap: 5000,
    agentTtlMs: 90_000,
};
const CAP_PRESETS = [
    { value: 1000, label: "1k events" },
    { value: 5000, label: "5k events" },
    { value: 10000, label: "10k events" },
    { value: Number.POSITIVE_INFINITY, label: "Unlimited" },
];
const TTL_PRESETS = [
    { value: 30_000, label: "30 seconds" },
    { value: 60_000, label: "1 minute" },
    { value: 90_000, label: "90 seconds" },
    { value: 5 * 60_000, label: "5 minutes" },
    { value: 10 * 60_000, label: "10 minutes" },
    { value: Number.POSITIVE_INFINITY, label: "Never expire" },
];
export function SettingsDialog({ settings, onChange, onReset, onClose }) {
    const set = (key, value) => onChange({ ...settings, [key]: value });
    return (_jsx("div", { style: overlay, onClick: onClose, children: _jsxs("div", { style: modal, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { style: header, children: [_jsx("span", { children: "Settings" }), _jsx("button", { style: iconBtn, onClick: onClose, title: "Close", "aria-label": "Close", children: "\u2715" })] }), _jsxs("div", { style: body, children: [_jsxs(Section, { title: "Appearance", children: [_jsx(Field, { label: "Theme", hint: "Dark works best for projection; light for documentation.", children: _jsx(Segmented, { value: settings.themeName, options: [
                                            { value: "dark", label: "Dark" },
                                            { value: "light", label: "Light" },
                                        ], onChange: (v) => set("themeName", v) }) }), _jsx(Field, { label: "Canvas legend", hint: "Inline guide explaining solid vs dashed lines.", children: _jsx(Toggle, { checked: settings.showLegend, onChange: (v) => set("showLegend", v), onLabel: "Visible", offLabel: "Hidden" }) })] }), _jsxs(Section, { title: "Annotations", children: [_jsx(Field, { label: "Task labels on edges", hint: "Show short task ids that ride along each particle.", children: _jsx(Toggle, { checked: settings.showLabels, onChange: (v) => set("showLabels", v), onLabel: "On", offLabel: "Off" }) }), _jsx(Field, { label: "Bottom narration panel", hint: "Sticky panel under the canvas with stacked task-text cards. Toggleable from the header too.", children: _jsx(Toggle, { checked: settings.showBottomPanel, onChange: (v) => set("showBottomPanel", v), onLabel: "On", offLabel: "Off" }) }), _jsx(Field, { label: "Event timeline", hint: "Right-side log of every event the broker delivers. Toggleable from the header too.", children: _jsx(Toggle, { checked: settings.showTimeline, onChange: (v) => set("showTimeline", v), onLabel: "On", offLabel: "Off" }) })] }), _jsxs(Section, { title: "Data retention", children: [_jsx(Field, { label: "Event capture", hint: "Maximum events kept in memory. Oldest are pruned when full; replay reads from this buffer.", children: _jsx(Select, { value: settings.historyCap, options: CAP_PRESETS, onChange: (v) => set("historyCap", v) }) }), _jsx(Field, { label: "Agent session expiry", hint: "An agent dims out if no AgentCard heartbeat lands within this window.", children: _jsx(Select, { value: settings.agentTtlMs, options: TTL_PRESETS, onChange: (v) => set("agentTtlMs", v) }) })] })] }), _jsxs("div", { style: footer, children: [_jsx("button", { style: ghost, onClick: onReset, title: "Restore default values", children: "Reset to defaults" }), _jsx("div", { style: { flex: 1 } }), _jsx("button", { style: primary, onClick: onClose, children: "Done" })] })] }) }));
}
function Section({ title, children }) {
    return (_jsxs("div", { style: section, children: [_jsx("div", { style: sectionTitle, children: title }), children] }));
}
function Field({ label, hint, children, }) {
    return (_jsxs("div", { style: field, children: [_jsxs("div", { style: fieldRow, children: [_jsx("div", { style: fieldLabel, children: label }), _jsx("div", { style: fieldControl, children: children })] }), hint && _jsx("div", { style: fieldHint, children: hint })] }));
}
function Segmented({ value, options, onChange, }) {
    return (_jsx("div", { style: segmentedWrap, children: options.map((o) => (_jsx("button", { type: "button", style: segmentedBtn(o.value === value), onClick: () => onChange(o.value), children: o.label }, o.value))) }));
}
function Toggle({ checked, onChange, onLabel, offLabel, }) {
    return (_jsx(Segmented, { value: checked ? "on" : "off", options: [
            { value: "on", label: onLabel },
            { value: "off", label: offLabel },
        ], onChange: (v) => onChange(v === "on") }));
}
function Select({ value, options, onChange, }) {
    return (_jsx("select", { style: selectStyle, value: String(value), onChange: (e) => {
            const raw = e.target.value;
            const match = options.find((o) => String(o.value) === raw);
            if (match)
                onChange(match.value);
        }, children: options.map((o) => (_jsx("option", { value: String(o.value), children: o.label }, String(o.value)))) }));
}
const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
};
const modal = {
    width: 480,
    maxWidth: "calc(100vw - 32px)",
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--text-primary)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxShadow: "var(--shadow)",
};
const header = {
    padding: "14px 16px",
    borderBottom: "1px solid var(--border)",
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: 0.5,
    display: "flex",
    alignItems: "center",
};
const iconBtn = {
    marginLeft: "auto",
    background: "transparent",
    color: "var(--text-muted)",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    padding: 4,
    lineHeight: 1,
};
const body = {
    padding: "8px 16px 4px",
    maxHeight: "70vh",
    overflowY: "auto",
};
const section = {
    padding: "12px 0",
    borderBottom: "1px solid var(--border-subtle)",
};
const sectionTitle = {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: 10,
};
const field = {
    marginBottom: 12,
};
const fieldRow = {
    display: "flex",
    alignItems: "center",
    gap: 12,
};
const fieldLabel = {
    flex: 1,
    fontSize: 13,
    color: "var(--text-primary)",
};
const fieldControl = {
    flexShrink: 0,
};
const fieldHint = {
    fontSize: 11,
    color: "var(--text-muted)",
    marginTop: 4,
    lineHeight: 1.4,
};
const segmentedWrap = {
    display: "inline-flex",
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: 2,
    gap: 2,
};
function segmentedBtn(active) {
    return {
        background: active ? "var(--bg-hover)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        border: "none",
        borderRadius: 6,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontFamily: "inherit",
    };
}
const selectStyle = {
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 12,
    fontFamily: "inherit",
    minWidth: 140,
};
const footer = {
    padding: 12,
    borderTop: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    gap: 8,
};
const primary = {
    background: "var(--accent-teal)",
    color: "#031312",
    border: "none",
    borderRadius: 6,
    padding: "6px 16px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
};
const ghost = {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 12,
};
