// ─── Why this file exists ──────────────────────────────────────────────
// Tailwind can't see class names that are assembled at runtime — v4's
// build scans the *source tree* for tokens that look like utility
// classes (e.g. it'll happily find `text-lg` sitting in a comment) and
// only ever generates CSS for what it finds there. A string built like
// `text-${size}` never appears as a literal token anywhere, so Tailwind
// never generates `.text-lg { ... }` and the class does nothing at
// runtime, no matter how correct the HTML is.
//
// The Class step (see app/lib/step-defs/class.ts and
// app/lib-server/steps/class.ts) needs exactly that: a user picks "lg"
// from a dropdown, stored as plain data in Mongo, resolved into a class
// string when a page renders. The fix is to never let a class name be
// anything other than a literal string constant. Every table below maps
// a stored value (e.g. "lg") to a hard-coded utility class (e.g.
// "text-lg") — because the full class name is spelled out literally
// *somewhere in the source*, Tailwind's scanner finds it at build time
// and generates the CSS for it, and the lookup at render time just picks
// which already-generated class to use. Same trick as a manual
// "safelist" — this file *is* the safelist, and it doubles as the data
// that drives the editor's dropdowns so the two can never drift apart.
//
// Rule for anyone extending this file: every value must be a complete,
// literal Tailwind class name. Never build one with `${}` or `+`.

export interface ClassOption {
    value: string;
    label: string;
}

const OPTION = (value: string, label: string): ClassOption => ({ value, label });

// ─── Text size (Label) ──────────────────────────────────────────────────
export const TEXT_SIZE_CLASS: Record<string, string> = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
    "5xl": "text-5xl",
};

export const TEXT_SIZE_OPTIONS: ClassOption[] = [
    OPTION("", "Default"),
    OPTION("xs", "XS"),
    OPTION("sm", "SM"),
    OPTION("md", "MD (base)"),
    OPTION("lg", "LG"),
    OPTION("xl", "XL"),
    OPTION("2xl", "2XL"),
    OPTION("3xl", "3XL"),
    OPTION("4xl", "4XL"),
    OPTION("5xl", "5XL"),
];

// ─── Font weight (Label) ────────────────────────────────────────────────
export const FONT_WEIGHT_CLASS: Record<string, string> = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
    extrabold: "font-extrabold",
};

export const FONT_WEIGHT_OPTIONS: ClassOption[] = [
    OPTION("", "Default"),
    OPTION("normal", "Normal"),
    OPTION("medium", "Medium"),
    OPTION("semibold", "Semibold"),
    OPTION("bold", "Bold"),
    OPTION("extrabold", "Extrabold"),
];

// ─── Text alignment (Label) ─────────────────────────────────────────────
export const TEXT_ALIGN_CLASS: Record<string, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
};

export const TEXT_ALIGN_OPTIONS: ClassOption[] = [
    OPTION("", "Default"),
    OPTION("left", "Left"),
    OPTION("center", "Center"),
    OPTION("right", "Right"),
];

// ─── Color palette (Label text/bg, Div bg) ──────────────────────────────
// One fixed shade for "solid" and one for "soft" per color — a curated
// set rather than the full 22-color x 11-shade Tailwind grid, so this
// stays a short, legible file instead of a few thousand line lookup.
const PALETTE = ["slate", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "pink"] as const;

export const TEXT_COLOR_CLASS: Record<string, string> = {
    slate: "text-slate-600",
    red: "text-red-600",
    orange: "text-orange-600",
    amber: "text-amber-600",
    yellow: "text-yellow-600",
    lime: "text-lime-600",
    green: "text-green-600",
    emerald: "text-emerald-600",
    teal: "text-teal-600",
    cyan: "text-cyan-600",
    sky: "text-sky-600",
    blue: "text-blue-600",
    indigo: "text-indigo-600",
    violet: "text-violet-600",
    purple: "text-purple-600",
    pink: "text-pink-600",
    white: "text-white",
    black: "text-black",
};

export const BG_COLOR_SOLID_CLASS: Record<string, string> = {
    slate: "bg-slate-500",
    red: "bg-red-500",
    orange: "bg-orange-500",
    amber: "bg-amber-500",
    yellow: "bg-yellow-500",
    lime: "bg-lime-500",
    green: "bg-green-500",
    emerald: "bg-emerald-500",
    teal: "bg-teal-500",
    cyan: "bg-cyan-500",
    sky: "bg-sky-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    violet: "bg-violet-500",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
    white: "bg-white",
    black: "bg-black",
    transparent: "bg-transparent",
};

