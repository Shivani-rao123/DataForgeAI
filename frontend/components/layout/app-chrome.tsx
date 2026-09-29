"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}