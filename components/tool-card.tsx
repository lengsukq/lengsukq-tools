"use client";

import { Link } from "@heroui/link";
import { Card, CardBody, CardHeader } from "@heroui/card";

interface ToolCardProps {
  title: string;
  description: string;
  // icon: React.ReactNode;
  href: string;
}

export function ToolCard({ title, description, href }: ToolCardProps) {
  return (
    <Link className="block transition-transform hover:scale-105" href={href}>
      <Card className="w-full h-full">
        <CardHeader className="flex gap-3 items-center">
          {/*<div className="p-2 bg-primary/10 rounded-lg">*/}
          {/*  {icon}*/}
          {/*</div>*/}
          <h3 className="text-lg font-semibold">{title}</h3>
        </CardHeader>
        <CardBody>
          <p className="text-default-500">{description}</p>
        </CardBody>
      </Card>
    </Link>
  );
}
