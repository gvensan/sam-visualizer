import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { EventBus } from "../bus/eventBus";
import { AnimationRegistry } from "../bus/animations";
import { initialState } from "../bus/types";
import { THEMES, applyThemeVars } from "./theme";
import { Legend } from "./Legend";
import { SCENARIOS } from "../sim/scenarios";
import { runScenario, type SimulationHandle } from "../sim/runner";
import { Canvas } from "./Canvas";
import { Controls } from "./Controls";
import { DetailPanel } from "./DetailPanel";
import { Timeline } from "./Timeline";
import { ConfigPanel } from "./ConfigPanel";
import { NarrationPanel } from "./NarrationPanel";
import { SettingsDialog, DEFAULT_SETTINGS, type VisualSettings } from "./SettingsDialog";
import { runReplay, type ReplayHandle } from "../sim/replay";
import {
  connectBroker,
  type BrokerConfig,
  type BrokerHandle,
  type ConnectionStatus,
} from "../broker/solaceClient";
import type { PositionedNode } from "../layout/zones";

const CFG_KEY = "sam-viz.broker-cfg";
const RENDER_KEY = "sam-viz.render-mode";
const DISCOVERY_KEY = "sam-viz.show-discovery";
const SETTINGS_KEY = "sam-viz.settings";

const loadSettings = (): VisualSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    // Recover Infinity which JSON serialises to null.
    if (parsed.historyCap === null) parsed.historyCap = Number.POSITIVE_INFINITY;
    if (parsed.agentTtlMs === null) parsed.agentTtlMs = Number.POSITIVE_INFINITY;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
};

const persistSettings = (s: VisualSettings) => {
  try {
    // Replace Infinity with null so it round-trips through JSON.
    const safe = {
      ...s,
      historyCap: Number.isFinite(s.historyCap) ? s.historyCap : null,
      agentTtlMs: Number.isFinite(s.agentTtlMs) ? s.agentTtlMs : null,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(safe));
  } catch { /* ignore */ }
};

export type RenderMode = "sequence" | "realtime";

const loadRenderMode = (): RenderMode => {
  try {
    const v = localStorage.getItem(RENDER_KEY);
    if (v === "realtime" || v === "sequence") return v;
  } catch { /* ignore */ }
  return "sequence";
};

const defaultBrokerCfg = (): BrokerConfig => {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) return JSON.parse(raw) as BrokerConfig;
  } catch { /* ignore */ }
  return {
    url: "ws://localhost:8008",
    vpnName: "default",
    userName: "",
    password: "",
    namespace: "default",
    subscribeFeedback: false,
  };
};

