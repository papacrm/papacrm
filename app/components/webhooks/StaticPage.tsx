import { useHtml } from "nukejs";

interface StaticPageProps {
    title: string;
    html: string;
}

// Renders a workflow's Static Page step. This used to be a hand-built
// `<!doctype html>...` string assembled by lib/steps/staticPage.ts and
// dumped straight onto the response (see server/hooks/[...path].ts's git
// history). Going through a real component here — rendered via NukeJS's
// `renderComponent()` — means the page gets a proper <head> (title, the
// app's stylesheet, favicon) via the shared RootLayout instead of a bare,
// unstyled document.
//
// `html` is still injected raw: it's whatever HTML the person building the
// workflow typed into the editor's "HTML" field, not user input from a
// site visitor, so it's meant to be trusted markup rather than escaped
// text.
export default function StaticPage({ title, html }: StaticPageProps) {
    useHtml({ title });

    return (
        <main data-webhook-page className="mx-auto max-w-2xl px-6 py-12">
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </main>
    );
}