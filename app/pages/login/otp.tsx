import { useHtml } from "nukejs";
import OtpStep from "../../components/auth/OtpStep";

export default function LoginOtpPage({
    email = "",
    expiresIn = "120",
}: {
    email?: string;
    expiresIn?: string;
}) {
    useHtml({ title: "Enter code" });

    return (
        <main className="flex min-h-screen items-center justify-center bg-white px-6">
            <OtpStep email={email} expiresIn={Number(expiresIn) || 120} />
        </main>
    );
}