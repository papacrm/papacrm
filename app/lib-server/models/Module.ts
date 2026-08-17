import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Kept in sync with app/lib/moduleTypes.ts on the client side — that
// file is the source of truth for labels/fields/icons per type, this is
// just the persistence shape.
export type ModuleNodeType =
    | "webhook"
    | "staticPage"
    | "httpRequest"
    | "condition"
    | "inputForm"
    | "saveRecord"
    | "saveToList"
    | "updateOne"
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
    | "state"
    | "label"
    | "link"
    | "div"
    | "class"
    | "style"
    | "textInput"
    | "checkboxInput"
    | "textareaInput"
    | "numberInput"
    | "find"
    | "match"
    | "project"
    | "sort"
    | "limit"
    | "skip"
    | "list"
    | "listUpsert"
    | "count"
    | "distinct"
    | "delay"
    | "random"
    | "now"
    | "add"
    | "env"
    | "text"
    | "image"
    | "selectInput"
    | "consoleLog";

export interface IModuleNode {
    id: string;
    type: ModuleNodeType;
    x: number;
    y: number;
    data: Record<string, any>;
}

export interface IModuleEdge {
    id: string;
    source: string;
    // Which output handle this edge leaves from. Only meaningful for nodes
    // with more than one output (currently just "condition": "true" |
    // "false"); null for single-output nodes.
    sourceHandle: string | null;
    target: string;
}

export interface IModule extends Document {
    owner: Types.ObjectId;
    name: string;
    active: boolean;
    nodes: IModuleNode[];
    edges: IModuleEdge[];
    createdAt: Date;
    updatedAt: Date;
}

const ModuleNodeSchema = new Schema<IModuleNode>(
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
                "updateOne",
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
                "label",
                "link",
                "div",
                "class",
                "textInput",
                "checkboxInput",
                "textareaInput",
                "numberInput",
                "find",
                "match",
                "project",
                "sort",
                "limit",
                "skip",
                "list",
                "listUpsert",
                "count",
                "distinct",
                "delay",
                "random",
                "now",
                "add",
                "env",
                "text",
                "image",
                "selectInput",
                "consoleLog",
            ],
        },
        x: { type: Number, required: true, default: 0 },
        y: { type: Number, required: true, default: 0 },
        data: { type: Schema.Types.Mixed, default: {} },
    },
    { _id: false },
);

const ModuleEdgeSchema = new Schema<IModuleEdge>(
    {
        id: { type: String, required: true },
        source: { type: String, required: true },
        sourceHandle: { type: String, default: null },
        target: { type: String, required: true },
    },
    { _id: false },
);

const ModuleSchema = new Schema<IModule>(
    {
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        name: { type: String, required: true, trim: true },
        active: { type: Boolean, default: false },
        nodes: { type: [ModuleNodeSchema], default: [] },
        edges: { type: [ModuleEdgeSchema], default: [] },
    },
    { timestamps: true },
);

// Prevent model recompilation during hot reload
const Module: Model<IModule> = mongoose.models.Module ?? mongoose.model<IModule>("Module", ModuleSchema);

export default Module;