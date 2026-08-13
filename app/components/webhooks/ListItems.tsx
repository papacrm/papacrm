import { Link } from "nukejs";
import BlockGrid from "./BlockGrid";

interface ListItemsItem {
    _id: string;
    text: string;
    card?: { title: string; subtitle: string; body: string };
    view?: any[]; // ViewBlock[]
    href?: string;
    linkText?: string;
    linkView?: any[]; // ViewBlock[]
}

interface ListItemsProps {
    items: ListItemsItem[];
}

// Renders a List View's rows as a plain <ul>/<li> list — the ul/li
// counterpart to ListTable.tsx's <table>. Shared by the List View step
// (its own page) and the View step's "listView" blocks (see
// lib/steps/listView.ts / lib/steps/view.ts, which both hand this the
// same { items } shape from resolveListItems()). When a Card is chained
// into the List View, `item.card` is set and takes over the <li>'s
// content. When a View is chained, `item.view` is set and its blocks are
// rendered. When a Link is chained, `item.href` is set and the row becomes
// a clickable link. When a Link has a View chained to it, `item.linkView`
// contains the rendered blocks.
export default function ListItems({ items }: ListItemsProps) {
    if (items.length === 0) {
        return <p className="text-sm text-neutral-500">No records yet.</p>;
    }

    return (
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-md border border-neutral-200">
            {items.map((item) => (
                <li key={item._id} className={item.href ? "" : "px-4 py-3 text-sm text-neutral-700"}>
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                            {item.linkView ? (
                                <BlockGrid blocks={item.linkView} />
                            ) : (
                                item.linkText || item.text || <span className="text-neutral-400">—</span>
                            )}
                        </Link>
                    ) : item.view ? (
                        <BlockGrid blocks={item.view} />
                    ) : item.card ? (
                        <div className="flex flex-col gap-0.5">
                            {item.card.title && <p className="font-medium text-neutral-900">{item.card.title}</p>}
                            {item.card.subtitle && <p className="text-neutral-500">{item.card.subtitle}</p>}
                            {item.card.body && <div dangerouslySetInnerHTML={{ __html: item.card.body }} />}
                        </div>
                    ) : (
                        item.text || <span className="text-neutral-400">—</span>
                    )}
                </li>
            ))}
        </ul>
    );
}
