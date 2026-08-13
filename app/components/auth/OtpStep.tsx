"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc } from "@/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export default function OtpStep({ email, expiresIn }: { email: string; expiresIn: number }) {
    const router = useRouter();
    const [otp, setOtp] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(expiresIn);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (secondsLeft <= 0) return;
        const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(id);
    }, [secondsLeft > 0]);

    const expired = secondsLeft <= 0;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (otp.trim().length !== 6) {
            setError("Enter the 6-digit code.");
            return;
        }

        setLoading(true);
        try {
            await orpc.auth.verifyOtp({ email, otp: otp.trim() });
            router.push("/d");
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleResend() {
        setError(null);
        setResending(true);
        try {
            const res = await orpc.auth.requestOtp({ email });
            setSecondsLeft(res.expiresIn);
            setOtp("");
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't resend the code. Try again.");
        } finally {
            setResending(false);
        }
    }

    if (!email) {
        return (
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Missing email address</CardTitle>
                    <CardDescription>Start over from the sign-in page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={() => router.push("/login")}>
                        Back to sign in
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Enter the code</CardTitle>
                <CardDescription>{`We sent a 6-digit code to ${email}.`}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="otp">One-time code</Label>
                        <Input
                            id="otp"
                            name="otp"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            autoComplete="one-time-code"
                            placeholder="123456"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            disabled={loading || expired}
                            autoFocus
                        />
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {expired ? "Code expired." : `Code expires in ${formatTime(secondsLeft)}`}
                    </p>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Button type="submit" disabled={loading || expired} className="w-full">
                        {loading ? "Verifying…" : "Verify & sign in"}
                    </Button>

                    <Button type="button" variant="ghost" disabled={resending} onClick={handleResend} className="w-full">
                        {resending ? "Resending…" : "Resend code"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}