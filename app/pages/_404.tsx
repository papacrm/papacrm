import { useHtml, Link } from "nukejs";
import { buttonVariants } from "@/app/components/ui/button";

export default function NotFound() {
    useHtml({ title: "Page Not Found" });

    return (
        <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-sm font-semibold tracking-wide text-neutral-400">404</p>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Page not found</h1>
            <p className="max-w-sm text-sm text-neutral-500">The page you're looking for doesn't exist, or may have been moved.</p>
            <div className="mt-2 flex gap-2">
                <Link href="/" className={buttonVariants({ variant: "default" })}>
                    Go home
                </Link>
                <Link href="/d" className={buttonVariants({ variant: "outline" })}>
                    Go to dashboard
                </Link>
            </div>
        </main>
    );
}
