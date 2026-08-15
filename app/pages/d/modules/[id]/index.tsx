import { useHtml } from "nukejs";
import ModuleEditorLoader from "../../../../components/modules/ModuleEditorLoader";

export default function ModuleEditorPage() {
    useHtml({ title: "Edit module" });

    return <ModuleEditorLoader />;
}