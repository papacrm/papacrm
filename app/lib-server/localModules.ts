import type { IModuleNode } from "./models/Module";
import { NODE_EXECUTORS } from "./nodes";
import { sanitizeEdges, sanitizeNodes } from "./sanitizeModuleGraph";
import { LOCAL_MODULES, type LocalModuleFile } from "@/app/local-modules/manifest";

// Local modules load straight from app/local-modules/manifest.ts's static
// imports — already parsed, in memory, part of the JS bundle — so there's
// no fs read and no DB round trip on the request path. That's both why
// they're faster than a DB-backed module and why they can't change once
// the app is published: manifest.ts is only ever rewritten by the dev-mode
// API in app/router/localModules.ts, which refuses to run outside dev (see
// there). Whatever manifest.ts imports at `npm run build` time is fixed
// for the life of that build.
//
// Scope: local modules are meant for fast, self-contained webhook/page
// responses that don't need a signed-in owner — installer/landing pages,
// health checks, static redirects, env-gated setup screens (like
// no-env.json below). Node types that scope data to a user (saveRecord,
// findOne, list, query, saveToList, call, route, forward — anything that
// reads `ctx.moduleId` back against a Module/List owned by someone) aren't
// meaningful here, since a local module has no `owner` and its id isn't a
// real ObjectId. Stick to webhook/condition/env/page-rendering nodes.
const sanitized: LocalModuleFile[] = LOCAL_MODULES.map((m) => {
    const nodes = sanitizeNodes(m.nodes) as IModuleNode[];
    const nodeIds = new Set(nodes.map((n) => n.id));
    return {
        id: m.id,
        name: typeof m.name === "string" && m.name.trim() ? m.name : m.id,
        active: m.active !== false,
        nodes,
        edges: sanitizeEdges(m.edges, nodeIds),
    };
});

export function getLocalModules(): LocalModuleFile[] {
    return sanitized;
}

export function getLocalModule(id: string): LocalModuleFile | undefined {
    return sanitized.find((m) => m.id === id);
}

// Mirrors findWebhookNode in moduleEngine.ts, scoped to local modules.
// Checked first by server/hooks/[...path].ts, before the DB is ever
// touched — this is the "priority" / "loads faster" part: a request that
// matches a local module never waits on connectDB() or a Module.find().
export function findLocalWebhookNode(path: string, method: string): { module: LocalModuleFile; nodeId: string } | undefined {
    for (const module of sanitized) {
        if (!module.active) continue;
        for (const node of module.nodes) {
            if (NODE_EXECUTORS[node.type]?.matchesTrigger?.(node, path, method)) {
                return { module, nodeId: node.id };
            }
        }
    }
    return undefined;
}
