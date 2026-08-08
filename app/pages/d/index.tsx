import { useHtml } from "nukejs";
import DashboardHome from "../../components/dashboard/DashboardHome";

export default function Dashboard() {
    useHtml({ title: "Overview" });

    return <DashboardHome />;
}
