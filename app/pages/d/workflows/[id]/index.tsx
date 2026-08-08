import { useHtml } from "nukejs";
import WorkflowEditorLoader from "../../../../components/workflows/WorkflowEditorLoader";

export default function WorkflowEditorPage() {
    useHtml({ title: "Edit workflow" });

    return <WorkflowEditorLoader />;
}