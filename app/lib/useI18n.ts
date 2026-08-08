import { useRequest } from "nukejs";
import en from "../locales/en.json";
import fr from "../locales/fr.json";

// ─── Types ────────────────────────────────────────────────────────────

const translations = { en, fr } as const;

export type Locale = keyof typeof translations;
export type Translations = typeof en; // fr.json must match this shape exactly

// ─── Locale resolver ──────────────────────────────────────────────────

function resolveLocale(param: string | string[] | undefined): Locale {
    if (!param) return "en";
    const tag = (Array.isArray(param) ? param[0] : param)
        .trim()
        .toLowerCase() as Locale;
    return tag in translations ? tag : "en";
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useI18n(): { t: Translations; locale: Locale } {
    const { params } = useRequest();
    const locale = resolveLocale(params.locale as string | undefined);
    return { t: translations[locale], locale };
}

export const SUPPORTED_LOCALES: Locale[] = Object.keys(translations) as Locale[];
