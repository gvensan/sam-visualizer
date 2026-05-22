const isObj = (v) => typeof v === "object" && v !== null;
export function extractAgentCard(payload) {
    if (!isObj(payload))
        return null;
    const name = payload.name;
    if (typeof name !== "string" || name.length === 0)
        return null;
    const card = { name };
    if (typeof payload.description === "string")
        card.description = payload.description;
    if (Array.isArray(payload.defaultInputModes))
        card.defaultInputModes = payload.defaultInputModes.filter((s) => typeof s === "string");
    if (Array.isArray(payload.defaultOutputModes))
        card.defaultOutputModes = payload.defaultOutputModes.filter((s) => typeof s === "string");
    if (Array.isArray(payload.skills)) {
        card.skills = payload.skills
            .filter(isObj)
            .filter((s) => typeof s.id === "string" && typeof s.name === "string")
            .map((s) => ({
            id: s.id,
            name: s.name,
            description: typeof s.description === "string" ? s.description : undefined,
        }));
    }
    return card;
}
/**
 * Extract task_id from a JSON-RPC 2.0 payload when present.
 * SAM uses JSON-RPC; task IDs commonly live in `params.id`, `result.id`, or `id`.
 */
export function extractTaskId(payload) {
    if (!isObj(payload))
        return null;
    if (typeof payload.id === "string")
        return payload.id;
    if (isObj(payload.params)) {
        const p = payload.params;
        if (typeof p.id === "string")
            return p.id;
        if (typeof p.taskId === "string")
            return p.taskId;
    }
    if (isObj(payload.result)) {
        const r = payload.result;
        if (typeof r.id === "string")
            return r.id;
        if (typeof r.taskId === "string")
            return r.taskId;
    }
    return null;
}
/**
 * Pull the human-readable text out of a SAM A2A payload — the actual prompt,
 * status note, or response message a viewer would want to read.
 *
 * The canonical A2A shape is `{ params|result: { message: { parts: [{ kind:
 * "text", text: "..." }, ...] } } }`, but we accept a few looser variants so
 * older agents and the simulator (`params.text`) still surface usefully.
 */
export function extractMessageText(payload) {
    if (!isObj(payload))
        return null;
    // Walk a few envelope levels deep. SAM events can wrap content under
    // params, result, status, artifacts, and a couple of nested layers depending
    // on whether the event is a JSON-RPC request, a response, or a streaming
    // status update.
    const envelopes = [];
    const visit = (v, depth) => {
        if (!isObj(v) || depth > 3)
            return;
        envelopes.push(v);
        visit(v.params, depth + 1);
        visit(v.result, depth + 1);
        visit(v.status, depth + 1);
        visit(v.message, depth + 1);
        if (Array.isArray(v.artifacts)) {
            for (const a of v.artifacts)
                visit(a, depth + 1);
        }
    };
    visit(payload, 0);
    for (const env of envelopes) {
        const fromMsg = textFromMessage(env.message);
        if (fromMsg)
            return fromMsg;
        const fromParts = textFromParts(env.parts);
        if (fromParts)
            return fromParts;
        // Plain text fields used by some agents and the sim shorthand.
        for (const key of ["text", "content", "output", "input"]) {
            const v = env[key];
            if (typeof v === "string" && v.trim().length > 0)
                return v.trim();
        }
    }
    return null;
}
function textFromMessage(m) {
    if (!isObj(m))
        return null;
    return textFromParts(m.parts);
}
function textFromParts(parts) {
    if (!Array.isArray(parts))
        return null;
    const texts = [];
    for (const part of parts) {
        if (!isObj(part))
            continue;
        // A2A part kinds: text | data | file. Only "text" is human-readable here;
        // we leave file refs and structured data for the raw JSON view.
        if (typeof part.text === "string" && part.text.trim().length > 0) {
            texts.push(part.text.trim());
        }
    }
    return texts.length > 0 ? texts.join("\n").trim() : null;
}
export function extractStatus(payload) {
    if (!isObj(payload))
        return null;
    if (typeof payload.status === "string")
        return payload.status;
    if (isObj(payload.result) && typeof payload.result.status === "string")
        return payload.result.status;
    if (isObj(payload.params) && typeof payload.params.status === "string")
        return payload.params.status;
    return null;
}
