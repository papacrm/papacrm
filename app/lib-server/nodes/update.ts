import { nextEdgeTargets, renderTemplateDeep, type NodeExecutor } from "./types";

function parseJsonObject(raw: unknown): Record<string, unknown> {
    try {
        const parsed = JSON.parse(String(raw ?? "{}"));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
        // Malformed JSON — same "don't fail the run over a typo" spirit
        // as Mapper's own JSON field.
        return {};
    }
}

const updateNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        // When Update One (../nodes/updateOne.ts) is chained right after
        // this node, it reads node.data.update directly off the graph
        // itself rather than running this node for real — see
        // updateOne.ts's own comment for why. This run() only matters
        // when Update is used on its own (or feeding anything other than
        // Update One): it just merges the rendered fields into whatever's
        // currently on ctx.body, same as Mapper's "merge" mode.
        const update = renderTemplateDeep(parseJsonObject(node.data?.update), ctx) as Record<string, unknown>;

        ctx.body = ctx.body && typeof ctx.body === "object" && !Array.isArray(ctx.body) ? { ...ctx.body, ...update } : update;

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default updateNode;
