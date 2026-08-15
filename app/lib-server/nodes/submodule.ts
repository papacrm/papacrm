import { connectDB } from "../mongoose";
import Module from "../models/Module";
import type { ModuleResult } from "./types";

export const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

// Turns a sub-module's ModuleResult back into plain data so it can be
// folded into ctx.body for whatever's wired up after a Call/Route node —
// the same shape HTTP Request hands the next node (see httpRequest.ts),
// just sourced from an in-process run instead of a fetch() response.
export function resultToBody(result: ModuleResult): any {
    if (result.kind === "json") return result.data;
    if (result.kind === "page") return { title: result.page.title, ...result.page.props };
    return {};
}

// Turns a called function's ModuleResult into the plain text a View's
// "slot" block (see lib/nodes/view.ts) shows once that function has
// actually been called earlier in the same run — see call.ts, which
// writes this onto ctx.slotContent. Node executors stay framework-agnostic
// (see the note on ModulePage in ./types.ts), so this is plain text, not
// SSR'd HTML: a "page" result contributes its title, a "json" result its
// data (stringified unless it's already a string), and an "empty" result
// contributes nothing worth showing.
export function resultToSlotContent(result: ModuleResult): string {
    if (result.kind === "json") {
        return typeof result.data === "string" ? result.data : JSON.stringify(result.data);
    }
    if (result.kind === "page") {
        return result.page.title;
    }
    return "";
}

// Loads another module, but only if it's owned by the same person as
// `fromModuleId` — shared by Call, Route, and Forward so none of them can
// be pointed at someone else's module, however it's phrased in a saved
// graph. Returns null (rather than throwing) on a malformed id, a missing
// module on either side, or an owner mismatch, so callers can fold it
// into their own "no such target" error message.
export async function loadSiblingModule(targetId: string, fromModuleId: string): Promise<any | null> {
    if (!OBJECT_ID_RE.test(targetId)) return null;

    await connectDB();
    const [target, current] = await Promise.all([
        Module.findById(targetId).lean(),
        Module.findById(fromModuleId).select("owner").lean(),
    ]);

    if (!target || !current || String((target as any).owner) !== String((current as any).owner)) {
        return null;
    }
    return target;
}
