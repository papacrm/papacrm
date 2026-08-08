"use client";
import { useRouter } from "nukejs";
import type { Locale } from "../lib/useI18n";

const DEFAULT_LOCALE: Locale = "en";
// Locales that keep a URL prefix. The default locale is served unprefixed.
const PREFIXED_LOCALES: Locale[] = ["fr"];

const LOCALES: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "fr", label: "FR" },
];

const PREFIX_PATTERN = new RegExp(`^/(${PREFIXED_LOCALES.join("|")})(?=/|$)`);

export default function LangSwitcher({ current }: { current: Locale }) {
    const router = useRouter();

    function switchTo(next: Locale) {
        // Strip any existing prefixed-locale segment, then re-apply the
        // target locale's prefix (none for the default locale).
        // e.g. "/fr/about" -> "/about" -> "/about" (en) or "/fr/about" (fr)
        const stripped = window.location.pathname.replace(PREFIX_PATTERN, "") || "/";
        const target = next === DEFAULT_LOCALE ? stripped : `/${next}${stripped === "/" ? "" : stripped}`;
        router.push(target);
    }

    return (
        <div className="inline-flex items-center rounded-md border border-border bg-secondary/40 p-0.5 font-mono text-xs">
            {LOCALES.map(({ code, label }) => (
                <button
                    key={code}
                    onClick={() => switchTo(code)}
                    disabled={code === current}
                    aria-current={code === current ? "true" : undefined}
                    aria-label={`Switch to ${label}`}
                    className={
                        code === current
                            ? "rounded-[3px] bg-primary px-2.5 py-1 text-primary-foreground"
                            : "rounded-[3px] px-2.5 py-1 text-muted-foreground hover:text-foreground"
                    }
                >
                    {label}
                </button>
            ))}
        </div>
    );
}