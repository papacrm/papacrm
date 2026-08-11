import Menu, { type MenuLink } from "./Menu";

interface NavbarProps {
    brand: string;
    links: MenuLink[];
}

export default function Navbar({ brand, links }: NavbarProps) {
    return (
        <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <span className="text-base font-semibold text-neutral-900">{brand}</span>
            <Menu links={links} />
        </header>
    );
}
