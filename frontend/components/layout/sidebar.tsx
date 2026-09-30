"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, History, Database, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  { label: "New Task", href: "/", icon: PlusCircle },
  { label: "History", href: "/history", icon: History },
  { label: "Datasets", href: "/datasets", icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border-subtle bg-elevated">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border-subtle">
        <Sparkles className="h-5 w-5 text-cyan" />
        <span className="font-heading font-semibold text-sm">
          <span className="text-cyan">DataForge</span>
          <span className="text-text-primary"> AI</span>
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-card-solid text-cyan border border-border-glow"
                  : "text-text-secondary hover:text-text-primary hover:bg-card-solid"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}