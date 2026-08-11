interface ListTableField {
    key: string;
    label: string;
    type?: string;
}

interface ListTableDocument {
    _id: string;
    data: Record<string, any>;
    createdAt?: string;
}

interface ListTableProps {
    fields: ListTableField[];
    documents: ListTableDocument[];
}

// Renders a List's records as a plain HTML table. Shared by the Table step
// (StaticPage-style, one table per page) and the Container step's "table"
// blocks (see lib/steps/table.ts / container.ts, which both hand this the
// same { fields, documents } shape from loadListTableData()).
export default function ListTable({ fields, documents }: ListTableProps) {
    if (documents.length === 0) {
        return <p className="text-sm text-neutral-500">No records yet.</p>;
    }

    return (
        <div className="overflow-x-auto rounded-md border border-neutral-200">
            <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50">
                    <tr>
                        {fields.map((field) => (
                            <th key={field.key} className="border-b border-neutral-200 px-4 py-2 font-medium text-neutral-700">
                                {field.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {documents.map((doc) => (
                        <tr key={doc._id} className="border-b border-neutral-100 last:border-0">
                            {fields.map((field) => (
                                <td key={field.key} className="px-4 py-2 text-neutral-700">
                                    {String(doc.data?.[field.key] ?? "")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
