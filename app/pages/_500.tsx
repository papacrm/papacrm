import { useHtml, Link } from "nukejs";
import { buttonVariants } from "@/app/components/ui/button";

interface ErrorProps {
    errorMessage?: string; // human-readable error description
    errorStatus?: string; // HTTP status code if set on the thrown error
    errorStack?: string; // stack trace — only populated in development
}

export default function ServerError({ errorMessage, errorStatus, errorStack }: ErrorProps) {
    useHtml({ title: "Something went wrong" });

    return (
        <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-sm font-semibold tracking-wide text-neutral-400">{errorStatus ?? "500"}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Something went wrong</h1>
            <p className="max-w-sm text-sm text-neutral-500">
                We hit a snag on our end. Try again in a moment — if it keeps happening, let us know.
            </p>

            {/* errorMessage is safe to show in both dev and prod — it's the
                same message a caller sets explicitly via `err.status` /
                `res.json({ error })`, never a raw internal stack. */}
            {errorMessage && (
                <p className="max-w-md rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{errorMessage}</p>
            )}

            {/* errorStack is only ever populated outside production (see
                the framework's error-handling docs) — no extra env check
                needed here, but the conditional render still means nothing
                shows if it's undefined. */}
            {errorStack && (
                <pre className="max-w-2xl overflow-x-auto rounded-md bg-neutral-900 p-4 text-left text-xs text-neutral-100">
                    <code>{errorStack}</code>
                </pre>
            )}

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
