import type { ModuleNodeDef } from "./types";

const OPERATOR_SYMBOLS: Record<string, string> = {
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
    equals: "==",
    strictEquals: "===",
    notEquals: "!=",
    exists: "exists",
    contains: "contains",
};

const conditionNode: ModuleNodeDef = {
    type: "condition",
    label: "Condition",
    description:
        "Branches the module based on a value. \">/>=/</<=\" and \"==/===/!=\" compare numbers when both sides look numeric (\"===\" additionally requires the same type, so \"5\" isn't === 5). \"Pass data through\" controls whether the chosen branch's next node gets the current data as-is, or a clean empty object. Wire in more than one node and set \"Multiple inputs\" to \"Wait\" in the inspector to check across all of them at once — they're combined into a single object first, so Field can just use e.g. \"status\", no need to reference a source node's id.",
    color: "#d97706",
    kind: "branch",
    fields: [
        { key: "field", label: "Field (e.g. body.status)", kind: "text", placeholder: "body.status" },
        {
            key: "operator",
            label: "Operator",
            kind: "select",
            options: [
                { value: "gt", label: ">" },
                { value: "gte", label: ">=" },
                { value: "lt", label: "<" },
                { value: "lte", label: "<=" },
                { value: "equals", label: "==" },
                { value: "strictEquals", label: "===" },
                { value: "notEquals", label: "!=" },
                { value: "exists", label: "Exists" },
                { value: "contains", label: "Contains" },
            ],
        },
        { key: "value", label: "Value", kind: "text", placeholder: "ok" },
        {
            key: "passInput",
            label: "Pass data through",
            kind: "toggle",
        },
    ],
    defaultData: () => ({ field: "", operator: "equals", value: "", passInput: true }),
    summarize: (data) => {
        if (!data?.field) return "no field set";
        const operator = data.operator ?? "equals";
        const symbol = OPERATOR_SYMBOLS[operator] ?? operator;
        const rhs = operator === "exists" ? "" : ` ${data.value ?? ""}`;
        return `${data.field} ${symbol}${rhs}${data?.passInput === false ? " (clears data)" : ""}`;
    },
};

export default conditionNode;
