"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  {
    label: "Home",
    href: "/",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Upload",
    href: "/upload",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-zinc-800">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = path === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 transition-colors ${
                active ? "text-white" : "text-zinc-500"
              }`}
            >
              {tab.icon(active)}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
