import type { EventBus } from "../bus/eventBus";
import { parseTopic } from "../parse/topic";
import { SIM_NAMESPACE, type Scenario } from "./scenarios";

export interface SimulationOptions {
  /** Either a fixed multiplier or a getter for dynamic speed control. The
   * getter form is read on every step so a Speed slider change applies
   * immediately to the running scenario. */
  speed?: number | (() => number);
  loop?: boolean;
  namespace?: string;
}

export interface SimulationHandle {
  stop: () => void;
}

function readSpeed(opts: SimulationOptions): number {
  const raw = typeof opts.speed === "function" ? opts.speed() : opts.speed;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return 1;
  return raw;
}

/**
 * Play a scenario by dispatching its steps onto the bus with original timing.
 * Lives entirely in user-land timers so it can be paused/stopped at any time.
 */
export function runScenario(
  bus: EventBus,
  scenario: Scenario,
  opts: SimulationOptions = {},
): SimulationHandle {
  const ns = opts.namespace ?? SIM_NAMESPACE;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const playOnce = () => {
    let i = 0;
    const step = () => {
      if (cancelled || i >= scenario.steps.length) {
        if (!cancelled && opts.loop) {
          timer = setTimeout(playOnce, 800 / readSpeed(opts));
        }
        return;
      }
      const s = scenario.steps[i++];
      timer = setTimeout(() => {
        if (cancelled) return;
        const now = Date.now();
        const event = parseTopic(s.topic, ns, now, s.payload, s.publisher);
        if (event) bus.dispatch(event);
        step();
      }, s.delayMs / readSpeed(opts));
    };
    step();
  };

  playOnce();

  return {
    stop: () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    },
  };
}
