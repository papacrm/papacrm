import { useHtml } from "nukejs";
import ListsList from "../../../components/lists/ListsList";

export default function ListsPage() {
    useHtml({ title: "Lists" });

    return <ListsList />;
}
