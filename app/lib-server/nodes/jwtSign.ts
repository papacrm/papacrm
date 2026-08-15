import { encode } from "@kav3/jwt";
import { nextEdgeTargets, renderTemplateDeep, type NodeExecutor } from "./types";

// Signs a JSON payload (every string value run through the usual
// {{field}} templating — see renderTemplateDeep) with a secret read from
// an env var named on the node, and folds the resulting token string into
// ctx.body under `as` so a later node (e.g. Set Cookie, or a Page/HTTP
// Request response) can use it. Same env-var-by-name approach as JWT
// Verify — the secret itself never touches the saved module.
const jwtSignNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        let payload: Record<string, unknown> = {};
        try {
            const raw = JSON.parse(node.data?.payload ?? "{}");
            if (raw && typeof raw === "object" && !Array.isArray(raw)) {
                payload = renderTemplateDeep(raw, ctx);
            }
        } catch {
            // Malformed JSON in the payload field — sign an empty payload
            // rather than failing the whole run over a typo.
        }

        const expiresIn = Number(node.data?.expiresIn);
        if (Number.isFinite(expiresIn) && expiresIn > 0) {
            payload.exp = Math.floor(Date.now() / 1000) + expiresIn;
        }

        const secretEnv = String(node.data?.secretEnv ?? "").trim();
        const secret = secretEnv ? process.env[secretEnv] : undefined;
        const as = String(node.data?.as ?? "").trim() || "token";

        if (secret) {
            const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
            ctx.body = { ...existing, [as]: encode(payload, secret) };
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default jwtSignNode;
