import { randomBytes, randomInt } from "node:crypto";
import { nextEdgeTargets, type NodeExecutor } from "./types";

const ALPHABET_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BOTH_CHARS = ALPHABET_CHARS + "0123456789";
const MAX_LENGTH = 128;

function randomString(pool: string, length: number): string {
    if (!pool) return "";
    const bytes = randomBytes(length);
    let out = "";
    for (let i = 0; i < length; i++) out += pool[bytes[i] % pool.length];
    return out;
}

function clampLength(raw: unknown): number {
    const requested = Number(raw);
    return Number.isFinite(requested) && requested > 0 ? Math.min(MAX_LENGTH, Math.floor(requested)) : 16;
}

const randomNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const mode = String(node.data?.mode ?? "both");
        const as = String(node.data?.as ?? "").trim() || "token";

        let value: string | number;
        if (mode === "number") {
            // Unlike the other modes, Number doesn't build a string out of
            // a character pool — Min/Max describe an actual numeric range,
            // and node:crypto's randomInt gives an unbiased integer in it
            // (upper bound is exclusive, hence the +1). The result is a
            // real `number` on ctx.body, not a digit string, so a chained
            // Add node (see lib-server/nodes/add.ts) can sum it directly.
            const minRaw = Number(node.data?.min);
            const maxRaw = Number(node.data?.max);
            const min = Number.isFinite(minRaw) ? Math.floor(minRaw) : 0;
            const max = Math.max(min, Number.isFinite(maxRaw) ? Math.floor(maxRaw) : 100);
            value = max === min ? min : randomInt(min, max + 1);
        } else {
            const length = clampLength(node.data?.length);
            const pool =
                mode === "alphabet" ? ALPHABET_CHARS : mode === "custom" ? String(node.data?.customChars ?? "").trim() || BOTH_CHARS : BOTH_CHARS;
            value = randomString(pool, length);
        }

        const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
        ctx.body = { ...existing, [as]: value };

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default randomNode;
