import { useEffect, useState } from "preact/hooks";
/**
 * Subscribe to the bus and bump a version counter on every event.
 * Components read state directly from bus.getState() and re-render when version changes.
 *
 * Re-renders are coalesced into at most one per animation frame. Under a
 * burst of events (e.g., live broker firing dozens/sec, or a replay loop
 * tearing through history) this prevents Preact reconciliation from
 * monopolising the main thread and freezing the UI.
 */
export function useBusVersion(bus) {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        let scheduled = false;
        let raf = 0;
        const off = bus.on(() => {
            if (scheduled)
                return;
            scheduled = true;
            raf = requestAnimationFrame(() => {
                scheduled = false;
                setVersion((v) => v + 1);
            });
        });
        return () => {
            off();
            if (raf)
                cancelAnimationFrame(raf);
        };
    }, [bus]);
    return version;
}
