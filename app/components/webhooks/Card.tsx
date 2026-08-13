import { useHtml } from "nukejs";
import CardGrid from "./CardGrid";

interface CardPageProps {
    title: string;
    fields: { key: string; label: string; type?: string }[];
    items: { _id: string; title: string; subtitle: string; body: string; data: Record<string, any> }[];
}

export default function CardPage({ title, fields, items }: CardPageProps) {
    useHtml({ title });

    return (
        <main data-webhook-page className="mx-auto max-w-5xl px-6 py-12">
            <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
            <CardGrid fields={fields} items={items} />
        </main>
    );
}
