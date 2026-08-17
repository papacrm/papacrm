import type { ModuleNodeDef } from "./types";

// Field visibility depends on `mode` and is handled specially in
// ModuleEditor.tsx (see the `selectedNode.type === "random"` case there):
// Number shows Min/Max instead of Length; Custom additionally shows
// Custom characters. All four fields still live here so their
// label/placeholder/default stay in one place.
const randomNode: ModuleNodeDef = {
    type: "random",
    label: "Random",
    description:
        'Generates a random value — useful for tokens, nonces, short-lived codes, or a random number. "Number" returns an actual number between Min and Max; the other modes return a string of the given Length.',
    color: "#9f1239",
    kind: "action",
    fields: [
        {
            key: "mode",
            label: "Characters",
            kind: "select",
            options: [
                { value: "alphabet", label: "Alphabet (a-z, A-Z)" },
                { value: "number", label: "Number" },
                { value: "both", label: "Alphabet + Number" },
                { value: "custom", label: "Custom" },
            ],
        },
        { key: "length", label: "Length", kind: "text", placeholder: "16" },
        { key: "min", label: "Min", kind: "text", placeholder: "0" },
        { key: "max", label: "Max", kind: "text", placeholder: "100" },
        { key: "customChars", label: "Custom characters", kind: "text", placeholder: "abcdef123" },
        { key: "as", label: "Save as (used later as {{field}})", kind: "text", placeholder: "token" },
    ],
    defaultData: () => ({ mode: "both", length: "16", min: "0", max: "100", customChars: "", as: "token" }),
    summarize: (data) => {
        if (!data?.as) return "No field name set";
        const mode = data?.mode ?? "both";
        if (mode === "number") return `Random number ${data?.min ?? 0}–${data?.max ?? 100} → ${data.as}`;
        const label = mode === "alphabet" ? "letters" : mode === "custom" ? "custom chars" : "letters+numbers";
        return `Random ${label} (${data?.length ?? 16}) → ${data.as}`;
    },
};

export default randomNode;
