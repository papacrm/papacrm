import { renderTemplate, type NodeExecutor } from "./types";

// Ends the run with a raw text/plain response — for a webhook meant to be
// read by another program that doesn't want a JSON envelope (e.g. a
// health check expecting the literal string "OK"). Same {{field}}
// templating as everywhere else, just not JSON-encoded first.
const textNode: NodeExecutor = {
    run({ node, ctx }) {
        const text = renderTemplate(String(node.data?.body ?? ""), ctx);
        const status = Number(node.data?.status);
        return {
            done: true,
            result: { kind: "text", status: Number.isFinite(status) && status > 0 ? status : 200, text },
        };
    },
};

export default textNode;
