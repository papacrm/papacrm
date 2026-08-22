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
        "Branches the module based on a value. \">/>=/</<=\" and \"==/===/!=\" compare numbers when both sides look numeric (\"===\" additionally requires the same type, so \"5\" isn't === 5). The chosen branch's next node always gets the current data as-is — chain in a \"Pass data through\" node afterward if you need to hand data from one point to another. Wire in more nodes with \"data\" edges (click the icon on the connection to switch it) to check across all of them at once — Field can just use e.g. \"status\", no need to reference a source node's id.",
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
    ],
    defaultData: () => ({ field: "", operator: "equals", value: "" }),
    summarize: (data) => {
        if (!data?.field) return "no field set";
        const operator = data.operator ?? "equals";
        const symbol = OPERATOR_SYMBOLS[operator] ?? operator;
        const rhs = operator === "exists" ? "" : ` ${data.value ?? ""}`;
        return `${data.field} ${symbol}${rhs}`;
    },
};

export default conditionNode;