export function App() {
  const [settings, setSettings] = useState<VisualSettings>(loadSettings);
  const bus = useMemo(
    () => new EventBus(initialState(), { historyCap: loadSettings().historyCap }),
    [],
  );
  const animations = useMemo(() => new AnimationRegistry(), []);

  // One effect persists settings and pushes them into the bus when changed.
  useEffect(() => {
    bus.setHistoryCap(settings.historyCap);
    persistSettings(settings);
  }, [bus, settings]);

  const theme = THEMES[settings.themeName];
  useEffect(() => {
    applyThemeVars(theme);
  }, [theme]);

  const [renderMode, setRenderMode] = useState<RenderMode>(loadRenderMode);
  useEffect(() => {
    try { localStorage.setItem(RENDER_KEY, renderMode); } catch { /* ignore */ }
  }, [renderMode]);

  const [showDiscovery, setShowDiscovery] = useState<boolean>(() => {
    try { return localStorage.getItem(DISCOVERY_KEY) !== "0"; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(DISCOVERY_KEY, showDiscovery ? "1" : "0"); } catch { /* ignore */ }
  }, [showDiscovery]);

  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<"sim" | "live">("sim");
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  // Speed is exposed to the UI as a position on a Slow ←→ Fast spectrum
  // centered at 0 (Normal). The actual animation multiplier is derived
  // symmetrically so each end is a factor of 2 from normal: −2 → ½×, +2 → 2×.
  const [speedPos, setSpeedPos] = useState(0);
  const speed = positionToSpeed(speedPos);
  // Live-readable speed for the simulator: when the user nudges the slider
  // mid-scenario, the next step picks up the new value rather than the one
  // captured at startSim time.
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const [loop, setLoop] = useState(true);
  const [running, setRunning] = useState(false);
  const simHandleRef = useRef<SimulationHandle | null>(null);

  const [selected, setSelected] = useState<PositionedNode | null>(null);

  const [showConfig, setShowConfig] = useState(false);
  const [brokerCfg, setBrokerCfg] = useState<BrokerConfig>(defaultBrokerCfg);
  const brokerRef = useRef<BrokerHandle | null>(null);
  const [liveStatus, setLiveStatus] = useState<ConnectionStatus>("disconnected");

  const replayRef = useRef<ReplayHandle | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [caughtUp, setCaughtUp] = useState(false);

  /** Live-broker pause/resume state. True freezes canvas animation only;
   * bus.dispatch keeps recording into history so a Resume can catch up. */
  const [paused, setPaused] = useState(false);

  const [spotlightTask, setSpotlightTask] = useState<string | null>(null);
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setSpotlightTask(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    return () => {
      simHandleRef.current?.stop();
      brokerRef.current?.disconnect();
      replayRef.current?.stop();
    };
  }, []);

  const startReplay = () => {
    if (bus.getHistory().length === 0) return;
    replayRef.current?.stop();
    setReplaying(true);
    setCaughtUp(false);
    replayRef.current = runReplay(bus, {
      onCaughtUp: () => setCaughtUp(true),
      onDone: () => {
        setReplaying(false);
        replayRef.current = null;
        // Leave the caught-up badge on briefly so the viewer notices the
        // transition; clear it after a short fade.
        window.setTimeout(() => setCaughtUp(false), 1800);
      },
    });
  };

  const startSim = () => {
    simHandleRef.current?.stop();
    const sc = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
    simHandleRef.current = runScenario(bus, sc, { speed: () => speedRef.current, loop });
    setRunning(true);
  };
  /** STOP in sim mode = "really" stop: halt the scenario timer AND wipe the
   * canvas + timeline so nothing keeps moving or lingering on screen. The
   * canvas's bus.on(null) handler drains the animation queue, so any
   * particle already in flight finishes its d3 transition naturally and
   * then nothing new fires. */
  const stopSim = () => {
    simHandleRef.current?.stop();
    simHandleRef.current = null;
    setRunning(false);
    bus.clear();
    animations.clear();
    setSelected(null);
    setSpotlightTask(null);
  };
  const clearAll = () => {
    // stopSim now does the bus/animations clear too, so this is mostly
    // about tearing down replay-mode state if it happens to be active.
    stopSim();
    replayRef.current?.stop();
    replayRef.current = null;
    setReplaying(false);
    setCaughtUp(false);
  };
  const rewind = () => {
    stopSim();
    startSim();
  };

  const handleConnect = (cfg: BrokerConfig) => {
    setBrokerCfg(cfg);
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
    brokerRef.current?.disconnect();
    setShowConfig(false);
    try {
      const handle = connectBroker(bus, cfg);
      brokerRef.current = handle;
      handle.onStatus((s) => setLiveStatus(s));
    } catch (e: any) {
      console.error(e);
      setLiveStatus("error");
    }
  };

  /** Live Start: disconnect, wipe everything, reconnect with the saved
   * config. If the user has never configured a broker, open the dialog
   * instead so they're not staring at a no-op button. */
  const handleLiveStart = () => {
    if (!brokerCfg.url || !brokerCfg.userName) {
      setShowConfig(true);
      return;
    }
    setPaused(false);
    brokerRef.current?.disconnect();
    brokerRef.current = null;
    setLiveStatus("disconnected");
    setSpotlightTask(null);
    bus.clear();
    animations.clear();
    setSelected(null);
    handleConnect(brokerCfg);
  };

  /** Toggle visual pause. Canvas closes over the prop, so flipping the
   * state here is all that's needed — the bus keeps recording either way. */
  const handleLivePauseResume = () => setPaused((p) => !p);

  /** Live Stop: disconnect and wipe canvas + history. Mirrors clearAll. */
  const handleLiveStop = () => {
    brokerRef.current?.disconnect();
    brokerRef.current = null;
    setLiveStatus("disconnected");
    setPaused(false);
    setSpotlightTask(null);
    bus.clear();
    animations.clear();
    setSelected(null);
  };

  return (
    <div style={shell}>
      <Controls
        mode={mode}
        setMode={(m) => {
          if (m === "sim") {
            brokerRef.current?.disconnect();
            brokerRef.current = null;
            setLiveStatus("disconnected");
          } else {
            stopSim();
          }
          // Always exit pause when leaving live mode — pause has no meaning in sim.
          setPaused(false);
          setMode(m);
        }}
        scenarioId={scenarioId}
        setScenarioId={setScenarioId}
        running={running}
        onStart={startSim}
        onStop={stopSim}
        speed={speed}
        speedPos={speedPos}
        setSpeedPos={setSpeedPos}
        loop={loop}
        setLoop={setLoop}
        onOpenConnect={() => setShowConfig(true)}
        liveStatus={liveStatus}
        renderMode={renderMode}
        setRenderMode={setRenderMode}
        showBottomPanel={settings.showBottomPanel}
        toggleBottomPanel={() =>
          setSettings({ ...settings, showBottomPanel: !settings.showBottomPanel })
        }
        showTimeline={settings.showTimeline}
        toggleTimeline={() =>
          setSettings({ ...settings, showTimeline: !settings.showTimeline })
        }
        paused={paused}
        onLiveStart={handleLiveStart}
        onLivePauseResume={handleLivePauseResume}
        onLiveStop={handleLiveStop}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main style={mainGrid(settings.showTimeline)}>
        <section style={canvasColumn}>
          <div style={canvasArea}>
            <Canvas
              bus={bus}
              animations={animations}
              renderMode={renderMode}
              theme={theme}
              showLabels={settings.showLabels}
              agentTtlMs={settings.agentTtlMs}
              speed={speed}
              paused={paused}
              selectedId={selected?.id ?? null}
              onSelectNode={(n) => setSelected(n)}
              spotlightTask={spotlightTask}
            />
            <DetailPanel bus={bus} selected={selected} onClose={() => setSelected(null)} />
            {settings.showLegend && <Legend />}
            {paused && <PausedBanner />}
          </div>
          {settings.showBottomPanel && (
            <div style={bottomPanelWrap}>
              <NarrationPanel bus={bus} animations={animations} speed={speed} />
            </div>
          )}
        </section>
        {settings.showTimeline && (
          <aside style={timelineWrap}>
            <Timeline
              bus={bus}
              animations={animations}
              onClear={clearAll}
              onRewind={mode === "sim" ? rewind : undefined}
              rewindEnabled={mode === "sim"}
              onReplay={mode === "live" ? startReplay : undefined}
              // Timeline derives the live "has history" predicate itself; App
              // only knows whether the user is in live mode (a non-bus signal).
              replayEnabled={mode === "live"}
              replaying={replaying}
              caughtUp={caughtUp}
              showDiscovery={showDiscovery}
              setShowDiscovery={setShowDiscovery}
              spotlightTask={spotlightTask}
              onSpotlight={setSpotlightTask}
            />
          </aside>
        )}
      </main>

      {showConfig && (
        <ConfigPanel
          initial={brokerCfg}
          onConnect={handleConnect}
          onCancel={() => setShowConfig(false)}
        />
      )}
      {showSettings && (
        <SettingsDialog
          settings={settings}
          onChange={setSettings}
          onReset={() => setSettings({ ...DEFAULT_SETTINGS })}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

/** Baseline multiplier at "Normal" (slider position 0). Set below 1 so the
 * default playback is slow enough to read each animation comfortably; the
 * slider then scales by a factor up to 2× in either direction. */
export const NORMAL_SPEED = 0.5;

/** Map slider position to animation speed multiplier. The slider works in
 * "factor away from Normal": position −2 means a factor of 2 slower than
 * Normal, position +2 means a factor of 2 faster. Concretely:
 *   pos = 0  →  NORMAL_SPEED        (0.5×)
 *   pos = +2 →  NORMAL_SPEED × 2    (1.0×, today's old "Normal")
 *   pos = −2 →  NORMAL_SPEED / 2    (0.25×, 4× longer than the new Normal) */
export function positionToSpeed(pos: number): number {
  if (pos === 0) return NORMAL_SPEED;
  if (pos > 0) return NORMAL_SPEED * (1 + pos / 2);
  return NORMAL_SPEED / (1 + Math.abs(pos) / 2);
}

/** Floating chip in the top-center of the canvas while live rendering is
 * paused. Important UX cue — without it, a paused canvas looks broken. */
function PausedBanner() {
  return (
    <div style={pausedBannerStyle} role="status" aria-live="polite">
      <span style={pausedDot} /> PAUSED · events still recording
    </div>
  );
}

const pausedBannerStyle: preact.JSX.CSSProperties = {
  position: "absolute",
  top: 18,
  left: "50%",
  transform: "translateX(-50%)",
  background: "color-mix(in srgb, var(--bg-panel) 92%, transparent)",
  border: "1px solid var(--accent-amber)",
  color: "var(--accent-amber)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  padding: "5px 12px",
  borderRadius: 999,
  zIndex: 4,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  pointerEvents: "none",
};
const pausedDot: preact.JSX.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--accent-amber)",
  display: "inline-block",
};

const shell: preact.JSX.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  background: "var(--bg-page)",
  color: "var(--text-primary)",
};
const mainGrid = (showTimeline: boolean): preact.JSX.CSSProperties => ({
  flex: 1,
  display: "grid",
  gridTemplateColumns: showTimeline
    ? "minmax(0, 1fr) minmax(280px, 360px)"
    : "minmax(0, 1fr)",
  minHeight: 0,
  minWidth: 0,
  gap: 12,
  padding: 12,
  transition: "grid-template-columns 200ms ease-out",
});
// Canvas section is a flex column so the SVG occupies the remaining height
// and the bottom narration panel takes a fixed slice.
const canvasColumn: preact.JSX.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  background: "var(--bg-canvas)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  overflow: "hidden",
  minHeight: 0,
};
const canvasArea: preact.JSX.CSSProperties = {
  flex: 1,
  position: "relative",
  minHeight: 0,
};
const bottomPanelWrap: preact.JSX.CSSProperties = {
  height: 200,
  borderTop: "1px solid var(--border)",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};
const timelineWrap: preact.JSX.CSSProperties = {
  display: "flex",
  minHeight: 0,
  minWidth: 0,
};
