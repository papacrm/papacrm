import { useHtml } from "nukejs";
import React from "react";
import { useI18n } from "../lib/useI18n";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const { t: { site: { name } } } = useI18n()
    useHtml({
        title: x => `${x} - ${name}`,
        link: [
            { rel: "icon", href: "/favicon.ico" },
            { rel: "stylesheet", href: "/styles.css" },
        ],
        meta: [{ name: "theme-color", content: "#ffffff" }],
    });

    return <>{children}</>;
}
