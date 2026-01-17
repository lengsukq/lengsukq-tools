"use client";

import { Link, Card, CardBody } from "@heroui/react";
import { usePathname } from "next/navigation";

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
}

export function ToolCard({ title, description, href }: ToolCardProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className="group block w-full h-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
    >
      <Card
        className={`w-full h-full border-2 transition-all duration-300 ${
          isActive
            ? "border-primary bg-primary/5 shadow-lg"
            : "border-default-200 hover:border-primary/50 hover:shadow-md"
        }`}
        isPressable
        isHoverable
      >
        <CardBody className="p-5">
          <div className="flex flex-col gap-3">
            <h3
              className={`text-lg font-semibold transition-colors ${
                isActive ? "text-primary" : "text-foreground"
              }`}
            >
              {title}
            </h3>
            <p className="text-sm text-default-600 line-clamp-2 leading-relaxed">
              {description}
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-default-400 group-hover:text-default-600 transition-colors">
              <span>立即使用</span>
              <svg
                className="w-3 h-3 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
