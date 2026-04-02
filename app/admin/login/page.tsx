"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "登录失败，请重试");
        setLoading(false);
        return;
      }

      router.push("/admin/quxiang-stats");
    } catch (e) {
      console.error(e);
      setError("网络异常，请稍后再试");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-start gap-1">
          <h1 className="text-xl font-semibold">管理员登录</h1>
          <p className="text-small text-default-500">
            仅限内部使用，请输入管理员密码。
          </p>
        </CardHeader>
        <CardBody>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              label="密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isRequired
            />
            {error ? (
              <p className="text-small text-danger">{error}</p>
            ) : null}
            <Button color="primary" isLoading={loading} type="submit">
              登录
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

