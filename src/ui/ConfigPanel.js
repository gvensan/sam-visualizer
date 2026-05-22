import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useState } from "preact/hooks";
import { DEFAULT_BROKER_CONFIG } from "../broker/solaceClient";
export function ConfigPanel({ initial, onConnect, onCancel }) {
    const [cfg, setCfg] = useState(initial);
    const upd = (k) => (e) => {
        const t = e.target;
        const v = t.type === "checkbox" ? t.checked : t.value;
        setCfg({ ...cfg, [k]: v });
    };
    // When the page itself is served over HTTPS (e.g. GitHub Pages) the
    // browser blocks plain `ws://` connections under the mixed-content rule.
    // Flag this up front so users don't waste time chasing a silent failure.
    const pageIsHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const urlIsPlainWs = cfg.url.trim().toLowerCase().startsWith("ws://");
    const mixedContentWarning = pageIsHttps && urlIsPlainWs;
    return (_jsx("div", { style: overlay, onClick: onCancel, children: _jsxs("div", { style: modal, onClick: (e) => e.stopPropagation(), children: [_jsx("div", { style: header, children: "Connect to Solace broker" }), _jsxs("div", { style: body, children: [_jsxs(Field, { label: "WebSocket URL", hint: "ws://localhost:8008 or wss://broker.example.com:8443", children: [_jsx("input", { style: input, value: cfg.url, onInput: upd("url"), placeholder: "wss://broker:8443" }), mixedContentWarning && (_jsxs("div", { style: warning, children: ["\u26A0 This page is served over ", _jsx("code", { children: "https://" }), ", but the URL is", _jsx("code", { children: " ws://" }), ". The browser will block the connection. Use a", _jsx("code", { children: " wss://" }), " (TLS) broker endpoint, or run the visualizer locally with ", _jsx("code", { children: "npm run dev" }), "."] }))] }), _jsx(Field, { label: "Message VPN", children: _jsx("input", { style: input, value: cfg.vpnName, onInput: upd("vpnName"), placeholder: "default" }) }), _jsx(Field, { label: "Username", children: _jsx("input", { style: input, value: cfg.userName, onInput: upd("userName") }) }), _jsx(Field, { label: "Password", children: _jsx("input", { style: input, type: "password", value: cfg.password, onInput: upd("password") }) }), _jsx(Field, { label: "SAM namespace", hint: "Maps to {namespace}/a2a/v1/>", children: _jsx("input", { style: input, value: cfg.namespace, onInput: upd("namespace"), placeholder: "my-sam-project" }) })] }), _jsxs("div", { style: footer, children: [_jsx("button", { style: ghost, onClick: () => setCfg({ ...DEFAULT_BROKER_CONFIG }), title: "Restore the default broker URL, VPN, and namespace", children: "Reset" }), _jsx("div", { style: { flex: 1 } }), _jsx("button", { style: ghost, onClick: onCancel, children: "Cancel" }), _jsx("button", { style: primary, onClick: () => onConnect(cfg), children: "Connect" })] })] }) }));
}
function Field({ label, hint, children }) {
    return (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("div", { style: { fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }, children: label }), children, hint && _jsx("div", { style: { fontSize: 11, color: "var(--text-dim)", marginTop: 4 }, children: hint })] }));
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
    width: 420,
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--text-primary)",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "var(--shadow)",
};
const header = {
    padding: "14px 16px",
    borderBottom: "1px solid var(--border)",
    fontWeight: 600,
};
const body = { padding: 16 };
const footer = {
    padding: 12,
    borderTop: "1px solid var(--border)",
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
};
const input = {
    width: "100%",
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 13,
    boxSizing: "border-box",
};
const primary = {
    background: "var(--accent-teal)",
    color: "#031312",
    border: "none",
    borderRadius: 6,
    padding: "6px 14px",
    fontWeight: 600,
    cursor: "pointer",
};
const warning = {
    marginTop: 8,
    padding: "6px 10px",
    background: "color-mix(in srgb, var(--accent-amber) 14%, transparent)",
    border: "1px solid var(--accent-amber)",
    borderRadius: 6,
    color: "var(--accent-amber)",
    fontSize: 11,
    lineHeight: 1.5,
};
const ghost = {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
};
