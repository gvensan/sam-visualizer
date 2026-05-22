import { SCENARIOS } from "../sim/scenarios";
import type { RenderMode } from "./App";

interface Props {
  mode: "sim" | "live";
  setMode: (m: "sim" | "live") => void;
  scenarioId: string;
  setScenarioId: (id: string) => void;
  running: boolean;
  onStart: () => void;
  onStop: () => void;
  /** Derived animation multiplier (read-only here — used for the display chip). */
  speed: number;
  /** Slider position in [-2, +2] step 0.25. 0 = Normal. */
  speedPos: number;
  setSpeedPos: (n: number) => void;
  loop: boolean;
  setLoop: (b: boolean) => void;
  onOpenConnect: () => void;
  liveStatus: string;
  renderMode: RenderMode;
  setRenderMode: (m: RenderMode) => void;
  showBottomPanel: boolean;
  toggleBottomPanel: () => void;
  showTimeline: boolean;
  toggleTimeline: () => void;
  /** Live-broker playback state. Paused only meaningful when connected. */
  paused: boolean;
  onLiveStart: () => void;
  onLivePauseResume: () => void;
  onLiveStop: () => void;
  onOpenSettings: () => void;
}

export function Controls(p: Props) {
  return (
    <header style={bar}>
      <span style={{ fontWeight: 700, letterSpacing: 1 }}>SAM VISUALIZER</span>

      <div style={group}>
        <button
          style={tabBtn(p.mode === "sim")}
          onClick={() => p.setMode("sim")}
        >
          Simulation
        </button>
        <button
          style={tabBtn(p.mode === "live")}
          onClick={() => p.setMode("live")}
        >
          Live broker
        </button>
      </div>

      {p.mode === "sim" ? (
        <div style={group}>
          <select
            value={p.scenarioId}
            onChange={(e) => p.setScenarioId((e.target as HTMLSelectElement).value)}
            style={select}
            disabled={p.running}
          >
            {SCENARIOS.map((s) => (
              <option value={s.id} key={s.id}>{s.name}</option>
            ))}
          </select>
          <label style={lbl}>
            <input
              type="checkbox"
              checked={p.loop}
              onChange={(e) => p.setLoop((e.target as HTMLInputElement).checked)}
              style={{ marginRight: 4 }}
            />
            Loop
          </label>
          {p.running ? (
            <button style={primary} onClick={p.onStop}>Stop</button>
          ) : (
            <button style={primary} onClick={p.onStart}>Play</button>
          )}
        </div>
      ) : (
        <div style={group}>
          <span style={statusStyle(p.liveStatus)}>{p.liveStatus}</span>
          <button style={primary} onClick={p.onOpenConnect}>Configure broker</button>

          {/* Playback controls — disabled until at least one successful
              connection has been made (Configure broker primes the saved
              config). Pause toggles to Resume while paused. */}
          <button
            style={iconCtrlBtn(p.liveStatus === "connected" || p.liveStatus === "connecting" || p.paused)}
            onClick={p.onLiveStart}
            disabled={p.liveStatus === "connecting"}
            title="Start fresh: disconnect, clear, reconnect with the saved broker config"
            aria-label="Start"
          >
            <PlayIcon />
          </button>
          <button
            style={iconCtrlBtn(p.liveStatus === "connected")}
            onClick={p.onLivePauseResume}
            disabled={p.liveStatus !== "connected"}
            title={p.paused ? "Resume — replay missed events, then live" : "Pause visual rendering (events still recorded)"}
            aria-label={p.paused ? "Resume" : "Pause"}
            aria-pressed={p.paused}
          >
            {p.paused ? <PlayIcon /> : <PauseIcon />}
          </button>
          <button
            style={iconCtrlBtn(p.liveStatus === "connected" || p.paused)}
            onClick={p.onLiveStop}
            disabled={p.liveStatus !== "connected" && !p.paused}
            title="Stop: disconnect and clear the canvas"
            aria-label="Stop"
          >
            <StopIcon />
          </button>
        </div>
      )}

      <div style={spacer} />

      {/* Speed spectrum: Slow ←→ Normal ←→ Fast. The current factor floats
          above the slider thumb so you don't have to look anywhere else to
          see the live value. */}
      <div style={speedGroup} title="Slow the visualization down to read each interaction, or speed it up.">
        <span style={speedSideLabel}>Slow</span>
        <div style={speedSliderWrap}>
          <div style={speedTrackWrap}>
            <span
              style={{
                ...speedFloatLabel,
                // Map slider position [-2, +2] to a 0..100% offset so the
                // bubble sits centred over the current thumb position.
                left: `${((p.speedPos - -2) / 4) * 100}%`,
              }}
            >
              {formatSpeed(p.speedPos, p.speed)}
            </span>
            <input
              type="range"
              min={-2}
              max={2}
              step={0.25}
              value={p.speedPos}
              onInput={(e) => p.setSpeedPos(Number((e.target as HTMLInputElement).value))}
              list="speed-ticks"
              style={speedSlider}
            />
            <datalist id="speed-ticks">
              <option value={-2} />
              <option value={-1} />
              <option value={0} />
              <option value={1} />
              <option value={2} />
            </datalist>
          </div>
          <div style={speedAnchors}>
            <span>−2</span>
            <span style={speedNormalTick}>Normal</span>
            <span>+2</span>
          </div>
        </div>
        <span style={speedSideLabel}>Fast</span>
      </div>

      <div style={group} title="How animations on the canvas are paced">
        <span style={lblMuted}>Render</span>
        <button
          style={tabBtn(p.renderMode === "sequence")}
          onClick={() => p.setRenderMode("sequence")}
          title="Play one animation at a time so each interaction is readable"
        >
          Sequence
        </button>
        <button
          style={tabBtn(p.renderMode === "realtime")}
          onClick={() => p.setRenderMode("realtime")}
          title="Animate every event the instant it arrives (may overlap)"
        >
          Real-time
        </button>
      </div>

      <div style={panelTogglesGroup}>
        <button
          style={panelToggleBtn(p.showBottomPanel)}
          onClick={p.toggleBottomPanel}
          title={p.showBottomPanel ? "Hide bottom narration panel" : "Show bottom narration panel"}
          aria-label="Toggle bottom panel"
          aria-pressed={p.showBottomPanel}
        >
          <BottomPanelIcon active={p.showBottomPanel} />
        </button>
        <button
          style={panelToggleBtn(p.showTimeline)}
          onClick={p.toggleTimeline}
          title={p.showTimeline ? "Hide right timeline" : "Show right timeline"}
          aria-label="Toggle right timeline"
          aria-pressed={p.showTimeline}
        >
          <RightPanelIcon active={p.showTimeline} />
        </button>
      </div>

      <div style={group}>
        <button
          style={gearBtn}
          onClick={p.onOpenSettings}
          title="Settings — theme, labels, capture, expiry"
          aria-label="Open settings"
        >
          <Gear /> Settings
        </button>
      </div>
    </header>
  );
}

