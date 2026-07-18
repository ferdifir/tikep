"use client";

import { Compass, Home, Plus, PlusSquare, SlidersHorizontal, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTikep } from "@/components/app-provider";
import { TikepLogo } from "@/components/tikep-logo";

const navItems = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/post", label: "Post", icon: PlusSquare },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { homeFiltersOpen, toggleHomeFilters } = useTikep();
  const showHeader = pathname === "/" || pathname === "/explore";
  const isPreviewRoute =
    pathname.startsWith("/services/") || pathname.startsWith("/media/") || pathname.startsWith("/providers/");

  if (isPreviewRoute) {
    return <main className="mx-auto min-h-screen max-w-md bg-white shadow-xl">{children}</main>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white pb-20 shadow-xl">
      {showHeader ? (
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <Link href="/" aria-label="Tikep beranda">
            <TikepLogo />
          </Link>
          {pathname === "/explore" ? (
            <Link
              href="/post"
              aria-label="Tambah showcase"
              title="Tambah showcase"
              className="rounded-full p-2 text-gray-700 transition hover:bg-gray-100"
            >
              <Plus className="h-5 w-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={toggleHomeFilters}
              aria-label="Tampilkan filter"
              aria-pressed={homeFiltersOpen}
              className={`rounded-full p-2 transition ${
                homeFiltersOpen ? "bg-indigo-50 text-indigo-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          )}
        </header>
      ) : null}

      <main className="flex-1">{children}</main>

      <nav className="fixed bottom-0 z-50 flex w-full max-w-md items-center justify-between border-t border-gray-200 bg-white px-8 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`rounded-full p-2 transition ${
                active ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <Icon className="h-6 w-6" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
