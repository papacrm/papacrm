import { useHtml } from "nukejs";
import type { InputFormField } from "../../lib-server/steps/inputForm";
import WebhookInputForm from "./WebhookInputForm";

interface InputFormPageProps {
    title: string;
    submitLabel: string;
    fields: InputFormField[];
    stepId: string;
}

export default function InputFormPage({ title, submitLabel, fields, stepId }: InputFormPageProps) {
    useHtml({ title });

    return (
        <main data-webhook-page className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <WebhookInputForm fields={fields} submitLabel={submitLabel} stepId={stepId} />
        </main>
    );
}