/** Show the relative factor instead of an absolute multiplier — that's how
 * the user thinks about Slow/Normal/Fast. e.g. "Slow ×2", "Fast ×1.5". */
function formatSpeed(pos: number, _multiplier: number): string {
  if (pos === 0) return "Normal";
  const factor = 1 + Math.abs(pos) / 2;
  const f = Math.round(factor * 100) / 100;
  const str = f % 1 === 0 ? `${f}` : f.toFixed(2).replace(/0$/, "");
  return pos > 0 ? `Fast ×${str}` : `Slow ×${str}`;
}

function PlayIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4 3.5v9l8-4.5-8-4.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="4" y="3" width="3" height="10" rx="0.5" />
      <rect x="9" y="3" width="3" height="10" rx="0.5" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="1" />
    </svg>
  );
}

function BottomPanelIcon({ active }: { active: boolean }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect
        x="2.5"
        y="9.5"
        width="11"
        height="3.5"
        rx="0.6"
        fill={active ? "currentColor" : "transparent"}
        opacity={active ? 0.9 : 0}
      />
      <line x1="2" y1="9.5" x2="14" y2="9.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function RightPanelIcon({ active }: { active: boolean }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect
        x="10"
        y="3"
        width="3.5"
        height="10"
        rx="0.6"
        fill={active ? "currentColor" : "transparent"}
        opacity={active ? 0.9 : 0}
      />
      <line x1="10" y1="2.5" x2="10" y2="13.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function Gear() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const bar: preact.JSX.CSSProperties = {
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

const group: preact.JSX.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const lbl: preact.JSX.CSSProperties = { color: "var(--text-secondary)", fontSize: 12, display: "inline-flex", alignItems: "center" };
const lblMuted: preact.JSX.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  letterSpacing: 1,
  textTransform: "uppercase",
};
const spacer: preact.JSX.CSSProperties = { flex: 1 };
const select: preact.JSX.CSSProperties = {
  background: "var(--bg-input)",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "4px 6px",
};
const primary: preact.JSX.CSSProperties = {
  background: "var(--accent-teal)",
  color: "#031312",
  border: "none",
  borderRadius: 6,
  padding: "6px 12px",
  fontWeight: 600,
  cursor: "pointer",
};
const speedGroup: preact.JSX.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "var(--text-secondary)",
  fontSize: 12,
};
const speedSideLabel: preact.JSX.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "var(--text-muted)",
};
const speedSliderWrap: preact.JSX.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  width: 180,
};
const speedSlider: preact.JSX.CSSProperties = {
  width: "100%",
  margin: 0,
  accentColor: "var(--accent-teal)",
};
const speedAnchors: preact.JSX.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 9,
  color: "var(--text-dim)",
  marginTop: 2,
  letterSpacing: 0.5,
};
const speedNormalTick: preact.JSX.CSSProperties = {
  color: "var(--text-muted)",
  fontWeight: 600,
};
const speedTrackWrap: preact.JSX.CSSProperties = {
  position: "relative",
  paddingTop: 18,
};
const speedFloatLabel: preact.JSX.CSSProperties = {
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
function iconCtrlBtn(enabled: boolean): preact.JSX.CSSProperties {
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
const panelTogglesGroup: preact.JSX.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 2,
  paddingRight: 12,
  marginRight: 4,
  borderRight: "1px solid var(--border)",
};
function panelToggleBtn(active: boolean): preact.JSX.CSSProperties {
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
const gearBtn: preact.JSX.CSSProperties = {
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
function tabBtn(active: boolean): preact.JSX.CSSProperties {
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
function statusStyle(s: string): preact.JSX.CSSProperties {
  const color = s === "connected" ? "var(--accent-teal)" : s === "connecting" ? "var(--accent-amber)" : "var(--text-muted)";
  return { color, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 };
}
