import Link from "next/link";

const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "This Week", href: "/week" },
    { label: "Quests", href: "/quests" }
];

export default function Sidebar() {
    return (
        <aside className="h-screen w-64 border-r border-white/10 bg-black text-white p-6">
            <div className="mb-10">
                <div className="text-sm text-white/60">Intentionality (v0)</div>
                <div className="mt-1 text-xl font-semibold tracking-tight">
                    Command Center
                </div>
            </div>

            <nav className="space-y-2">
                {navItems.map((item) => (
                    <Link 
                        key = {item.href}
                        href={item.href}
                        className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 hover:text-white transition">
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="mt-10 text-xs text-white/40">
                <div>© 2025 Intentionality</div>
                <div className="mt-2">Built to learn full-stack fundamentals.</div>
            </div>
        </aside>
    );
}