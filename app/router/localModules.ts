import { ORPCError } from "@orpc/server";
import { authed } from "../lib-server/orpc/auth";
import { sanitizeEdges, sanitizeNodes } from "../lib-server/sanitizeModuleGraph";
import { getLocalModule, getLocalModules } from "../lib-server/localModules";

// Same rule middleware.ts uses for its dev-only Tailwind watcher, for the
// same two reasons: (1) esbuild is given
// `define: { "process.env.NODE_ENV": '"production"' }` for the Vercel and
// Cloudflare builds, so this folds to `false` at build time in those
// builds and every branch below is dead code; (2) local modules are meant
// to be immutable once published — this is the one gate that enforces
// that, everywhere, regardless of which of the three runtimes actually
// serves the request.
const isDev = process.env.NODE_ENV !== "production";

const MAX_NAME_LENGTH = 120;
// Filename-safe, and never "manifest" (that file has a different shape/
// purpose — see manifest.ts).
const ID_RE = /^[a-z0-9][a-z0-9-_]{0,63}$/;

function serialize(m: Awaited<ReturnType<typeof getLocalModule>>) {
    if (!m) return m;
    return { ...m, isDev };
}

// Node's fs/path only exist in the plain-http and Vercel-function
// runtimes, never in the Cloudflare Worker build — same situation
// middleware.ts documents for child_process. Guarding every call site
// behind `isDev` (which is `false` at build time on those targets) plus a
// runtime (non-literal) module specifier keeps this dead and unresolved
// there, exactly like middleware.ts's dev watcher.
async function nodeFs() {
    const fsModule = "node:fs/promises";
    const pathModule = "node:path";
    const [fs, path] = await Promise.all([import(fsModule), import(pathModule)]);
    return { fs: fs.default ?? fs, path: path.default ?? path };
}

async function localModulesDir() {
    const { path } = await nodeFs();
    return path.join(process.cwd(), "app", "local-modules");
}

