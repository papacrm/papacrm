import { useHtml } from "nukejs";
import { useI18n } from "../../lib/useI18n";
import Hero from "../../components/Hero";

// Only reached for non-default locales (e.g. "/fr"). Requests to "/en"
// (the default locale) are redirected to "/" by middleware.ts before
// routing ever gets here.
export default function Home() {
    const { t } = useI18n();

    useHtml({
        title: t.site.title,
        htmlAttrs: { lang: t.meta.lang },
        meta: [
            { name: "description", content: t.site.description },
            { property: "og:title", content: t.site.title },
            { property: "og:description", content: t.site.description },
        ],
    });

    return <Hero />;
}