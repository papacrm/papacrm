import { useHtml } from "nukejs";
import React from "react";
import { useI18n } from "../lib/useI18n";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    try {
        // Site name no longer appended to the title (see title() below) —
        // useI18n() is still called for its other setup side effects.
        useI18n();
        useHtml({
            title: (x) => `${x}`,
            link: [
                { rel: "icon", href: "/favicon.ico" },
                { rel: "stylesheet", href: "/styles.css" },
            ],
            meta: [{ name: "theme-color", content: "#ffffff" }],
        });

        return <>{children}</>;
    } catch {
        // useI18n/useHtml (or anything else added here later) threw — fall
        // back to bare children so _404.tsx / _500.tsx can still render
        // instead of looping back through a broken layout.
        return <>{children}</>;
    }
}