export const BG_COLOR_SOFT_CLASS: Record<string, string> = {
    slate: "bg-slate-100",
    red: "bg-red-100",
    orange: "bg-orange-100",
    amber: "bg-amber-100",
    yellow: "bg-yellow-100",
    lime: "bg-lime-100",
    green: "bg-green-100",
    emerald: "bg-emerald-100",
    teal: "bg-teal-100",
    cyan: "bg-cyan-100",
    sky: "bg-sky-100",
    blue: "bg-blue-100",
    indigo: "bg-indigo-100",
    violet: "bg-violet-100",
    purple: "bg-purple-100",
    pink: "bg-pink-100",
    white: "bg-white",
    black: "bg-black",
    transparent: "bg-transparent",
};

export const TEXT_COLOR_OPTIONS: ClassOption[] = [
    OPTION("", "Default"),
    ...PALETTE.map((c) => OPTION(c, c[0].toUpperCase() + c.slice(1))),
    OPTION("white", "White"),
    OPTION("black", "Black"),
];

export const BG_COLOR_OPTIONS: ClassOption[] = [
    OPTION("", "None"),
    ...PALETTE.map((c) => OPTION(c, c[0].toUpperCase() + c.slice(1))),
    OPTION("white", "White"),
    OPTION("black", "Black"),
    OPTION("transparent", "Transparent"),
];

// ─── Flex layout (Div) ───────────────────────────────────────────────────
export const DIRECTION_CLASS: Record<string, string> = {
    row: "flex-row",
    col: "flex-col",
};

export const DIRECTION_OPTIONS: ClassOption[] = [
    OPTION("", "Default (block)"),
    OPTION("row", "Row"),
    OPTION("col", "Column"),
];

export const ITEMS_ALIGN_CLASS: Record<string, string> = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
};

export const ITEMS_ALIGN_OPTIONS: ClassOption[] = [
    OPTION("", "Default"),
    OPTION("start", "Start"),
    OPTION("center", "Center"),
    OPTION("end", "End"),
    OPTION("stretch", "Stretch"),
    OPTION("baseline", "Baseline"),
];

export const JUSTIFY_CLASS: Record<string, string> = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly",
};

export const JUSTIFY_OPTIONS: ClassOption[] = [
    OPTION("", "Default"),
    OPTION("start", "Start"),
    OPTION("center", "Center"),
    OPTION("end", "End"),
    OPTION("between", "Space between"),
    OPTION("around", "Space around"),
    OPTION("evenly", "Space evenly"),
];

// ─── Spacing (Div) ───────────────────────────────────────────────────────
export const GAP_CLASS: Record<string, string> = {
    "0": "gap-0",
    "1": "gap-1",
    "2": "gap-2",
    "3": "gap-3",
    "4": "gap-4",
    "6": "gap-6",
    "8": "gap-8",
    "10": "gap-10",
    "12": "gap-12",
};

export const PADDING_CLASS: Record<string, string> = {
    "0": "p-0",
    "1": "p-1",
    "2": "p-2",
    "3": "p-3",
    "4": "p-4",
    "6": "p-6",
    "8": "p-8",
    "10": "p-10",
    "12": "p-12",
    "16": "p-16",
};

export const MARGIN_CLASS: Record<string, string> = {
    "0": "m-0",
    "1": "m-1",
    "2": "m-2",
    "3": "m-3",
    "4": "m-4",
    "6": "m-6",
    "8": "m-8",
    "10": "m-10",
    "12": "m-12",
    "16": "m-16",
};

const SPACING_OPTIONS_BASE: ClassOption[] = [
    OPTION("", "None"),
    OPTION("0", "0"),
    OPTION("1", "1 (0.25rem)"),
    OPTION("2", "2 (0.5rem)"),
    OPTION("3", "3 (0.75rem)"),
    OPTION("4", "4 (1rem)"),
    OPTION("6", "6 (1.5rem)"),
    OPTION("8", "8 (2rem)"),
    OPTION("10", "10 (2.5rem)"),
    OPTION("12", "12 (3rem)"),
];

export const GAP_OPTIONS: ClassOption[] = SPACING_OPTIONS_BASE;
export const PADDING_OPTIONS: ClassOption[] = [...SPACING_OPTIONS_BASE, OPTION("16", "16 (4rem)")];
export const MARGIN_OPTIONS: ClassOption[] = [...SPACING_OPTIONS_BASE, OPTION("16", "16 (4rem)")];

// ─── Shape (Div) ─────────────────────────────────────────────────────────
export const ROUNDED_CLASS: Record<string, string> = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-full",
};

