import { applyEvent } from "../state/registries";
import { resetPaletteCursor } from "../state/colors";
const DEFAULT_HISTORY_CAP = 5000;
/**
 * Single dispatch point. Live broker traffic, simulation, and replay all push
 * events here. The reducer mutates state, then listeners are notified.
 * A null event signals "state was reset" — UI subscribers should re-read state.
 */
export class EventBus {
    state;
    listeners = new Set();
    history = [];
    historyCap;
    seq = 0;
    replayMode = false;
    /** Live events received during replay. Recorded to history immediately but
     * not applied to state until replay completes, so the replay's state
     * progression isn't muddled by interleaved live traffic. */
    deferred = [];
    constructor(state, opts = {}) {
        this.state = state;
        this.historyCap = opts.historyCap ?? DEFAULT_HISTORY_CAP;
    }
    getState() {
        return this.state;
    }
    getHistory() {
        return this.history;
    }
    getHistoryCap() {
        return this.historyCap;
    }
    /** Resize the rolling history. Older entries are pruned immediately if the
     * new cap is smaller. Pass Infinity for unbounded capture. */
    setHistoryCap(cap) {
        this.historyCap = Math.max(1, cap);
        this.prune();
    }
    isReplaying() {
        return this.replayMode;
    }
    on(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    dispatch(event) {
        this.seq++;
        const tagged = { ...event, seq: this.seq };
        this.history.push(tagged);
        this.prune();
        if (this.replayMode) {
            // Defer state mutation until replay finishes. Notify listeners so the
            // event still appears in the timeline list, but flag it as non-animating
            // so the canvas doesn't show two streams of motion at once.
            this.deferred.push(tagged);
            this.notify(tagged, { animate: false, replay: false });
            return;
        }
        applyEvent(this.state, tagged);
        this.notify(tagged, { animate: true, replay: false });
    }
    /**
     * Re-apply a historical event to state without re-recording it. Used by the
     * replay engine. Listeners are notified with animate=true so the canvas
     * replays the visual flow.
     */
    replayDispatch(event) {
        applyEvent(this.state, event);
        this.notify(event, { animate: true, replay: true });
    }
    /** Enter replay mode. Resets registries (so the canvas starts blank) but
     * keeps history. Live events arriving while replay is active are queued. */
    startReplay() {
        this.replayMode = true;
        this.deferred = [];
        this.state.agents.clear();
        this.state.gateways.clear();
        this.state.tasks.clear();
        resetPaletteCursor();
        this.notify(null, { animate: false, replay: true });
    }
    /** Leave replay mode. Apply any live events that arrived during replay so
     * state matches reality before live animation resumes. They were already
     * recorded into history; only the apply step was deferred. */
    endReplay() {
        for (const e of this.deferred) {
            applyEvent(this.state, e);
        }
        this.deferred = [];
        this.replayMode = false;
        // Tell listeners state caught up; canvas reads state directly via version.
        this.notify(null, { animate: false, replay: false });
    }
    /** Wipe history and registries; notify listeners with a null event. */
    clear() {
        this.state.agents.clear();
        this.state.gateways.clear();
        this.state.tasks.clear();
        this.history = [];
        this.deferred = [];
        this.replayMode = false;
        resetPaletteCursor();
        this.notify(null, { animate: false, replay: false });
    }
    notify(event, meta) {
        // Isolate each subscriber: one listener throwing must never starve the
        // others. Historically this was the root cause of "UI stops refreshing"
        // — a single failing canvas effect would abort the loop before the
        // version-counter listener (which drives re-renders) ran.
        for (const fn of this.listeners) {
            try {
                fn(event, this.state, meta);
            }
            catch (err) {
                console.error("EventBus listener threw; isolating and continuing", err);
            }
        }
    }
    prune() {
        if (this.history.length > this.historyCap) {
            this.history.splice(0, this.history.length - this.historyCap);
        }
    }
}
