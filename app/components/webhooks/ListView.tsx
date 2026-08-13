import { useHtml } from "nukejs";
import ListItems from "./ListItems";

interface ListViewProps {
    title: string;
    fields: { key: string; label: string; type?: string }[];
    items: { _id: string; text: string; card?: { title: string; subtitle: string; body: string } }[];
}

export default function ListView({ title, items }: ListViewProps) {
    useHtml({ title });

    return (
        <main data-webhook-page className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
            <ListItems items={items} />
        </main>
    );
}
