import { parseTopic } from "../parse/topic";
import { SIM_NAMESPACE } from "./scenarios";
function readSpeed(opts) {
    const raw = typeof opts.speed === "function" ? opts.speed() : opts.speed;
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0)
        return 1;
    return raw;
}
/**
 * Play a scenario by dispatching its steps onto the bus with original timing.
 * Lives entirely in user-land timers so it can be paused/stopped at any time.
 */
export function runScenario(bus, scenario, opts = {}) {
    const ns = opts.namespace ?? SIM_NAMESPACE;
    let cancelled = false;
    let timer = null;
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
                if (cancelled)
                    return;
                const now = Date.now();
                const event = parseTopic(s.topic, ns, now, s.payload, s.publisher);
                if (event)
                    bus.dispatch(event);
                step();
            }, s.delayMs / readSpeed(opts));
        };
        step();
    };
    playOnce();
    return {
        stop: () => {
            cancelled = true;
            if (timer)
                clearTimeout(timer);
        },
    };
}
