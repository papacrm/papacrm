interface CardGridField {
    key: string;
    label: string;
    type?: string;
}

interface CardGridItem {
    _id: string;
    title: string;
    subtitle: string;
    body: string;
    data: Record<string, any>;
}

interface CardGridProps {
    fields: CardGridField[];
    items: CardGridItem[];
}

// Renders resolved rows as a grid of cards — the card counterpart to
// ListTable.tsx's <table>. Shared by the Card step (its own page) and the
// View step's "card" blocks (see lib/steps/card.ts / lib/steps/view.ts,
// which both hand this the same { fields, items } shape from
// resolveCardItems()). Falls back to a plain field dump per card when
// none of title/subtitle/body were configured, same spirit as Table
// inferring columns when it has no schema to go on.
export default function CardGrid({ fields, items }: CardGridProps) {
    if (items.length === 0) {
        return <p className="text-sm text-neutral-500">No records yet.</p>;
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
                const hasTemplate = item.title || item.subtitle || item.body;
                return (
                    <div key={item._id} className="flex flex-col gap-2 rounded-md border border-neutral-200 p-4">
                        {hasTemplate ? (
                            <>
                                {item.title && <p className="font-medium text-neutral-900">{item.title}</p>}
                                {item.subtitle && <p className="text-sm text-neutral-500">{item.subtitle}</p>}
                                {item.body && <div className="text-sm text-neutral-700" dangerouslySetInnerHTML={{ __html: item.body }} />}
                            </>
                        ) : (
                            fields.map((field) => (
                                <p key={field.key} className="text-sm text-neutral-700">
                                    <span className="font-medium text-neutral-900">{field.label}: </span>
                                    {String(item.data?.[field.key] ?? "")}
                                </p>
                            ))
                        )}
                    </div>
                );
            })}
        </div>
    );
}
