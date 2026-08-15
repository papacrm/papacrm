import { useHtml } from "nukejs";
import type { InputFormField } from "../../lib-server/nodes/inputForm";
import ListTable from "./ListTable";
import WebhookInputForm from "./WebhookInputForm";

type ContainerBlock =
    | { type: "table"; heading?: string; fields: { key: string; label: string; type?: string }[]; documents: { _id: string; data: Record<string, any> }[] }
    | { type: "form"; heading?: string; title?: string; submitLabel: string; fields: InputFormField[]; nodeId: string }
    | { type: "html"; heading?: string; html: string };

interface ContainerProps {
    title: string;
    blocks: ContainerBlock[];
}

// Renders a Container node's blocks in order. Each block is its own
// section; a "form" block is WebhookInputForm itself (same component Input
// Form uses) so it gets the same live validation and no-full-reload submit
// behavior — see that component for how the submission finds its way back
// to lib/nodes/container.ts via the block's nodeId.
//
// Only the *first* form block on the page is interactive: WebhookInputForm
// wires itself up by looking for `[data-webhook-form]`, so with more than
// one on the page only the first one found gets the client-side script's
// listeners. A Container is meant for one primary form alongside read-only
// content (e.g. a table), not multiple independent forms.
export default function Container({ title, blocks }: ContainerProps) {
    useHtml({ title });

    return (
        <main data-webhook-page className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {blocks.map((block, index) => (
                <section key={index} className="flex flex-col gap-3">
                    {block.heading && <h2 className="text-lg font-medium">{block.heading}</h2>}
                    {block.type === "table" && <ListTable fields={block.fields} documents={block.documents} />}
                    {block.type === "form" && (
                        <>
                            {block.title && <p className="text-sm text-neutral-600">{block.title}</p>}
                            <WebhookInputForm fields={block.fields} submitLabel={block.submitLabel} nodeId={block.nodeId} />
                        </>
                    )}
                    {block.type === "html" && <div dangerouslySetInnerHTML={{ __html: block.html }} />}
                </section>
            ))}
        </main>
    );
}
