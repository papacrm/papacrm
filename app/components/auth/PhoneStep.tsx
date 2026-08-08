"use client";

import { useState } from "react";
import { useRouter } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc } from "@/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

export default function PhoneStep() {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const trimmed = phone.trim();
        if (!/^\+?[0-9]{7,15}$/.test(trimmed)) {
            setError("Enter a valid cellphone number.");
            return;
        }

        setLoading(true);
        try {
            const { expiresIn } = await orpc.auth.requestOtp({ phone: trimmed });
            router.push(`/login/otp?phone=${encodeURIComponent(trimmed)}&expiresIn=${expiresIn}`);
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
                <CardDescription>Enter your cellphone number to receive a one-time code.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="phone">Cellphone number</Label>
                        <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="+1 555 123 4567"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
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
