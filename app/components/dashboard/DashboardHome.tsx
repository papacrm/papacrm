"use client";

import { useEffect, useState } from "react";
import { Link } from "nukejs";
import { getAccessTokenFromCookie, type DecodedAccessToken } from "@/app/lib/session";

export default function DashboardHome() {
    // Permissions come straight from the access_token cookie — it's
    // deliberately non-httpOnly (see lib/cookies.ts) so the dashboard can
    // paint immediately, with no round trip to auth.me() and nothing that
    // can 401 on first load. The server still enforces the real
    // access-control check on every protected oRPC call regardless of what
    // this shows.
    const [session, setSession] = useState<DecodedAccessToken | null>(null);

    useEffect(() => {
        // The cookie isn't readable during SSR, so pick it up once mounted.
        setSession(getAccessTokenFromCookie());
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Dashboard</h1>

            {session ? (
                <div className="mt-4">
                    <p className="text-neutral-500">You're signed in.</p>
                    <p className="mt-1 text-sm text-neutral-500">
                        Permissions: <span className="font-mono">{session.permissions.join(", ") || "none"}</span>
                    </p>
                </div>
            ) : (
                <p className="mt-2 text-neutral-500">No access token cookie found — you may need to sign in again.</p>
            )}

            <Link
                href="/d/modules"
                className="mt-6 flex max-w-sm items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-sm hover:border-neutral-300 hover:bg-neutral-50"
            >
                <span>
                    <span className="block font-medium text-neutral-900">Modules</span>
                    <span className="block text-neutral-500">Build automations with webhooks, HTTP requests, conditions, and pages</span>
                </span>
                <span aria-hidden>→</span>
            </Link>
        </div>
    );
}