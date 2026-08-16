import type { IModuleNode } from "./models/Module";
import { NODE_EXECUTORS } from "./nodes";
import { sanitizeEdges, sanitizeNodes } from "./sanitizeModuleGraph";
import { LOCAL_MODULES, type LocalModuleFile } from "@/app/local-modules/manifest";

// Local modules are meant for fast, self-contained webhook/page responses
// that don't need a signed-in owner — installer/landing pages, health
// checks, static redirects, env-gated setup screens (like no-env.json).
// Node types that scope data to a user (saveRecord, findOne, list, query,
// saveToList, call, route, forward — anything that reads `ctx.moduleId`
// back against a Module/List owned by someone) aren't meaningful here,
// since a local module has no `owner` and its id isn't a real ObjectId.
// Stick to webhook/condition/env/page-rendering nodes.

// Same rule as app/router/localModules.ts's isDev / requireDev(), and for
// the same reason: `process.env.NODE_ENV !== "production"` folds to
// `false` at build time on the Vercel/Cloudflare builds, so the disk-read
// branch below is dead code there — see readFromDisk's comment.
const isDev = process.env.NODE_ENV !== "production";

function sanitizeAll(files: LocalModuleFile[]): LocalModuleFile[] {
    return files.map((m) => {
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
}

// Production (and any target with no filesystem, e.g. the Cloudflare
// Worker build): the statically-imported, build-time-fixed list. Computed
// once at module load — this is the "zero I/O, safe on every runtime this
// app ships to" path documented in the file header below.
const built = sanitizeAll(LOCAL_MODULES);

// Dev-mode-only: node:fs/promises + node:path via a runtime (non-literal)
// specifier, same trick as router/localModules.ts's nodeFs() — keeps this
// unresolved and dead wherever `isDev` folds to `false` at build time.
async function nodeFs() {
    const fsModule = "node:fs/promises";
    const pathModule = "node:path";
    const [fs, path] = await Promise.all([import(fsModule), import(pathModule)]);
    return { fs: fs.default ?? fs, path: path.default ?? path };
}

// Re-reads every .json file straight off disk instead of trusting
// `LOCAL_MODULES` (the static import from manifest.ts). That import gets
// resolved once when this module is first loaded by the dev server's
// bundler, and — critically — bundlers that watch source files for
// changes typically re-run the file that changed plus whatever directly
// imports it; app/local-modules/*.json is imported one hop further away,
// by manifest.ts, so a save from the dev-mode editor (app/router/
// localModules.ts) landing on disk was never guaranteed to invalidate
// this module's already-evaluated `built` above. Reading fresh from disk
// on every call sidesteps that entirely. Only ever taken in dev — see
// `isDev` above — so it's never on the hot path production cares about.
async function readFromDisk(): Promise<LocalModuleFile[]> {
    try {
        const { fs, path } = await nodeFs();
        const dir = path.join(process.cwd(), "app", "local-modules");
        const files = (await fs.readdir(dir)).filter((f: string) => f.endsWith(".json"));
        const raw = await Promise.all(
            files.map(async (f: string) => {
                try {
                    const text = await fs.readFile(path.join(dir, f), "utf8");
                    return { id: f.slice(0, -5), ...(JSON.parse(text) as object) } as LocalModuleFile;
                } catch {
                    return null;
                }
            }),
        );
        return sanitizeAll(raw.filter((m): m is LocalModuleFile => m !== null));
    } catch {
        // Disk read failed for some reason (e.g. dir doesn't exist yet) —
        // fall back to whatever the bundle already has rather than
        // serving nothing.
        return built;
    }
}

export async function getLocalModules(): Promise<LocalModuleFile[]> {
    return isDev ? readFromDisk() : built;
}

export async function getLocalModule(id: string): Promise<LocalModuleFile | undefined> {
    const modules = await getLocalModules();
    return modules.find((m) => m.id === id);
}

// Mirrors findWebhookNode in moduleEngine.ts, scoped to local modules.
// Checked first by middleware.ts (and server/hooks/[...path].ts), before
// the DB is ever touched — this is the "priority" / "loads faster" part:
// a request that matches a local module never waits on connectDB() or a
// Module.find(). In production this stays pure in-memory (no I/O); in dev
// it goes through readFromDisk() above so an edit is live immediately.
export async function findLocalWebhookNode(path: string, method: string): Promise<{ module: LocalModuleFile; nodeId: string } | undefined> {
    const modules = await getLocalModules();
    for (const module of modules) {
        if (!module.active) continue;
        for (const node of module.nodes) {
            if (NODE_EXECUTORS[node.type]?.matchesTrigger?.(node, path, method)) {
                return { module, nodeId: node.id };
            }
        }
    }
    return undefined;
}
