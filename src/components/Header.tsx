"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeToggle } from "./ThemeToggle";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export function Header() {
  const { t } = useTranslation();
  const pathname = usePathname();

  const isScanActive = pathname === "/";
  const isHistoryActive = pathname.startsWith("/history");
  const isProfileActive = pathname.startsWith("/profile");

  return (
    <header className="w-full border-b border-subtle bg-surface px-3 sm:px-6 py-3 transition-colors">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3.5 sm:gap-6">
          <Link
            href="/"
            className="text-sm sm:text-base font-bold tracking-tight text-primary hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
          >
            NutriScan
          </Link>

          <nav aria-label="Main Navigation" className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <Link
              href="/"
              className={`transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded ${
                isScanActive
                  ? "text-accent font-semibold border-b-2 border-accent"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {t.nav.scan}
            </Link>
            <Link
              href="/history"
              className={`transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded ${
                isHistoryActive
                  ? "text-accent font-semibold border-b-2 border-accent"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {t.nav.history}
            </Link>
            <Link
              href="/profile"
              className={`transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded ${
                isProfileActive
                  ? "text-accent font-semibold border-b-2 border-accent"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {t.nav.profile}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
