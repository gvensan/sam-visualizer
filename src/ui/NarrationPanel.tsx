import { useEffect, useRef, useState } from "preact/hooks";
import type { EventBus } from "../bus/eventBus";
import type { AnimationRegistry } from "../bus/animations";
import type { A2AEvent, A2AEventKind, MeshState } from "../bus/types";
import { shortTaskId } from "../state/colors";
import { extractMessageText } from "../parse/payload";

interface Props {
  bus: EventBus;
  animations: AnimationRegistry;
  /** Speed slider value. Used to compute each card's visible TTL so the
   * countdown bar drains in lockstep with the canvas particle. */
  speed: number;
}

const MAX_CARDS = 4;
/** Floor on per-card duration so the narration never flashes by faster
 * than a human can register that something happened. */
const MIN_DURATION_MS = 250;

const KIND_LABEL: Record<A2AEvent["kind"], string> = {
  discovery: "Discovery",
  request: "Request",
  status: "Status",
  response: "Response",
  "delegation-status": "Sub-status",
  "delegation-response": "Sub-response",
};

const KIND_COLOR: Record<A2AEvent["kind"], string> = {
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
function baseDurationFor(kind: A2AEventKind): number {
  switch (kind) {
    case "request":              return 900;
    case "status":               return 700;
    case "response":             return 900;
    case "delegation-status":    return 800;
    case "delegation-response":  return 800;
    case "discovery":            return 1000;
  }
}

interface NarrationCard {
  id: number;
  event: A2AEvent;
  /** Animation duration captured when the card first appears. Drives the
   * CSS TTL bar so the visual countdown ends at the same moment as the
   * canvas particle lands. */
  durationMs: number;
  expanded: boolean;
  showRaw: boolean;
}

function findEventBySeq(history: readonly A2AEvent[], seq: number): A2AEvent | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].seq === seq) return history[i];
  }
  return undefined;
}

function resolveSource(e: A2AEvent, state: MeshState): string {
  if (e.publisher && !GENERIC_PUBLISHERS.has(e.publisher)) return e.publisher;
  const tid = e.taskId ?? e.subTaskId;
  if (tid) {
    const task = state.tasks.get(tid);
    if (task) {
      if (task.targetAgent) return task.targetAgent;
      if (task.sourceAgent) return task.sourceAgent;
      if (task.sourceGateway) return task.sourceGateway;
    }
  }
  return e.publisher || "unknown";
}

