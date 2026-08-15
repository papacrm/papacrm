import { useHtml, Link } from "nukejs";
import LogoutButton from "../../components/dashboard/LogoutButton";

// Every request under /d is already gated by the refresh-token check in
// middleware.ts before it ever reaches this layout, so there's no need to
// re-verify a token here — this is just the shared shell. Per-request user
// data (e.g. permissions) is read client-side straight from the
// access_token cookie (see app/lib/session.ts) so the page can paint
// without waiting on a round trip — auth.me() is only called on demand,
// e.g. from the dashboard's "Check /me" button, which does go through the
// real protected-procedure / access-token check server-side.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    useHtml({ title: (prev) => `${prev} — Dashboard` });

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-white">
            <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
                <div className="flex items-center gap-6">
                    <span className="text-sm font-semibold tracking-tight text-neutral-900">PapaCRM</span>
                    <nav className="flex items-center gap-4 text-sm text-neutral-500">
                        <Link href="/d" className="hover:text-neutral-900">
                            Overview
                        </Link>
                        <Link href="/d/modules" className="hover:text-neutral-900">
                            Modules
                        </Link>
                        <Link href="/d/lists" className="hover:text-neutral-900">
                            Lists
                        </Link>
                    </nav>
                </div>
                <LogoutButton />
            </header>
            {/* min-h-0 is what lets this actually shrink to the remaining
                space instead of growing past the viewport — a flex child
                ignores its parent's height without it. overflow-y-auto
                keeps normal pages scrolling in here, not at the document
                level; a page that wants to fill this exactly (e.g. the
                module editor) can use h-full and manage its own
                scrolling internally instead of relying on this one. */}
            <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10">{children}</main>
        </div>
    );
}