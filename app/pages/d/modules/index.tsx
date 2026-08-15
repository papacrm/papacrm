import { useHtml } from "nukejs";
import ModulesList from "../../../components/modules/ModulesList";

export default function ModulesPage() {
    useHtml({ title: "Modules" });

    return <ModulesList />;
}