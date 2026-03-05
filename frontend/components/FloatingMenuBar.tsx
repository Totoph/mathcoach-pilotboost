"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, User, Dumbbell } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/train", label: "S'entraîner", icon: Dumbbell },
  { href: "/profile", label: "Profil", icon: User },
];

export default function FloatingMenuBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white/60 backdrop-blur-2xl rounded-2xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-2 py-2">
        <ul className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/80"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}