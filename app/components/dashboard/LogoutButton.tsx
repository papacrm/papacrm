"use client";

import { useState } from "react";
import { useRouter } from "nukejs";
import { orpc } from "@/client";
import { Button } from "@/app/components/ui/button";

export default function LogoutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleLogout() {
        setLoading(true);
        try {
            await orpc.auth.logout();
        } finally {
            // Clear cookies is best-effort on the server side; either way,
            // bounce to /login and replace history so "back" doesn't
            // return to a now-unauthenticated /d.
            router.replace("/login");
        }
    }

    return (
        <Button type="button" variant="outline" size="sm" onClick={handleLogout} disabled={loading}>
            {loading ? "Signing out…" : "Log out"}
        </Button>
    );
}
