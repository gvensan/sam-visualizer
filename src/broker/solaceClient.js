import * as solace from "solclientjs";
import { parseTopic } from "../parse/topic";
/** Default broker config used when no saved settings exist and as the
 * target for the "Reset to defaults" button in ConfigPanel. */
export const DEFAULT_BROKER_CONFIG = {
    url: "ws://localhost:8008",
    vpnName: "default",
    userName: "",
    password: "",
    namespace: "default",
    subscribeFeedback: false,
};
let factoryInitialised = false;
function initFactoryOnce() {
    if (factoryInitialised)
        return;
    const props = new solace.SolclientFactoryProperties();
    props.profile = solace.SolclientFactoryProfiles.version10;
    solace.SolclientFactory.init(props);
    factoryInitialised = true;
}
/**
 * Connect to a Solace broker over WebSocket using solclientjs (npm).
 * Subscribes to {namespace}/a2a/v1/> and routes every message into the
 * supplied EventBus via parseTopic, so live and simulated traffic share
 * the same downstream pipeline.
 */
export function connectBroker(bus, cfg) {
    initFactoryOnce();
    const listeners = new Set();
    let status = "connecting";
    const setStatus = (s, info) => {
        status = s;
        listeners.forEach((fn) => fn(s, info));
    };
    const session = solace.SolclientFactory.createSession({
        url: cfg.url,
        vpnName: cfg.vpnName,
        userName: cfg.userName,
        password: cfg.password,
    });
    session.on(solace.SessionEventCode.UP_NOTICE, () => {
        setStatus("connected");
        const topic = `${cfg.namespace}/a2a/v1/>`;
        session.subscribe(solace.SolclientFactory.createTopicDestination(topic), true, topic, 10_000);
        if (cfg.subscribeFeedback) {
            const fb = `${cfg.namespace}/sam/feedback/v1`;
            session.subscribe(solace.SolclientFactory.createTopicDestination(fb), true, fb, 10_000);
        }
    });
    session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (e) => {
        setStatus("error", String(e?.infoStr ?? "connect failed"));
    });
    session.on(solace.SessionEventCode.DISCONNECTED, () => {
        setStatus("disconnected");
    });
    session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, (e) => {
        setStatus("error", String(e?.infoStr ?? "subscription error"));
    });
    session.on(solace.SessionEventCode.MESSAGE, (msg) => {
        try {
            const dest = msg.getDestination();
            if (!dest)
                return;
            const topic = dest.getName();
            const payload = parsePayload(msg);
            const publisher = extractClientId(msg);
            const event = parseTopic(topic, cfg.namespace, Date.now(), payload, publisher);
            if (event)
                bus.dispatch(event);
        }
        catch (err) {
            console.warn("Failed to handle broker message", err);
        }
    });
    try {
        session.connect();
    }
    catch (e) {
        setStatus("error", e instanceof Error ? e.message : String(e));
    }
    return {
        disconnect: () => {
            try {
                session.disconnect();
            }
            catch { /* ignore */ }
        },
        status: () => status,
        onStatus: (cb) => {
            listeners.add(cb);
            cb(status);
            return () => { listeners.delete(cb); };
        },
    };
}
/** Pull the publishing component's name out of the user_properties map.
 * SAM sets `clientId` on every message to the agent name or gateway id; we
 * use it as the canonical source for visualisation since the topic only
 * carries the destination. */
function extractClientId(msg) {
    try {
        const map = msg.getUserPropertyMap?.();
        if (!map)
            return undefined;
        // SDTMapContainer commonly exposes getField(key); some bindings expose
        // get(key) or a plain object. Try a couple of shapes defensively.
        const field = map.getField?.("clientId") ?? map.get?.("clientId");
        if (!field)
            return undefined;
        const v = typeof field.getValue === "function" ? field.getValue() : field;
        if (typeof v === "string" && v.length > 0)
            return v;
    }
    catch { /* ignore — clientId is best-effort */ }
    return undefined;
}
function parsePayload(msg) {
    // Prefer string attachment when present.
    let text;
    try {
        const s = msg.getSdtContainer?.()?.getValue?.();
        if (typeof s === "string")
            text = s;
    }
    catch { /* ignore */ }
    if (text == null) {
        try {
            const bin = msg.getBinaryAttachment();
            if (bin == null)
                return undefined;
            if (typeof bin === "string") {
                text = bin;
            }
            else if (bin instanceof Uint8Array) {
                text = new TextDecoder().decode(bin);
            }
            else if (typeof ArrayBuffer !== "undefined" && bin instanceof ArrayBuffer) {
                text = new TextDecoder().decode(new Uint8Array(bin));
            }
        }
        catch { /* ignore */ }
    }
    if (text == null)
        return undefined;
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
