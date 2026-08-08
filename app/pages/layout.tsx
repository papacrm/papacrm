import { useHtml } from "nukejs";
import React from "react";
import { useI18n } from "../lib/useI18n";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    try {
        const {
            t: {
                site: { name },
            },
        } = useI18n();
        useHtml({
            title: (x) => `${x} - ${name}`,
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