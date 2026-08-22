import { useHtml } from "nukejs";
import type { InputFormField } from "../../lib-server/nodes/inputForm";
import WebhookInputForm from "./WebhookInputForm";

interface InputFormPageProps {
    title: string;
    submitLabel: string;
    fields: InputFormField[];
    nodeId: string;
    // See the "carry" doc on WebhookInputFormProps — passed straight
    // through from inputForm.ts's own page props.
    carry?: string;
}

export default function InputFormPage({ title, submitLabel, fields, nodeId, carry }: InputFormPageProps) {
    useHtml({ title });

    return (
        <main data-webhook-page className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <WebhookInputForm fields={fields} submitLabel={submitLabel} nodeId={nodeId} carry={carry} />
        </main>
    );
}