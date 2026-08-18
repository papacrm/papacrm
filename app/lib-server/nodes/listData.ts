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

// Mongo-level equivalent of matchesWhere above — used by findOneDocument
// and findDocuments so filtering happens inside the query itself (a real
// findOne()/find()) instead of pulling every document into memory first
// and filtering in JS. `equals`/`notEquals` compare as strings via $expr
// + $toString to match matchesWhere's `String(haystack ?? "") === value`
// semantics regardless of the field's actual stored type; `contains` only
// ever matches an actual string field, same as matchesWhere's `typeof
// haystack === "string"` guard.
function buildWhereQuery(field: string, operator: string, value: string): Record<string, any> {
    if (!field) return {};
    const path = `$data.${field}`;
    const asString = { $toString: { $ifNull: [path, ""] } };

    switch (operator) {
        case "notEquals":
            return { $expr: { $ne: [asString, value] } };
        case "contains":
            return { [`data.${field}`]: { $regex: escapeRegExp(value) } };
        case "equals":
        default:
            return { $expr: { $eq: [asString, value] } };
    }
}

// Builds a Mongoose projection object from a list of selected field keys —
// the same keys Project's checkboxes use. Kept available for Find/Find
// One to pass through to Mongo if a future caller wants DB-level
// projection; currently unused by either (field selection is Project's
// job, applied in JS after the fetch — see ./project.ts) but harmless to
// call with an empty selection, which returns `undefined` and applies no
// restriction at all.
export function buildProjection(fields: string[]): Record<string, 0 | 1> | undefined {
    if (!fields || fields.length === 0) return undefined;
    const projection: Record<string, 0 | 1> = { _id: 0 };
    for (const key of fields) {
        if (key === "_id") projection._id = 1;
        else if (key === "createdAt") projection.createdAt = 1;
        else if (key === "updatedAt") projection.updatedAt = 1;
        else projection[`data.${key}`] = 1;
    }
    return projection;
}

// Real findOne() — used by Find One (./findOne.ts). Filters at the DB
// level via buildWhereQuery inside a single findOne().lean() call, rather
// than fetching every document of the list and filtering in JS like
// listDocumentsForList does. `projectFields` is accepted for callers that
// want DB-level projection, but Find One itself doesn't pass any — see
// buildProjection above.
export async function findOneDocument(
    list: any,
    whereField: string,
    whereOperator: string,
    whereValue: string,
    projectFields: string[] = [],
): Promise<{ _id: string; data: Record<string, any>; createdAt?: any; updatedAt?: any } | undefined> {
    await connectDB();
    const query = { list: list._id, owner: list.owner, ...buildWhereQuery(whereField, whereOperator, whereValue) };
    const doc = await ListDocument.findOne(query, buildProjection(projectFields)).lean();
    if (!doc) return undefined;
    return { _id: String((doc as any)._id), data: (doc as any).data ?? {}, createdAt: (doc as any).createdAt, updatedAt: (doc as any).updatedAt };
}

// Real find() — used by Find (./find.ts). Same DB-level filter treatment
// as findOneDocument, capped at MAX_ROWS like the rest of this file.
export async function findDocuments(
    list: any,
    whereField: string,
    whereOperator: string,
    whereValue: string,
    projectFields: string[] = [],
): Promise<{ _id: string; data: Record<string, any>; createdAt?: any; updatedAt?: any }[]> {
    await connectDB();
    const query = { list: list._id, owner: list.owner, ...buildWhereQuery(whereField, whereOperator, whereValue) };
    const docs = await ListDocument.find(query, buildProjection(projectFields))
        .limit(MAX_ROWS)
        .lean();
    return docs.map((d: any) => ({ _id: String(d._id), data: d.data ?? {}, createdAt: d.createdAt, updatedAt: d.updatedAt }));
}