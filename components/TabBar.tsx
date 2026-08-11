// T-05 하단 탭 4개 (PRD 3-4) — 🌰 루틴 · 🍚 식단 · 📸 눈바디 · 📅 기록
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", ico: "🌰", label: "루틴" },
  { href: "/meal", ico: "🍚", label: "식단" },
  { href: "/body", ico: "📸", label: "눈바디" },
  { href: "/log", ico: "📅", label: "기록" },
] as const;

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="화면 이동">
      {TABS.map((tab) => {
        // 루틴 탭은 홈이라 정확히 '/'일 때만, 나머지는 하위 화면에서도 켜진 채로 둔다
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
          >
            <span className="ico" aria-hidden="true">
              {tab.ico}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
