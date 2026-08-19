"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Grade Plays", icon: ClipboardList },
  { href: "/results", label: "Results", icon: BarChart3 },
  { href: "/setup", label: "Setup", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b-4 border-[#C8102E] bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C8102E] text-lg font-black text-white">
            BR
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-gray-900">
              RB Grade Book
            </h1>
            <p className="text-xs font-medium uppercase tracking-widest text-[#C8102E]">
              Running Back Expectations
            </p>
          </div>
        </div>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                pathname === item.href
                  ? "bg-[#C8102E] text-white"
                  : "text-gray-600 hover:bg-red-50 hover:text-[#C8102E]"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
