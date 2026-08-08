import { useHtml } from "nukejs";
import EmailStep from "../../components/auth/EmailStep";

export default function LoginPage() {
    useHtml({ title: "Sign in" });

    return (
        <main className="flex min-h-screen items-center justify-center bg-white px-6">
            <EmailStep />
        </main>
    );
}