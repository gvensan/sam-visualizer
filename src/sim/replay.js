/**
 * Re-play the bus's recorded history. Snapshots history at the start so
 * additions from live ingestion during replay don't extend the playback —
 * those live events still record into the bus and surface in the timeline,
 * but the replay engine itself plays only the original snapshot.
 */
export function runReplay(bus, opts = {}) {
    const speed = opts.speed ?? 1;
    const maxGap = opts.maxGapMs ?? 1500;
    const snapshot = [...bus.getHistory()];
    let cancelled = false;
    let timer = null;
    bus.startReplay();
    if (snapshot.length === 0) {
        bus.endReplay();
        opts.onCaughtUp?.();
        opts.onDone?.();
        return { stop: () => { } };
    }
    let cursor = 0;
    const finish = () => {
        if (cancelled)
            return;
        bus.endReplay();
        opts.onCaughtUp?.();
        opts.onDone?.();
    };
    const tick = () => {
        if (cancelled)
            return;
        if (cursor >= snapshot.length) {
            finish();
            return;
        }
        const event = snapshot[cursor];
        bus.replayDispatch(event);
        cursor++;
        if (cursor >= snapshot.length) {
            finish();
            return;
        }
        const next = snapshot[cursor];
        const gap = Math.min(maxGap, Math.max(0, next.ts - event.ts));
        const delay = gap / Math.max(0.1, speed);
        timer = setTimeout(tick, delay);
    };
    // Kick off immediately so the first event lands without an awkward pause.
    timer = setTimeout(tick, 0);
    return {
        stop: () => {
            cancelled = true;
            if (timer)
                clearTimeout(timer);
            // Caller is responsible for deciding what state to leave the bus in;
            // if they don't call endReplay, the bus stays in replay mode (which
            // would block live updates from animating). Default to ending here.
            if (bus.isReplaying())
                bus.endReplay();
        },
    };
}
