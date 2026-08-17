import type { ModuleNodeDef } from "./types";

const consoleLogNode: ModuleNodeDef = {
    type: "consoleLog",
    label: "Console Log",
    description: "Logs the chained value to console and passes it through",
    color: "#8b5cf6",
    kind: "action",
    fields: [
        {
            key: "enabled",
            label: "Enable logging",
            kind: "toggle",
        },
    ],
    defaultData: () => ({ enabled: true }),
    summarize: (data) => {
        const enabled = data?.enabled !== false;
        return enabled ? "Log to console" : "Logging disabled";
    },
};

export default consoleLogNode;
