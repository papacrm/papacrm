import { randomBytes } from "node:crypto";
import { nextEdgeTargets, type NodeExecutor } from "./types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const MAX_LENGTH = 128;

function randomString(length: number): string {
    const bytes = randomBytes(length);
    let out = "";
    for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out;
}

const randomNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const requested = Number(node.data?.length);
        const length = Number.isFinite(requested) && requested > 0 ? Math.min(MAX_LENGTH, Math.floor(requested)) : 16;
        const as = String(node.data?.as ?? "").trim() || "token";

        const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
        ctx.body = { ...existing, [as]: randomString(length) };

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default randomNode;
