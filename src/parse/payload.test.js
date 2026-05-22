import { describe, expect, it } from "vitest";
import { extractAgentCard, extractMessageText, extractStatus, extractTaskId, } from "./payload";
describe("extractAgentCard", () => {
    it("returns null when name is missing", () => {
        expect(extractAgentCard({})).toBeNull();
        expect(extractAgentCard(null)).toBeNull();
        expect(extractAgentCard("nope")).toBeNull();
    });
    it("extracts a fully-specified AgentCard", () => {
        const card = extractAgentCard({
            name: "WeatherAgent",
            description: "Provides weather forecasts.",
            defaultInputModes: ["text"],
            defaultOutputModes: ["text", "file"],
            skills: [
                { id: "get_forecast", name: "Get Forecast", description: "Forecast." },
                { id: "bad", name: 42 }, // filtered: name not string
            ],
        });
        expect(card).toEqual({
            name: "WeatherAgent",
            description: "Provides weather forecasts.",
            defaultInputModes: ["text"],
            defaultOutputModes: ["text", "file"],
            skills: [{ id: "get_forecast", name: "Get Forecast", description: "Forecast." }],
        });
    });
});
describe("extractTaskId", () => {
    it("pulls task id from id, params.id, result.id, params.taskId", () => {
        expect(extractTaskId({ id: "t1" })).toBe("t1");
        expect(extractTaskId({ params: { id: "t2" } })).toBe("t2");
        expect(extractTaskId({ result: { id: "t3" } })).toBe("t3");
        expect(extractTaskId({ params: { taskId: "t4" } })).toBe("t4");
        expect(extractTaskId(null)).toBeNull();
    });
});
describe("extractStatus", () => {
    it("pulls status from common JSON-RPC shapes", () => {
        expect(extractStatus({ status: "working" })).toBe("working");
        expect(extractStatus({ result: { status: "completed" } })).toBe("completed");
        expect(extractStatus({ params: { status: "failed" } })).toBe("failed");
        expect(extractStatus({})).toBeNull();
    });
});
describe("extractMessageText", () => {
    it("reads canonical A2A request: params.message.parts[].text", () => {
        const text = extractMessageText({
            id: "t1",
            params: { message: { role: "user", parts: [{ kind: "text", text: "Hello" }] } },
        });
        expect(text).toBe("Hello");
    });
    it("reads canonical A2A response: result.message.parts[].text", () => {
        const text = extractMessageText({
            result: { message: { role: "agent", parts: [{ kind: "text", text: "Done." }] } },
        });
        expect(text).toBe("Done.");
    });
    it("joins multiple text parts with newlines", () => {
        const text = extractMessageText({
            params: { message: { parts: [{ text: "Line 1" }, { text: "Line 2" }] } },
        });
        expect(text).toBe("Line 1\nLine 2");
    });
    it("falls back to shorthand text fields", () => {
        expect(extractMessageText({ params: { text: "plain" } })).toBe("plain");
        expect(extractMessageText({ text: "top" })).toBe("top");
    });
    it("returns null when no readable text is present", () => {
        expect(extractMessageText({ params: { status: "working" } })).toBeNull();
        expect(extractMessageText({})).toBeNull();
        expect(extractMessageText(null)).toBeNull();
    });
    it("ignores non-text parts (file/data) but keeps text parts", () => {
        const text = extractMessageText({
            params: {
                message: {
                    parts: [
                        { kind: "file", file: { uri: "s3://x" } },
                        { kind: "text", text: "narration" },
                        { kind: "data", data: { rows: 5 } },
                    ],
                },
            },
        });
        expect(text).toBe("narration");
    });
    it("finds text nested inside status containers", () => {
        expect(extractMessageText({
            params: { status: { message: { parts: [{ text: "scoring…" }] } } },
        })).toBe("scoring…");
    });
    it("finds text inside artifacts", () => {
        expect(extractMessageText({
            result: { artifacts: [{ parts: [{ text: "artifact body" }] }] },
        })).toBe("artifact body");
    });
    it("accepts content/output keys as a fallback", () => {
        expect(extractMessageText({ result: { content: "raw content" } })).toBe("raw content");
        expect(extractMessageText({ params: { output: "raw output" } })).toBe("raw output");
    });
});
