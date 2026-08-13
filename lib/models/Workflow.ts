import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Kept in sync with app/lib/workflowTypes.ts on the client side — that
// file is the source of truth for labels/fields/icons per type, this is
// just the persistence shape.
export type WorkflowNodeType =
    | "webhook"
    | "staticPage"
    | "httpRequest"
    | "condition"
    | "inputForm"
    | "saveRecord"
    | "saveToList"
    | "mapper"
    | "function"
    | "call"
    | "route"
    | "forward"
    | "findOne"
    | "table"
    | "listView"
    | "card"
    | "container"
    | "query"
    | "setCookie"
    | "getCookie"
    | "getHeader"
    | "setHeader"
    | "jwtVerify"
    | "jwtSign"
    | "menu"
    | "tabs"
    | "navbar"
    | "footer"
    | "view"
    | "gap"
    | "json"
    | "html"
    | "css"
    | "state";

export interface IWorkflowNode {
    id: string;
    type: WorkflowNodeType;
    x: number;
    y: number;
    data: Record<string, any>;
}

export interface IWorkflowEdge {
    id: string;
    source: string;
    // Which output handle this edge leaves from. Only meaningful for nodes
    // with more than one output (currently just "condition": "true" |
    // "false"); null for single-output nodes.
    sourceHandle: string | null;
    target: string;
}

export interface IWorkflow extends Document {
    owner: Types.ObjectId;
    name: string;
    active: boolean;
    nodes: IWorkflowNode[];
    edges: IWorkflowEdge[];
    createdAt: Date;
    updatedAt: Date;
}

const WorkflowNodeSchema = new Schema<IWorkflowNode>(
    {
        id: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: [
                "webhook",
                "staticPage",
                "httpRequest",
                "condition",
                "inputForm",
                "saveRecord",
                "saveToList",
                "mapper",
                "function",
                "call",
                "route",
                "forward",
                "findOne",
                "table",
                "listView",
                "card",
                "container",
                "query",
                "setCookie",
                "getCookie",
                "getHeader",
                "setHeader",
                "jwtVerify",
                "jwtSign",
                "menu",
                "tabs",
                "navbar",
                "footer",
                "view",
                "gap",
                "json",
                "html",
                "css",
                "state",
            ],
        },
        x: { type: Number, required: true, default: 0 },
        y: { type: Number, required: true, default: 0 },
        data: { type: Schema.Types.Mixed, default: {} },
    },
    { _id: false },
);

const WorkflowEdgeSchema = new Schema<IWorkflowEdge>(
    {
        id: { type: String, required: true },
        source: { type: String, required: true },
        sourceHandle: { type: String, default: null },
        target: { type: String, required: true },
    },
    { _id: false },
);

const WorkflowSchema = new Schema<IWorkflow>(
    {
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        name: { type: String, required: true, trim: true },
        active: { type: Boolean, default: false },
        nodes: { type: [WorkflowNodeSchema], default: [] },
        edges: { type: [WorkflowEdgeSchema], default: [] },
    },
    { timestamps: true },
);

// Prevent model recompilation during hot reload
const Workflow: Model<IWorkflow> = mongoose.models.Workflow ?? mongoose.model<IWorkflow>("Workflow", WorkflowSchema);

export default Workflow;