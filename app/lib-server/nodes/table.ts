import { readPath, type NodeContext, type NodeExecutor } from "./types";

export interface TableField {
    key: string;
    label: string;
    type?: string;
}

export interface TableRow {
    _id: string;
    data: Record<string, any>;
}

// Builds the field list Table renders from whatever keys actually show up
// across the resolved rows — there's no schema to consult once Table isn't
// tied to a specific List (see resolveRows below).
function inferFields(documents: TableRow[]): TableField[] {
    const keys: string[] = [];
    for (const doc of documents) {
        for (const key of Object.keys(doc.data ?? {})) {
            if (!keys.includes(key)) keys.push(key);
        }
    }
    return keys.map((key) => ({ key, label: key }));
}

function asRow(value: unknown, index: number): TableRow {
    const data = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : { value };
    return { _id: String(index), data };
}

// Table has no list of its own anymore — it renders whatever the previous
// node left in the run's context. That could be:
//   - a Query node's { fields, documents } result (see query.ts)
//   - a plain array handed along some other way
//   - a single object: an Input Form submission, a webhook's JSON POST
//     body, or a Function/Call's result — shown as one row
//   - as a last resort, the request's own query string (a GET webhook hit
//     with e.g. ?status=active)
// Exported so View (see view.ts) can resolve an embedded Table block's
// rows from the same shared ctx, without invoking Table's own run() (which
// always ends the request as a standalone page — not what an *embedded*
// table should do).
export function resolveRows(ctx: NodeContext): { fields: TableField[]; documents: TableRow[] } {
    const body = ctx.body;

    if (body && typeof body === "object" && Array.isArray((body as any).documents)) {
        const documents: TableRow[] = (body as any).documents.map((d: any, i: number) =>
            d && typeof d === "object" && "data" in d ? { _id: String(d._id ?? i), data: d.data ?? {} } : asRow(d, i),
        );
        const fields: TableField[] = Array.isArray((body as any).fields) && (body as any).fields.length ? (body as any).fields : inferFields(documents);
        return { fields, documents };
    }

    if (Array.isArray(body)) {
        const documents = body.map((item, i) => asRow(item, i));
        return { fields: inferFields(documents), documents };
    }

    if (body && typeof body === "object" && Object.keys(body).length > 0) {
        const documents = [asRow(body, 0)];
        return { fields: inferFields(documents), documents };
    }

    if (ctx.query && Object.keys(ctx.query).length > 0) {
        const documents = [asRow(ctx.query, 0)];
        return { fields: inferFields(documents), documents };
    }

    return { fields: [], documents: [] };
}

const tableNode: NodeExecutor = {
    run({ node, ctx }) {
        const title = String(node.data?.title ?? "Records");
        const { fields, documents } = resolveRows(ctx);

        return {
            done: true,
            result: {
                kind: "page",
                status: 200,
                page: {
                    title,
                    component: "table",
                    props: { title, fields, documents },
                },
            },
        };
    },
};

export default tableNode;