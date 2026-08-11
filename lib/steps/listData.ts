import { connectDB } from "../mongoose";
import List from "../models/List";
import ListDocument from "../models/ListDocument";
import Workflow from "../models/Workflow";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
// A workflow-rendered page, not the Lists admin screen — cap how many rows
// it'll ever render so an accidentally huge list can't blow up the page.
const MAX_ROWS = 200;

export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Used by Container's "table" blocks, which name a list by id directly in
// their block config (there's no "previous step" for a block to inherit
// data from — see lib/steps/container.ts). The standalone Table step no
// longer uses this: it renders whatever the previous step handed it
// instead — see lib/steps/table.ts.
export async function loadListTableData(listId: string, workflowId: string) {
    if (!OBJECT_ID_RE.test(listId)) return { fields: [] as any[], documents: [] as any[] };

    await connectDB();
    const [list, workflow] = await Promise.all([List.findById(listId).lean(), Workflow.findById(workflowId).select("owner").lean()]);

    // Same ownership check as Save to List: a hand-edited node could name
    // any list id, so only ever render one that actually belongs to this
    // workflow's own owner.
    if (!list || !workflow || String((list as any).owner) !== String((workflow as any).owner)) {
        return { fields: [] as any[], documents: [] as any[] };
    }

    const documents = await ListDocument.find({ list: listId, owner: (list as any).owner })
        .sort({ createdAt: -1 })
        .limit(MAX_ROWS)
        .lean();

    return {
        fields: (list as any).fields ?? [],
        documents: documents.map((d: any) => ({ _id: String(d._id), data: d.data ?? {}, createdAt: d.createdAt })),
    };
}

// Used by the Query step (lib/steps/query.ts), which looks a list up by
// name rather than id.
export async function findOwnedListByName(name: string, workflowId: string) {
    if (!name) return null;

    await connectDB();
    const workflow = await Workflow.findById(workflowId).select("owner").lean();
    if (!workflow) return null;

    const list = await List.findOne({ owner: (workflow as any).owner, name: new RegExp(`^${escapeRegExp(name)}$`, "i") }).lean();
    return list as any;
}

export async function listDocumentsForList(list: any) {
    const documents = await ListDocument.find({ list: list._id, owner: list.owner })
        .sort({ createdAt: -1 })
        .limit(MAX_ROWS)
        .lean();
    return documents.map((d: any) => ({ _id: String(d._id), data: d.data ?? {}, createdAt: d.createdAt }));
}