import { useHtml } from "nukejs";
import LocalModuleEditor from "../../../../components/local-modules/LocalModuleEditor";

export default function LocalModuleEditorPage() {
    useHtml({ title: "Local Module" });

    return <LocalModuleEditor />;
}
