import Menu, { type MenuLink } from "./Menu";

interface FooterProps {
    text: string;
    links: MenuLink[];
}

export default function Footer({ text, links }: FooterProps) {
    return (
        <footer className="flex flex-col items-center gap-3 border-t border-neutral-200 px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <span className="text-sm text-neutral-500">{text}</span>
            <Menu links={links} />
        </footer>
    );
}
