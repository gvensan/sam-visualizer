import { useEffect, useState } from "preact/hooks";
/**
 * Subscribe to an AnimationRegistry and re-render on any change.
 * Returns the live active-set; consumers should call `.has(seq)` per row.
 */
export function useAnimations(reg) {
    const [, setVersion] = useState(0);
    useEffect(() => reg.on(() => setVersion((v) => v + 1)), [reg]);
    return reg.get();
}
