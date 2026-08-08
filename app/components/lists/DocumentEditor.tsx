"use client";

import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import type { ListField } from "@/app/lib/listTypes";

const SELECT_CLASS =
    "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

interface DocumentEditorProps {
    fields: ListField[];
    value: Record<string, any>;
    onChange: (key: string, value: any) => void;
    disabled?: boolean;
}

export default function DocumentEditor({ fields, value, onChange, disabled }: DocumentEditorProps) {
    if (fields.length === 0) {
        return <p className="text-sm text-neutral-500">Add a field to the schema above before creating documents.</p>;
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => {
                const inputId = `field-${field.key}`;
                return (
                    <div key={field.key} className="flex flex-col gap-1.5">
                        <Label htmlFor={inputId}>{field.label}</Label>
                        <FieldControl id={inputId} field={field} raw={value[field.key]} disabled={disabled} onChange={(v) => onChange(field.key, v)} />
                    </div>
                );
            })}
        </div>
    );
}

function FieldControl({
    id,
    field,
    raw,
    disabled,
    onChange,
}: {
    id: string;
    field: ListField;
    raw: any;
    disabled?: boolean;
    onChange: (value: any) => void;
}) {
    switch (field.type) {
        case "boolean":
            return (
                <label className="flex h-10 items-center gap-2 text-sm text-neutral-700">
                    <input
                        id={id}
                        type="checkbox"
                        checked={Boolean(raw)}
                        disabled={disabled}
                        onChange={(e) => onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                    />
                    {raw ? "Yes" : "No"}
                </label>
            );
        case "select":
            return (
                <select id={id} value={raw ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS}>
                    <option value="" disabled>
                        Choose…
                    </option>
                    {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            );
        case "number":
            return <Input id={id} type="number" value={raw ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
        case "date":
            return <Input id={id} type="date" value={raw ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
        case "text":
        default:
            return <Input id={id} type="text" value={raw ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
    }
}
