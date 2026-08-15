import { connectDB } from "../mongoose";
import List from "../models/List";
import ListDocument from "../models/ListDocument";
import Module from "../models/Module";
import { readPath } from "./types";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
// A module-rendered page, not the Lists admin screen — cap how many rows
// it'll ever render so an accidentally huge list can't blow up the page.
const MAX_ROWS = 200;

export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Shared by Query (lib/nodes/query.ts) and Find One (lib/nodes/findOne.ts)
// — a single, simple condition: one field, one operator, one value. Same
// operator set as the Condition node. Matches against the document's
// `data.<field>`, mirroring how Condition/renderTemplate reads values
// elsewhere in this folder.
export function matchesWhere(doc: { data: Record<string, any> }, field: string, operator: string, value: string): boolean {
    if (!field) return true;
    const haystack = readPath(doc.data, field);

    switch (operator) {
        case "notEquals":
            return String(haystack ?? "") !== value;
        case "contains":
            return typeof haystack === "string" && haystack.includes(value);
        case "equals":
        default:
            return String(haystack ?? "") === value;
    }
}

// Used by Container's "table" blocks, which name a list by id directly in
// their block config (there's no "previous node" for a block to inherit
// data from — see lib/nodes/container.ts). The standalone Table node no
// longer uses this: it renders whatever the previous node handed it
// instead — see lib/nodes/table.ts.
export async function loadListTableData(listId: string, moduleId: string) {
    if (!OBJECT_ID_RE.test(listId)) return { fields: [] as any[], documents: [] as any[] };

    await connectDB();
    const [list, module] = await Promise.all([List.findById(listId).lean(), Module.findById(moduleId).select("owner").lean()]);

    // Same ownership check as Save to List: a hand-edited node could name
    // any list id, so only ever render one that actually belongs to this
    // module's own owner.
    if (!list || !module || String((list as any).owner) !== String((module as any).owner)) {
        return { fields: [] as any[], documents: [] as any[] };
    }

    const documents = await ListDocument.find({ list: listId, owner: (list as any).owner })
        .limit(MAX_ROWS)
        .lean();

    return {
        fields: (list as any).fields ?? [],
        documents: documents.map((d: any) => ({ _id: String(d._id), data: d.data ?? {}, createdAt: d.createdAt })),
    };
}

// Used by the Query node (lib/nodes/query.ts), which looks a list up by
// name rather than id.
export async function findOwnedListByName(name: string, moduleId: string) {
    if (!name) return null;

    await connectDB();
    const module = await Module.findById(moduleId).select("owner").lean();
    if (!module) return null;

    const list = await List.findOne({ owner: (module as any).owner, name: new RegExp(`^${escapeRegExp(name)}$`, "i") }).lean();
    return list as any;
}

export async function listDocumentsForList(list: any) {
    const documents = await ListDocument.find({ list: list._id, owner: list.owner })
        .limit(MAX_ROWS)
        .lean();
    return documents.map((d: any) => ({ _id: String(d._id), data: d.data ?? {}, createdAt: d.createdAt }));
}