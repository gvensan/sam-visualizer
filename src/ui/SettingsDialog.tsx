import type { ThemeName } from "./theme";

export interface VisualSettings {
  themeName: ThemeName;
  showLabels: boolean;
  showLegend: boolean;
  showBottomPanel: boolean;
  showTimeline: boolean;
  historyCap: number;
  agentTtlMs: number;
}

export const DEFAULT_SETTINGS: VisualSettings = {
  themeName: "dark",
  showLabels: true,
  showLegend: true,
  showBottomPanel: true,
  showTimeline: true,
  historyCap: 5000,
  agentTtlMs: 90_000,
};

interface Props {
  settings: VisualSettings;
  onChange: (next: VisualSettings) => void;
  onReset: () => void;
  onClose: () => void;
}

const CAP_PRESETS: Array<{ value: number; label: string }> = [
  { value: 1000, label: "1k events" },
  { value: 5000, label: "5k events" },
  { value: 10000, label: "10k events" },
  { value: Number.POSITIVE_INFINITY, label: "Unlimited" },
];

const TTL_PRESETS: Array<{ value: number; label: string }> = [
  { value: 30_000, label: "30 seconds" },
  { value: 60_000, label: "1 minute" },
  { value: 90_000, label: "90 seconds" },
  { value: 5 * 60_000, label: "5 minutes" },
  { value: 10 * 60_000, label: "10 minutes" },
  { value: Number.POSITIVE_INFINITY, label: "Never expire" },
];

export function SettingsDialog({ settings, onChange, onReset, onClose }: Props) {
  const set = <K extends keyof VisualSettings>(key: K, value: VisualSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <span>Settings</span>
          <button style={iconBtn} onClick={onClose} title="Close" aria-label="Close">
            ✕
          </button>
        </div>

        <div style={body}>
          <Section title="Appearance">
            <Field label="Theme" hint="Dark works best for projection; light for documentation.">
              <Segmented
                value={settings.themeName}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                ]}
                onChange={(v) => set("themeName", v as ThemeName)}
              />
            </Field>

            <Field label="Canvas legend" hint="Inline guide explaining solid vs dashed lines.">
              <Toggle
                checked={settings.showLegend}
                onChange={(v) => set("showLegend", v)}
                onLabel="Visible"
                offLabel="Hidden"
              />
            </Field>
          </Section>

          <Section title="Annotations">
            <Field label="Task labels on edges" hint="Show short task ids that ride along each particle.">
              <Toggle
                checked={settings.showLabels}
                onChange={(v) => set("showLabels", v)}
                onLabel="On"
                offLabel="Off"
              />
            </Field>

            <Field
              label="Bottom narration panel"
              hint="Sticky panel under the canvas with stacked task-text cards. Toggleable from the header too."
            >
              <Toggle
                checked={settings.showBottomPanel}
                onChange={(v) => set("showBottomPanel", v)}
                onLabel="On"
                offLabel="Off"
              />
            </Field>

            <Field
              label="Event timeline"
              hint="Right-side log of every event the broker delivers. Toggleable from the header too."
            >
              <Toggle
                checked={settings.showTimeline}
                onChange={(v) => set("showTimeline", v)}
                onLabel="On"
                offLabel="Off"
              />
            </Field>
          </Section>

          <Section title="Data retention">
            <Field
              label="Event capture"
              hint="Maximum events kept in memory. Oldest are pruned when full; replay reads from this buffer."
            >
              <Select<number>
                value={settings.historyCap}
                options={CAP_PRESETS}
                onChange={(v) => set("historyCap", v)}
              />
            </Field>

            <Field
              label="Agent session expiry"
              hint="An agent dims out if no AgentCard heartbeat lands within this window."
            >
              <Select<number>
                value={settings.agentTtlMs}
                options={TTL_PRESETS}
                onChange={(v) => set("agentTtlMs", v)}
              />
            </Field>
          </Section>
        </div>

        <div style={footer}>
          <button style={ghost} onClick={onReset} title="Restore default values">
            Reset to defaults
          </button>
          <div style={{ flex: 1 }} />
          <button style={primary} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <div style={section}>
      <div style={sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: preact.ComponentChildren;
}) {
  return (
    <div style={field}>
      <div style={fieldRow}>
        <div style={fieldLabel}>{label}</div>
        <div style={fieldControl}>{children}</div>
      </div>
      {hint && <div style={fieldHint}>{hint}</div>}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div style={segmentedWrap}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          style={segmentedBtn(o.value === value)}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  onLabel,
  offLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <Segmented<string>
      value={checked ? "on" : "off"}
      options={[
        { value: "on", label: onLabel },
        { value: "off", label: offLabel },
      ]}
      onChange={(v) => onChange(v === "on")}
    />
  );
}

function Select<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <select
      style={selectStyle}
      value={String(value)}
      onChange={(e) => {
        const raw = (e.target as HTMLSelectElement).value;
        const match = options.find((o) => String(o.value) === raw);
        if (match) onChange(match.value);
      }}
    >
      {options.map((o) => (
        <option value={String(o.value)} key={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const overlay: preact.JSX.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};

const modal: preact.JSX.CSSProperties = {
  width: 480,
  maxWidth: "calc(100vw - 32px)",
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--text-primary)",
  fontFamily: "system-ui, -apple-system, sans-serif",
  boxShadow: "var(--shadow)",
};

const header: preact.JSX.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid var(--border)",
  fontWeight: 600,
  fontSize: 14,
  letterSpacing: 0.5,
  display: "flex",
  alignItems: "center",
};

const iconBtn: preact.JSX.CSSProperties = {
  marginLeft: "auto",
  background: "transparent",
  color: "var(--text-muted)",
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  padding: 4,
  lineHeight: 1,
};

const body: preact.JSX.CSSProperties = {
  padding: "8px 16px 4px",
  maxHeight: "70vh",
  overflowY: "auto",
};

const section: preact.JSX.CSSProperties = {
  padding: "12px 0",
  borderBottom: "1px solid var(--border-subtle)",
};

const sectionTitle: preact.JSX.CSSProperties = {
  fontSize: 10,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 10,
};

const field: preact.JSX.CSSProperties = {
  marginBottom: 12,
};

const fieldRow: preact.JSX.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const fieldLabel: preact.JSX.CSSProperties = {
  flex: 1,
  fontSize: 13,
  color: "var(--text-primary)",
};

const fieldControl: preact.JSX.CSSProperties = {
  flexShrink: 0,
};

const fieldHint: preact.JSX.CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginTop: 4,
  lineHeight: 1.4,
};

const segmentedWrap: preact.JSX.CSSProperties = {
  display: "inline-flex",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 2,
  gap: 2,
};

function segmentedBtn(active: boolean): preact.JSX.CSSProperties {
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

const selectStyle: preact.JSX.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: 12,
  fontFamily: "inherit",
  minWidth: 140,
};

const footer: preact.JSX.CSSProperties = {
  padding: 12,
  borderTop: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const primary: preact.JSX.CSSProperties = {
  background: "var(--accent-teal)",
  color: "#031312",
  border: "none",
  borderRadius: 6,
  padding: "6px 16px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
};

const ghost: preact.JSX.CSSProperties = {
  background: "transparent",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: 12,
};
