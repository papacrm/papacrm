// AUTO-GENERATED — do not hand-edit while the dev server is running.
//
// Rewritten by app/router/localModules.ts every time a local module is
// created, renamed, or deleted through the dev-mode "Local Modules" UI
// (see app/components/local-modules). It stays a plain list of static
// `import` statements — one per .json file in this folder — on purpose:
//
//   - Static imports are what let esbuild inline each module's JSON
//     straight into the JS bundle at build time. That's what makes local
//     modules read with zero I/O at request time (no fs, no DB) on every
//     target this app ships to, including the Cloudflare Worker build,
//     which has no filesystem at all (see middleware.ts's isDev comment).
//   - It's also what "shipped with the app after publish" means in
//     practice: whatever this file imports at `npm run build` time is
//     what production serves, permanently, until the next build — see
//     app/lib-server/localModules.ts for the read side and
//     app/router/localModules.ts for why writes are refused outside dev.
//
// If you drop a .json file in here by hand instead of using the dev UI,
// add its import/entry below yourself (or just start the dev server —
// any create/update/delete through the UI regenerates this whole file).
import type { IModuleNode, IModuleEdge } from "@/app/lib-server/models/Module";
import m_no_env from "./no-env.json";

export interface LocalModuleFile {
    id: string;
    name: string;
    active: boolean;
    nodes: IModuleNode[];
    edges: IModuleEdge[];
}

const FILES: Record<string, unknown> = {
    "no-env": m_no_env,
};

export const LOCAL_MODULES: LocalModuleFile[] = Object.entries(FILES).map(([id, raw]) => ({
    id,
    ...(raw as object),
})) as LocalModuleFile[];
