export const AGENT_TTL_MS = 90_000;
/**
 * Returns names of agents whose lastSeen is older than the TTL.
 * Callers can use this to dim/remove nodes; we do not delete here so the
 * UI can decide whether to fade or fully drop.
 */
export function staleAgents(state, now = Date.now(), ttl = AGENT_TTL_MS) {
    const stale = [];
    for (const [name, agent] of state.agents) {
        if (now - agent.lastSeen > ttl)
            stale.push(name);
    }
    return stale;
}
