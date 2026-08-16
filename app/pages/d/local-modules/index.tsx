import { useHtml } from "nukejs";
import LocalModulesList from "../../../components/local-modules/LocalModulesList";

export default function LocalModulesPage() {
    useHtml({ title: "Local Modules" });

    return <LocalModulesList />;
}
