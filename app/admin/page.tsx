 "use client";

import Link from "next/link";
import { Card, CardBody, CardHeader } from "@heroui/react";

export default function AdminHomePage() {
  return (
    <section className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">管理员工具集</h1>
        <p className="mt-2 text-default-500 text-sm">
          内部管理工具集合。请确保已通过管理员登录访问本页面。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/quxiang-stats">
          <Card isPressable className="h-full">
            <CardHeader className="flex flex-col items-start gap-1">
              <h2 className="text-base font-semibold">趣象统计</h2>
              <p className="text-xs text-default-500">
                粘贴短信内容，自动识别领取码，并按手机号和月份归档管理。
              </p>
            </CardHeader>
            <CardBody className="text-xs text-default-500">
              支持批量粘贴、解析预览和归档查询，方便对权益领取情况进行统计与核对。
            </CardBody>
          </Card>
        </Link>
      </div>
    </section>
  );
}

