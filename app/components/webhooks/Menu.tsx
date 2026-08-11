import { Link } from "nukejs";

export interface MenuLink {
    label: string;
    href: string;
}

interface MenuProps {
    links: MenuLink[];
    // "horizontal" (default) lays links out in a row, like a typical top
    // nav; "vertical" stacks them, for a sidebar or a mobile-style menu.
    orientation?: "horizontal" | "vertical";
}

// A plain link list, used both as its own block inside a View and as the
// link-rendering piece Navbar/Footer reuse. Uses NukeJS's <Link> so it
// gets client-side navigation once/if the page is hydrated; on a
// webhook-rendered page (no hydration — see the long comment in
// WebhookInputForm.tsx) it still degrades cleanly to a normal <a href>.
export default function Menu({ links, orientation = "horizontal" }: MenuProps) {
    if (links.length === 0) return null;

    return (
        <nav className={orientation === "vertical" ? "flex flex-col gap-3" : "flex flex-wrap gap-5"}>
            {links.map((link, i) => (
                <Link key={i} href={link.href} className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}
