import { useHtml } from "nukejs";
import ListTable from "./ListTable";

interface TableProps {
    title: string;
    fields: { key: string; label: string; type?: string }[];
    documents: { _id: string; data: Record<string, any>; createdAt?: string }[];
}

export default function Table({ title, fields, documents }: TableProps) {
    useHtml({ title });

    return (
        <main data-webhook-page className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
            <ListTable fields={fields} documents={documents} />
        </main>
    );
}
