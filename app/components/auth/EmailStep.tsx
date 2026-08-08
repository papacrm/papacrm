"use client";

import { useState } from "react";
import { useRouter } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc } from "@/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailStep() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const trimmed = email.trim();
        if (!EMAIL_RE.test(trimmed)) {
            setError("Enter a valid email address.");
            return;
        }

        setLoading(true);
        try {
            const { expiresIn } = await orpc.auth.requestOtp({ email: trimmed });
            router.push(`/login/otp?email=${encodeURIComponent(trimmed)}&expiresIn=${expiresIn}`);
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>Enter your email address to receive a one-time code.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Sending code…" : "Send code"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}