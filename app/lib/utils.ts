import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CSSProperties } from "react";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Turns a raw CSS declaration block (e.g. what a Style node — see
// app/lib/node-defs/style.ts — stores, "color: #eee; padding: 4px 8px;")
// into the object React's `style` prop expects, since React never
// accepts `style` as a plain string. Declarations split on ";", each
// split on the *first* ":" only (so a value containing its own colon,
// e.g. a URL in `background: url(http://...)`, survives intact), and a
// kebab-case property is camelCased the way inline styles need
// ("background-color" -> "backgroundColor"); custom properties
// ("--my-color") are left as-is, matching how React itself treats them.
// Anything malformed (no colon, an empty side) is skipped rather than
// thrown on — one bad declaration in a person's Style node shouldn't
// blank out every valid one alongside it.
export function parseInlineStyle(css: string | undefined | null): CSSProperties {
    if (!css) return {};
    const style: Record<string, string> = {};
    for (const rawDeclaration of css.split(";")) {
        const declaration = rawDeclaration.trim();
        if (!declaration) continue;
        const colonIndex = declaration.indexOf(":");
        if (colonIndex === -1) continue;
        const rawProp = declaration.slice(0, colonIndex).trim();
        const value = declaration.slice(colonIndex + 1).trim();
        if (!rawProp || !value) continue;
        const prop = rawProp.startsWith("--") ? rawProp : rawProp.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        style[prop] = value;
    }
    return style as CSSProperties;
}
