import { useHtml } from "nukejs";
import BlockGrid from "./BlockGrid";

interface ViewProps {
    title: string;
    blocks: any[]; // ViewBlock[]
}

export default function View({ title, blocks }: ViewProps) {
    useHtml({ title });

    // No max-width/mx-auto here on purpose — unlike Static Page (a single
    // block of prose, which reads better narrow and centered), a View is
    // a whole page someone's laid out themselves across all 12 columns,
    // full-width Navbar/Footer included. Constraining it would just
    // squash their layout back into a narrow column.
    return (
        <main data-webhook-page className="flex w-full flex-col px-6 py-10">
            <BlockGrid blocks={blocks} />
        </main>
    );
}