export const ROUNDED_OPTIONS: ClassOption[] = [
    OPTION("", "Default"),
    OPTION("none", "None"),
    OPTION("sm", "SM"),
    OPTION("md", "MD"),
    OPTION("lg", "LG"),
    OPTION("xl", "XL"),
    OPTION("2xl", "2XL"),
    OPTION("full", "Full (pill)"),
];

export const SHADOW_CLASS: Record<string, string> = {
    none: "shadow-none",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
};

export const SHADOW_OPTIONS: ClassOption[] = [
    OPTION("", "None"),
    OPTION("sm", "SM"),
    OPTION("md", "MD"),
    OPTION("lg", "LG"),
    OPTION("xl", "XL"),
];

export const WIDTH_CLASS: Record<string, string> = {
    auto: "w-auto",
    full: "w-full",
    screen: "w-screen",
    fit: "w-fit",
    half: "w-1/2",
    third: "w-1/3",
};

export const WIDTH_OPTIONS: ClassOption[] = [
    OPTION("", "Default"),
    OPTION("auto", "Auto"),
    OPTION("full", "Full (100%)"),
    OPTION("half", "Half (50%)"),
    OPTION("third", "Third (33%)"),
    OPTION("screen", "Screen"),
    OPTION("fit", "Fit content"),
];

// Boolean toggle — only one literal class needed, so no lookup table.
export const BORDER_CLASS = "border border-neutral-200";

// ─── The data shape stored on a Class node ──────────────────────────────
export interface ClassStepData {
    // Label-oriented
    size?: string;
    weight?: string;
    textAlign?: string;
    // Shared (Label + Div)
    textColor?: string;
    bgColor?: string;
    bgSoft?: boolean;
    // Div-oriented
    direction?: string;
    itemsAlign?: string;
    justify?: string;
    gap?: string;
    padding?: string;
    margin?: string;
    rounded?: string;
    shadow?: string;
    width?: string;
    border?: boolean;
    // Escape hatch for anything the pickers above don't cover. Best
    // effort only — unlike every class above, arbitrary text typed here
    // isn't guaranteed to survive the Tailwind build unless that exact
    // class also happens to appear literally somewhere else in the
    // source (see the file header comment).
    custom?: string;
}

// Pure, deterministic, and only ever looks values up in the tables above
// — used identically by the editor (live preview + node summary) and by
// the server renderer (lib-server/steps/class.ts), so what you see while
// editing is exactly what ships.
export function buildClassName(data: ClassStepData | null | undefined): string {
    if (!data) return "";
    const classes: string[] = [];

    if (data.size && TEXT_SIZE_CLASS[data.size]) classes.push(TEXT_SIZE_CLASS[data.size]);
    if (data.weight && FONT_WEIGHT_CLASS[data.weight]) classes.push(FONT_WEIGHT_CLASS[data.weight]);
    if (data.textAlign && TEXT_ALIGN_CLASS[data.textAlign]) classes.push(TEXT_ALIGN_CLASS[data.textAlign]);
    if (data.textColor && TEXT_COLOR_CLASS[data.textColor]) classes.push(TEXT_COLOR_CLASS[data.textColor]);

    if (data.bgColor) {
        const table = data.bgSoft ? BG_COLOR_SOFT_CLASS : BG_COLOR_SOLID_CLASS;
        if (table[data.bgColor]) classes.push(table[data.bgColor]);
    }

    const isFlex = Boolean(data.direction || data.itemsAlign || data.justify || data.gap);
    if (isFlex) classes.push("flex");
    if (data.direction && DIRECTION_CLASS[data.direction]) classes.push(DIRECTION_CLASS[data.direction]);
    if (data.itemsAlign && ITEMS_ALIGN_CLASS[data.itemsAlign]) classes.push(ITEMS_ALIGN_CLASS[data.itemsAlign]);
    if (data.justify && JUSTIFY_CLASS[data.justify]) classes.push(JUSTIFY_CLASS[data.justify]);
    if (data.gap && GAP_CLASS[data.gap]) classes.push(GAP_CLASS[data.gap]);

    if (data.padding && PADDING_CLASS[data.padding]) classes.push(PADDING_CLASS[data.padding]);
    if (data.margin && MARGIN_CLASS[data.margin]) classes.push(MARGIN_CLASS[data.margin]);
    if (data.rounded && ROUNDED_CLASS[data.rounded]) classes.push(ROUNDED_CLASS[data.rounded]);
    if (data.shadow && SHADOW_CLASS[data.shadow]) classes.push(SHADOW_CLASS[data.shadow]);
    if (data.width && WIDTH_CLASS[data.width]) classes.push(WIDTH_CLASS[data.width]);
    if (data.border) classes.push(BORDER_CLASS);

    if (data.custom) classes.push(data.custom.trim());

    return classes.join(" ").trim();
}
