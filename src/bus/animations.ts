/**
 * Serializes async animation work so the canvas plays one effect at a time.
 * Live broker traffic and simulations stay accurate on the bus (state,
 * history, timeline) while the visual playback is deliberate enough to read.
 */
export class AnimationQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = false;
  private gapMs: number;
  private cap: number;
  /** Bumped on reset() to invalidate the currently-running drain loop so an
   * orphaned `await fn()` (typically the one whose d3 transition was just
   * yanked out from under it by a hard STOP) doesn't keep ownership of the
   * `running` flag past its useful life. */
  private generation = 0;

  constructor(gapMs = 60, cap = 80) {
    this.gapMs = gapMs;
    this.cap = cap;
  }

  enqueue(work: () => Promise<void>): void {
    // Backpressure: under sustained heavy traffic in Sequence mode the queue
    // could grow without bound and the canvas would fall further and further
    // behind. Drop the oldest pending item rather than stall the UI.
    if (this.queue.length >= this.cap) {
      this.queue.shift();
    }
    this.queue.push(work);
    if (!this.running) void this.drain();
  }

  /** Soft clear: drop pending work, let the currently-awaiting fn finish. */
  clear(): void {
    this.queue.length = 0;
  }

  /** Hard reset: drop pending work AND release the running flag so a fresh
   * enqueue can start a brand-new drain immediately, even though the
   * previous drain's `await fn()` might still be hanging on a torn-off
   * animation's Promise (which will resolve via its watchdog). The old
   * drain detects the generation change on its next loop iteration and
   * exits without stomping on the new one. */
  reset(): void {
    this.queue.length = 0;
    this.generation++;
    this.running = false;
  }

  pending(): number {
    return this.queue.length;
  }

  private async drain(): Promise<void> {
    const myGen = this.generation;
    this.running = true;
    while (this.queue.length > 0 && this.generation === myGen) {
      const fn = this.queue.shift()!;
      try {
        await fn();
      } catch (e) {
        console.warn("Animation step failed", e);
      }
      if (this.generation !== myGen) break;
      if (this.gapMs > 0) {
        await new Promise<void>((r) => setTimeout(r, this.gapMs));
      }
    }
    // Only release the running flag if we're still the active drain — a
    // newer drain spawned by reset() owns it now if our generation is stale.
    if (this.generation === myGen) this.running = false;
  }
}

/**
 * Tracks which dispatched events are currently being animated by the canvas.
 * Canvas registers a seq when a particle starts and removes it when the
 * transition ends. Timeline reads the active set to highlight the rows that
 * map to in-flight particles.
 *
 * Separate from EventBus so the two concerns (state + history vs visual
 * lifecycle) stay independent.
 */
export class AnimationRegistry {
  private active = new Set<number>();
  private listeners = new Set<() => void>();

  begin(seq: number): void {
    this.active.add(seq);
    this.notify();
  }

  end(seq: number): void {
    if (this.active.delete(seq)) this.notify();
  }

  get(): ReadonlySet<number> {
    return this.active;
  }

  has(seq: number | undefined): boolean {
    return seq !== undefined && this.active.has(seq);
  }

  clear(): void {
    if (this.active.size === 0) return;
    this.active.clear();
    this.notify();
  }

  on(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }
}
