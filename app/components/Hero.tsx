import { Link } from "nukejs";
import { useI18n } from "../lib/useI18n";
import Logo from "./Logo";

// Rendered by both app/pages/index.tsx (default locale, "/") and
// app/pages/[locale]/index.tsx (prefixed locales, e.g. "/fr"). useI18n()
// reads the resolved locale from the request context, so this component
// needs no props — it works correctly regardless of which page renders it.
export default function Hero() {
    const { t } = useI18n();

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
            <span className="-mb-6">
                <Logo />
            </span>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
                {t.hero.eyebrow}
            </p>

            <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight text-neutral-900 sm:text-6xl">
                {t.hero.headline}
            </h1>

            <p className="mx-auto mt-6 max-w-md text-balance text-base leading-relaxed text-neutral-500 sm:text-lg">
                {t.hero.body}
            </p>

            <Link
                href="/d/"
                className="mt-10 inline-flex h-12 items-center justify-center rounded-md bg-neutral-900 px-8 text-base font-medium text-white transition-colors hover:bg-neutral-700"
            >
                {t.hero.primaryCta}
            </Link>
        </main>
    );
}
