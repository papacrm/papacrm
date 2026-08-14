import { renderTemplateDeep, type StepExecutor } from "./types";

// Ends the run with a raw JSON response instead of a rendered page — for
// building an API endpoint rather than a webpage. The body can be a JSON
// object or an array (or even a bare string/number), templated the same
// {{field}} way as everywhere else, recursively through any nesting — see
// renderTemplateDeep.
const jsonStep: StepExecutor = {
    run({ node, ctx }) {
        let data: unknown = null;
        try {
            const raw = JSON.parse(String(node.data?.body ?? "null"));
            data = renderTemplateDeep(raw, ctx);
        } catch {
            // Malformed JSON in the body field — respond with `null` rather
            // than failing the whole request over a typo.
        }

        const status = Number(node.data?.status);
        return {
            done: true,
            result: { kind: "json", status: Number.isFinite(status) && status > 0 ? status : 200, data },
        };
    },
};

export default jsonStep;
