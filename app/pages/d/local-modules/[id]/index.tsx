import { useHtml } from "nukejs";
import LocalModuleEditorLoader from "../../../../components/local-modules/LocalModuleEditorLoader";

export default function LocalModuleEditorPage() {
    useHtml({ title: "Local Module" });

    return <LocalModuleEditorLoader />;
}
