import { Link } from "nukejs";
import Menu, { type MenuLink } from "./Menu";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Tabs from "./Tabs";
import ListTable from "./ListTable";
import ListItems from "./ListItems";
import CardGrid from "./CardGrid";
import WebhookInputForm from "./WebhookInputForm";
import type { InputFormField } from "../../lib-server/steps/inputForm";

interface ViewBlockPosition {
    col: number;
    span: number;
    row: number;
    height: "auto" | "full";
}

type ViewBlock =
    | { type: "menu"; pos: ViewBlockPosition; links: MenuLink[]; orientation: "horizontal" | "vertical" }
    | { type: "navbar"; pos: ViewBlockPosition; brand: string; links: MenuLink[] }
    | { type: "footer"; pos: ViewBlockPosition; text: string; links: MenuLink[] }
    | { type: "tabs"; pos: ViewBlockPosition; tabs: { label: string; html: string }[] }
    | { type: "table"; pos: ViewBlockPosition; fields: { key: string; label: string }[]; documents: { _id: string; data: Record<string, any> }[] }
    | {
          type: "listView";
          pos: ViewBlockPosition;
          title: string;
          fields: { key: string; label: string }[];
          items: { _id: string; text: string; card?: { title: string; subtitle: string; body: string }; view?: any[] }[];
      }
    | {
          type: "card";
          pos: ViewBlockPosition;
          title: string;
          fields: { key: string; label: string }[];
          items: { _id: string; title: string; subtitle: string; body: string; data: Record<string, any> }[];
      }
    | { type: "form"; pos: ViewBlockPosition; title: string; submitLabel: string; fields: InputFormField[]; stepId: string }
    | { type: "page"; pos: ViewBlockPosition; title: string; html: string }
    | { type: "gap"; pos: ViewBlockPosition; size: number }
    | { type: "label"; pos: ViewBlockPosition; text: string }
    | { type: "link"; pos: ViewBlockPosition; href: string; text?: string; blocks?: ViewBlock[] }
    | { type: "textInput"; pos: ViewBlockPosition; name: string; label: string; placeholder: string; value: string }
    | { type: "checkboxInput"; pos: ViewBlockPosition; name: string; label: string; checked: boolean }
    | { type: "textareaInput"; pos: ViewBlockPosition; name: string; label: string; placeholder: string; value: string }
    | { type: "numberInput"; pos: ViewBlockPosition; name: string; label: string; placeholder: string; value: string }
    | { type: "view"; pos: ViewBlockPosition; title: string; blocks: ViewBlock[] }
    | { type: "slot"; pos: ViewBlockPosition; name: string; content: string | null; blocks?: ViewBlock[] };

export default function BlockGrid({ blocks }: { blocks: ViewBlock[] }) {
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
                    {block.type === "listView" && (
                        <>
                            {block.title && <p className="mb-2 text-sm font-medium text-neutral-900">{block.title}</p>}
                            <ListItems items={block.items} />
                        </>
                    )}
                    {block.type === "card" && (
                        <>
                            {block.title && <p className="mb-2 text-sm font-medium text-neutral-900">{block.title}</p>}
                            <CardGrid fields={block.fields} items={block.items} />
                        </>
                    )}
                    {block.type === "form" && (
                        <>
                            {block.title && <p className="mb-3 text-sm text-neutral-600">{block.title}</p>}
                            <WebhookInputForm fields={block.fields} submitLabel={block.submitLabel} stepId={block.stepId} />
                        </>
                    )}
                    {block.type === "page" && <div dangerouslySetInnerHTML={{ __html: block.html }} />}
                    {block.type === "gap" && <div style={{ height: block.size }} aria-hidden="true" />}
                    {block.type === "label" && <p className="text-neutral-700">{block.text}</p>}
                    {block.type === "link" && (
                        <Link href={block.href} className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700">
                            {block.blocks ? <BlockGrid blocks={block.blocks} /> : block.text || "Click here"}
                        </Link>
                    )}
                    {block.type === "textInput" && (
                        <div className="flex flex-col gap-1">
                            {block.label && <label htmlFor={block.name} className="text-sm font-medium text-neutral-700">{block.label}</label>}
                            <input id={block.name} name={block.name} type="text" defaultValue={block.value} placeholder={block.placeholder} className="rounded-md border border-neutral-200 px-3 py-2 text-sm" />
                        </div>
                    )}
                    {block.type === "checkboxInput" && (
                        <label className="flex items-center gap-2">
                            <input id={block.name} name={block.name} type="checkbox" defaultChecked={block.checked} className="h-4 w-4 rounded border-neutral-300" />
                            <span className="text-sm text-neutral-700">{block.label}</span>
                        </label>
                    )}
                    {block.type === "textareaInput" && (
                        <div className="flex flex-col gap-1">
                            {block.label && <label htmlFor={block.name} className="text-sm font-medium text-neutral-700">{block.label}</label>}
                            <textarea id={block.name} name={block.name} defaultValue={block.value} placeholder={block.placeholder} rows={4} className="rounded-md border border-neutral-200 px-3 py-2 text-sm" />
                        </div>
                    )}
                    {block.type === "numberInput" && (
                        <div className="flex flex-col gap-1">
                            {block.label && <label htmlFor={block.name} className="text-sm font-medium text-neutral-700">{block.label}</label>}
                            <input id={block.name} name={block.name} type="number" defaultValue={block.value} placeholder={block.placeholder} className="rounded-md border border-neutral-200 px-3 py-2 text-sm" />
                        </div>
                    )}
                    {block.type === "slot" &&
                        (block.blocks && block.blocks.length > 0 ? (
                            <div data-slot={block.name}>
                                <BlockGrid blocks={block.blocks} />
                            </div>
                        ) : block.content ? (
                            <div data-slot={block.name}>{block.content}</div>
                        ) : (
                            <div data-slot={block.name} aria-hidden="true" />
                        ))}
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
