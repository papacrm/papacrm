import { useHtml } from "nukejs";
import WorkflowsList from "../../../components/workflows/WorkflowsList";

export default function WorkflowsPage() {
    useHtml({ title: "Workflows" });

    return <WorkflowsList />;
}