import { useHtml } from "nukejs";
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
        <div className="min-h-screen bg-white">
            <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
                <span className="text-sm font-semibold tracking-tight text-neutral-900">PapaCRM</span>
                <LogoutButton />
            </header>
            <main className="px-6 py-10">{children}</main>
        </div>
    );
}