function routingFor(e: A2AEvent, state: MeshState): { from: string; to: string; taskId?: string } {
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

function prettyPayload(p: unknown): string {
  if (p == null) return "";
  if (typeof p === "string") return p;
  try { return JSON.stringify(p, null, 2); } catch { return String(p); }
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function NarrationPanel({ bus, animations, speed }: Props) {
  const [cards, setCards] = useState<NarrationCard[]>([]);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  // User-dismissed seqs we should not re-add even if their animation is
  // still active — cleaned up when the animation ends.
  const dismissedRef = useRef<Set<number>>(new Set());

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
        const additions: NarrationCard[] = [];
        for (const seq of active) {
          if (haveIds.has(seq)) continue;
          if (dismissedRef.current.has(seq)) continue;
          const ev = findEventBySeq(history, seq);
          if (!ev || ev.kind === "discovery") continue;
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
        if (!active.has(id)) dismissedRef.current.delete(id);
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

  const dismiss = (id: number) => {
    dismissedRef.current.add(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const setCardFlag = <K extends keyof NarrationCard>(id: number, key: K, value: NarrationCard[K]) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  };

  const state = bus.getState();

  return (
    <div style={panelOuter}>
      {cards.length === 0 ? (
        <div style={empty}>Waiting for events…</div>
      ) : (
        <div style={stack}>
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              state={state}
              onDismiss={() => dismiss(card.id)}
              onToggleExpanded={() => setCardFlag(card.id, "expanded", !card.expanded)}
              onToggleRaw={() => setCardFlag(card.id, "showRaw", !card.showRaw)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  card: NarrationCard;
  state: MeshState;
  onDismiss: () => void;
  onToggleExpanded: () => void;
  onToggleRaw: () => void;
}

function Card({ card, state, onDismiss, onToggleExpanded, onToggleRaw }: CardProps) {
  const { event, durationMs } = card;
  const color = KIND_COLOR[event.kind];
  const route = routingFor(event, state);
  const messageText = extractMessageText(event.payload);

  return (
    <div
      style={{ ...cardStyle, borderColor: color + "55" }}
      className="narration-card-enter"
    >
      <div style={cardTopRow}>
        <span style={{ ...kindChip, color, borderColor: color + "55" }}>
          {KIND_LABEL[event.kind]}
        </span>
        <span style={topic} title={event.topic}>{event.topic}</span>
        <span style={timeText}>{fmtTime(event.ts)}</span>
        <button style={iconBtn} onClick={onDismiss} title="Dismiss" aria-label="Dismiss">
          ✕
        </button>
      </div>

      <div style={routingRow}>
        <span style={nodeChip}>{route.from}</span>
        <span style={arrow}>→</span>
        <span style={hop}>broker</span>
        <span style={arrow}>→</span>
        <span style={nodeChip}>{route.to}</span>
        {route.taskId && (
          <span style={taskPill} title={`Task ${route.taskId}`}>
            {shortTaskId(route.taskId)}
          </span>
        )}
      </div>

      {messageText ? (
        <div
          style={{
            ...quote,
            borderLeftColor: color,
            maxHeight: card.expanded ? 200 : 44,
            cursor:
              messageText.split("\n").length > 2 || messageText.length > 140
                ? "pointer"
                : "default",
          }}
          onClick={() => {
            if (messageText.length > 140 || messageText.includes("\n")) onToggleExpanded();
          }}
          title={card.expanded ? "Click to collapse" : "Click to expand"}
        >
          <span style={quoteMark}>“</span>
          <div style={card.expanded ? quoteBodyExpanded : quoteBodyCollapsed}>{messageText}</div>
        </div>
      ) : (
        <div style={noText}>No readable text in this event.</div>
      )}

      <div style={cardFooter}>
        <button style={linkBtn} onClick={onToggleRaw}>
          {card.showRaw ? "Hide raw payload" : "View raw payload"}
        </button>
        {/* TTL bar drains over the card's animation duration so it tracks
            the canvas particle exactly. The card itself is removed by the
            animations.end callback so the visual completion coincides with
            DOM removal. */}
        <div style={ttlTrack}>
          <div
            className="narration-ttl-fill"
            style={{ background: color, animationDuration: `${durationMs}ms` }}
          />
        </div>
      </div>

      {card.showRaw && <pre style={rawBox}>{prettyPayload(event.payload)}</pre>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const panelOuter: preact.JSX.CSSProperties = {
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

const stack: preact.JSX.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "8px 10px",
  overflowY: "auto",
  minHeight: 0,
};

const empty: preact.JSX.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-muted)",
  fontStyle: "italic",
  fontSize: 12,
};

const cardStyle: preact.JSX.CSSProperties = {
  position: "relative",
  background: "color-mix(in srgb, var(--bg-hover) 30%, transparent)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px 4px",
};

const cardTopRow: preact.JSX.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 5,
};

const kindChip: preact.JSX.CSSProperties = {
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

const topic: preact.JSX.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 10.5,
  color: "var(--text-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  minWidth: 0,
};

const timeText: preact.JSX.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 10,
  color: "var(--text-dim)",
  flexShrink: 0,
};

const iconBtn: preact.JSX.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 12,
  lineHeight: 1,
  padding: "0 4px",
  borderRadius: 4,
};

const routingRow: preact.JSX.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 5,
  fontSize: 11,
  flexWrap: "wrap",
};

const nodeChip: preact.JSX.CSSProperties = {
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

const hop: preact.JSX.CSSProperties = {
  color: "var(--text-muted)",
  fontStyle: "italic",
  fontSize: 10.5,
};

const arrow: preact.JSX.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 12,
};

const taskPill: preact.JSX.CSSProperties = {
  marginLeft: "auto",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 9.5,
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  padding: "0 5px",
  borderRadius: 999,
};

const quote: preact.JSX.CSSProperties = {
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

const quoteMark: preact.JSX.CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 18,
  lineHeight: 1,
  color: "var(--text-muted)",
  marginTop: -2,
  flexShrink: 0,
};

const quoteBodyCollapsed: preact.JSX.CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flex: 1,
  minWidth: 0,
};

const quoteBodyExpanded: preact.JSX.CSSProperties = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  flex: 1,
  minWidth: 0,
};

const noText: preact.JSX.CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  fontStyle: "italic",
  padding: "3px 0",
};

const cardFooter: preact.JSX.CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginTop: 5,
  gap: 8,
};

const linkBtn: preact.JSX.CSSProperties = {
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

const ttlTrack: preact.JSX.CSSProperties = {
  flex: 1,
  height: 2,
  background: "var(--border-subtle)",
  borderRadius: 1,
  overflow: "hidden",
  marginLeft: 8,
};

const rawBox: preact.JSX.CSSProperties = {
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
