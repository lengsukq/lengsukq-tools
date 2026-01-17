"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { Logo } from "@/components/icons";

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 主要工具导航（显示常用的几个）
  const mainTools = [
    { label: "首页", href: "/" },
    { label: "域名查询", href: "/domain-checker" },
    { label: "PDF去水印", href: "/pdf-watermark-remover" },
    { label: "图片压缩", href: "/image-compressor" },
    { label: "JSON格式化", href: "/json-formatter" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-divider bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <NextLink href="/" className="flex items-center gap-2">
              <Logo />
              <span className="font-bold text-lg">{siteConfig.name}</span>
            </NextLink>
          </div>

          {/* 导航链接 - 桌面端 */}
          <nav className="hidden md:flex items-center gap-1">
            {mainTools.map((item) => (
              <Link
                key={item.href}
                as={NextLink}
                href={item.href}
                className={clsx(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "text-primary bg-primary/10"
                    : "text-default-600 hover:text-default-900 hover:bg-default-100"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* 右侧功能区 */}
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            {/* 移动端菜单按钮 */}
            <Button
              isIconOnly
              variant="light"
              className="md:hidden"
              onPress={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="菜单"
            >
              {isMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-divider py-4">
            <nav className="flex flex-col gap-1">
              {mainTools.map((item) => (
                <Link
                  key={item.href}
                  as={NextLink}
                  href={item.href}
                  className={clsx(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "text-primary bg-primary/10"
                      : "text-default-600"
                  )}
                  onPress={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
