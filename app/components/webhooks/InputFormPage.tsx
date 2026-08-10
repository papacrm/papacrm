import { useHtml } from "nukejs";
import type { InputFormField } from "../../../lib/steps/inputForm";
import WebhookInputForm from "./WebhookInputForm";

interface InputFormPageProps {
    title: string;
    submitLabel: string;
    fields: InputFormField[];
    path: string;
}

export default function InputFormPage({ title, submitLabel, fields, path }: InputFormPageProps) {
    useHtml({ title });

    return (
        <main data-webhook-page data-path={path} className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <WebhookInputForm fields={fields} submitLabel={submitLabel} path={path} />
        </main>
    );
}