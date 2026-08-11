import { useHtml } from "nukejs";
import Menu, { type MenuLink } from "./Menu";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Tabs from "./Tabs";
import ListTable from "./ListTable";
import WebhookInputForm from "./WebhookInputForm";
import type { InputFormField } from "../../../lib/steps/inputForm";

interface ViewBlockPosition {
    col: number;
    span: number;
    row: number;
    // "auto" — a normal page block: natural content height, page scrolls.
    // "full" — fills the browser viewport (100vh), like a full-screen app
    // screen.
    height: "auto" | "full";
}

type ViewBlock =
    | { type: "menu"; pos: ViewBlockPosition; links: MenuLink[]; orientation: "horizontal" | "vertical" }
    | { type: "navbar"; pos: ViewBlockPosition; brand: string; links: MenuLink[] }
    | { type: "footer"; pos: ViewBlockPosition; text: string; links: MenuLink[] }
    | { type: "tabs"; pos: ViewBlockPosition; tabs: { label: string; html: string }[] }
    | { type: "table"; pos: ViewBlockPosition; fields: { key: string; label: string }[]; documents: { _id: string; data: Record<string, any> }[] }
    | { type: "form"; pos: ViewBlockPosition; title: string; submitLabel: string; fields: InputFormField[]; stepId: string }
    | { type: "page"; pos: ViewBlockPosition; title: string; html: string }
    | { type: "gap"; pos: ViewBlockPosition; size: number }
    | { type: "view"; pos: ViewBlockPosition; title: string; blocks: ViewBlock[] };

interface ViewProps {
    title: string;
    blocks: ViewBlock[];
}

// Blocks are placed with an explicit CSS Grid column (12 cols, matching
// the editor's grid) and row — the row a block was assigned in the
// editor (see the "Layout" section of a selected View's inspector in
// WorkflowEditor.tsx) maps directly to a grid row here, so blocks the
// person put side by side land side by side, and blocks they stacked
// land in the order they stacked them.
function BlockGrid({ blocks }: { blocks: ViewBlock[] }) {
    return (
        <div className="grid grid-cols-12 gap-6">
            {blocks.map((block, i) => (
                <div
                    key={i}
                    style={{ gridColumn: `${block.pos.col + 1} / span ${block.pos.span}`, gridRow: block.pos.row + 1 }}
                    className={block.pos.height === "full" ? "flex min-h-screen flex-col justify-center" : undefined}
                >
                    {block.type === "menu" && <Menu links={block.links} orientation={block.orientation} />}
                    {block.type === "navbar" && <Navbar brand={block.brand} links={block.links} />}
                    {block.type === "footer" && <Footer text={block.text} links={block.links} />}
                    {block.type === "tabs" && <Tabs tabs={block.tabs} />}
                    {block.type === "table" && <ListTable fields={block.fields} documents={block.documents} />}
                    {block.type === "form" && (
                        <>
                            {block.title && <p className="mb-3 text-sm text-neutral-600">{block.title}</p>}
                            <WebhookInputForm fields={block.fields} submitLabel={block.submitLabel} stepId={block.stepId} />
                        </>
                    )}
                    {block.type === "page" && <div dangerouslySetInnerHTML={{ __html: block.html }} />}
                    {block.type === "gap" && <div style={{ height: block.size }} aria-hidden="true" />}
                    {block.type === "view" && (
                        <div className="flex flex-col gap-2">
                            {block.title && <h2 className="text-lg font-medium">{block.title}</h2>}
                            <BlockGrid blocks={block.blocks} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function View({ title, blocks }: ViewProps) {
    useHtml({ title });

    // No max-width/mx-auto here on purpose — unlike Static Page (a single
    // block of prose, which reads better narrow and centered), a View is
    // a whole page someone's laid out themselves across all 12 columns,
    // full-width Navbar/Footer included. Constraining it would just
    // squash their layout back into a narrow column.
    return (
        <main data-webhook-page className="flex w-full flex-col px-6 py-10">
            <BlockGrid blocks={blocks} />
        </main>
    );
}
