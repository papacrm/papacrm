import { useHtml } from "nukejs";
import ListEditorLoader from "../../../../components/lists/ListEditorLoader";

export default function ListEditorPage() {
    useHtml({ title: "Edit list" });

    return <ListEditorLoader />;
}