// Rewrites manifest.ts from whatever .json files currently sit in
// app/local-modules — see that file's own header comment for why it has
// to be a flat list of static imports rather than something dynamic.
async function regenerateManifest() {
    const { fs, path } = await nodeFs();
    const dir = await localModulesDir();
    const files = (await fs.readdir(dir)).filter((f: string) => f.endsWith(".json")).sort();

    const varName = (id: string) => `m_${id.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    const imports = files.map((f: string) => `import ${varName(f.slice(0, -5))} from "./${f}";`).join("\n");
    const entries = files.map((f: string) => `    "${f.slice(0, -5)}": ${varName(f.slice(0, -5))},`).join("\n");

    const content = `// AUTO-GENERATED — do not hand-edit while the dev server is running.
//
// Rewritten by app/router/localModules.ts every time a local module is
// created, renamed, or deleted through the dev-mode "Local Modules" UI
// (see app/components/local-modules). It stays a plain list of static
// \`import\` statements — one per .json file in this folder — on purpose:
//
//   - Static imports are what let esbuild inline each module's JSON
//     straight into the JS bundle at build time. That's what makes local
//     modules read with zero I/O at request time (no fs, no DB) on every
//     target this app ships to, including the Cloudflare Worker build,
//     which has no filesystem at all (see middleware.ts's isDev comment).
//   - It's also what "shipped with the app after publish" means in
//     practice: whatever this file imports at \`npm run build\` time is
//     what production serves, permanently, until the next build — see
//     app/lib-server/localModules.ts for the read side and
//     app/router/localModules.ts for why writes are refused outside dev.
//
// If you drop a .json file in here by hand instead of using the dev UI,
// add its import/entry below yourself (or just start the dev server —
// any create/update/delete through the UI regenerates this whole file).
import type { IModuleNode, IModuleEdge } from "@/app/lib-server/models/Module";
${imports}

export interface LocalModuleFile {
    id: string;
    name: string;
    active: boolean;
    nodes: IModuleNode[];
    edges: IModuleEdge[];
}

const FILES: Record<string, unknown> = {
${entries}
};

export const LOCAL_MODULES: LocalModuleFile[] = Object.entries(FILES).map(([id, raw]) => ({
    id,
    ...(raw as object),
})) as LocalModuleFile[];
`;

    await fs.writeFile(path.join(dir, "manifest.ts"), content, "utf8");
}

function requireDev() {
    if (!isDev) {
        throw new ORPCError("FORBIDDEN", {
            status: 403,
            message: "Local modules can only be added, edited, or deleted in dev mode. In production they're fixed at publish time.",
        });
    }
}

// Read access is allowed in any environment (mirrors module.list/get) —
// it's only the write endpoints below that are dev-gated. `isDev` is
// returned alongside the modules (rather than only per-module) so the
// client still knows which mode it's in even when the list is empty.
export const list = authed.handler(async () => {
    return { isDev, modules: (await getLocalModules()).map((m) => serialize(m)) };
});

export const get = authed.handler(async ({ input }) => {
    const id = String((input as any)?.id ?? "");
    const m = await getLocalModule(id);
    if (!m) throw new ORPCError("NOT_FOUND", { status: 404, message: "Local module not found" });
    return serialize(m);
});

export const create = authed.handler(async ({ input }) => {
    requireDev();
    const body = (input as any) ?? {};
    const id = String(body.id ?? "").trim();
    if (!ID_RE.test(id) || id === "manifest") {
        throw new ORPCError("BAD_REQUEST", {
            status: 400,
            message: "Id must be lowercase letters, numbers, - or _, start with a letter/number, and can't be \"manifest\".",
        });
    }
    if (await getLocalModule(id)) {
        throw new ORPCError("BAD_REQUEST", { status: 400, message: "A local module with this id already exists." });
    }

    const name = String(body.name ?? "").trim().slice(0, MAX_NAME_LENGTH) || id;
    const nodes = sanitizeNodes(body.nodes);
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = sanitizeEdges(body.edges, nodeIds);
    // Same safety default as module.create (router/modules.ts): a new
    // local module never goes live pointed at a real path until someone
    // has actually looked at it, even when imported from a file that
    // says active: true.
    const active = false;

    const { fs, path } = await nodeFs();
    const dir = await localModulesDir();
    const file = path.join(dir, `${id}.json`);
    await fs.writeFile(file, JSON.stringify({ name, active, nodes, edges }, null, 2) + "\n", "utf8");
    await regenerateManifest();

    return { id, name, active, nodes, edges, isDev };
});

export const update = authed.handler(async ({ input }) => {
    requireDev();
    const body = (input as any) ?? {};
    const id = String(body.id ?? "");
    const existing = await getLocalModule(id);
    if (!existing) throw new ORPCError("NOT_FOUND", { status: 404, message: "Local module not found" });

    const next = { name: existing.name, active: existing.active, nodes: existing.nodes, edges: existing.edges };

    if (typeof body.name === "string") {
        const trimmed = body.name.trim().slice(0, MAX_NAME_LENGTH);
        if (!trimmed) throw new ORPCError("BAD_REQUEST", { status: 400, message: "Name can't be empty" });
        next.name = trimmed;
    }
    if (typeof body.active === "boolean") {
        next.active = body.active;
    }
    if (body.nodes !== undefined) {
        next.nodes = sanitizeNodes(body.nodes);
        const nodeIds = new Set(next.nodes.map((n: any) => n.id));
        next.edges = sanitizeEdges(body.edges ?? [], nodeIds);
    } else if (body.edges !== undefined) {
        const nodeIds = new Set(next.nodes.map((n: any) => n.id));
        next.edges = sanitizeEdges(body.edges, nodeIds);
    }

    const { fs, path } = await nodeFs();
    const dir = await localModulesDir();
    const file = path.join(dir, `${id}.json`);
    await fs.writeFile(file, JSON.stringify(next, null, 2) + "\n", "utf8");
    // Renaming/toggling doesn't change which files exist, so the manifest
    // itself doesn't need rewriting — its imports already inline whatever
    // the file contains at the *next* build, and getLocalModule reads
    // straight off disk-cached memory only after a restart. Nothing to
    // regenerate here.

    return { id, ...next, isDev };
});

export const remove = authed.handler(async ({ input }) => {
    requireDev();
    const id = String((input as any)?.id ?? "");
    if (!(await getLocalModule(id))) throw new ORPCError("NOT_FOUND", { status: 404, message: "Local module not found" });

    const { fs, path } = await nodeFs();
    const dir = await localModulesDir();
    await fs.unlink(path.join(dir, `${id}.json`));
    await regenerateManifest();

    return { ok: true };
});
