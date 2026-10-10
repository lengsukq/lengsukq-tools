"use client";

import { usePathname } from "next/navigation";

import { Header } from "./header";

export function ConditionalHeader() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isGamePage = pathname?.startsWith("/games/");

  if (isHomePage || isGamePage) {
    return null;
  }

  return <Header />;
}
