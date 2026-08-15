import { decode } from "@kav3/jwt";
import { nextEdgeTargets, renderTemplate, type NodeExecutor } from "./types";

// A branch node (like Condition — see condition.ts): "true" if the token's
// signature checks out and it hasn't expired, "false" otherwise (missing
// token, missing/misconfigured secret, bad signature, or expired). The
// secret itself is never stored on the node — only the *name* of an
// environment variable to read it from at run time, so it never ends up
// in the module document or the editor's UI.
const jwtVerifyNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const token = renderTemplate(String(node.data?.token ?? "{{token}}"), ctx);
        const secretEnv = String(node.data?.secretEnv ?? "").trim();
        const secret = secretEnv ? process.env[secretEnv] : undefined;

        let verified = false;
        if (token && secret) {
            try {
                const payload = decode(token, secret);
                const as = String(node.data?.as ?? "").trim() || "payload";
                const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
                ctx.body = { ...existing, [as]: payload };
                verified = true;
            } catch {
                // Bad signature, malformed token, or expired `exp` claim —
                // decode() throws for all of these, which is exactly what
                // "false" should mean here.
                verified = false;
            }
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges, verified ? "true" : "false") };
    },
};

export default jwtVerifyNode;
