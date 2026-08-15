import type { ComponentType } from "react";
import { useHtml } from "nukejs";

interface PageExtrasProps {
    htmlAttrs?: { lang?: string; className?: string };
    styles?: string[];
    scripts?: string[];
}

// Cross-cutting page effects queued by nodes that aren't themselves a page
// (Html, Load CSS, State — see lib/nodes/html.ts, css.ts, state.ts) end up
// on the *run's* result, not on whichever specific page node (Static Page,
// View, Table, ...) happens to render the response — same reasoning as
// Set Header/Set Cookie in lib/nodes/setHeader.ts and lib/nodes/types.ts's
// ModuleResultExtras. Rendering the actual `<html lang>`/`class`, the
// loaded CSS, and any queued scripts therefore can't live inside any one
// page component either.
//
// Rather than thread these through every WEBHOOK_PAGE_COMPONENTS entry's
// own props, this is rendered as a sibling of the real page component at
// the two render call sites (server/hooks/[...path].ts, middleware.ts).
// `useHtml()` can be called from any component in the tree — it isn't
// scoped to whoever happens to be "the" page — so a tiny sibling that only
// calls it is enough; it renders no DOM of its own.
export default function PageExtras({ htmlAttrs, styles, scripts }: PageExtrasProps) {
    useHtml({
        htmlAttrs: htmlAttrs && (htmlAttrs.lang || htmlAttrs.className) ? htmlAttrs : undefined,
        style: styles?.length ? styles.map((content) => ({ content })) : undefined,
        script: scripts?.length ? scripts.map((content) => ({ position: "body" as const, content })) : undefined,
    });

    return null;
}

// Wraps a WEBHOOK_PAGE_COMPONENTS entry so it renders PageExtras alongside
// itself. A plain function, not JSX, so the two render call sites
// (server/hooks/[...path].ts, middleware.ts) can use it without needing to
// be .tsx files themselves.
export function withPageExtras(Component: ComponentType<any>, extras: PageExtrasProps): ComponentType<any> {
    return function PageWithExtras(props: any) {
        return (
            <>
                <PageExtras {...extras} />
                <Component {...props} />
            </>
        );
    };
}
