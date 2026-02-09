"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Divider,
} from "@heroui/react";
import { CopyIcon } from "@/components/icons/index";
import { ShareHistory } from "@/components/ShareHistory";
import {
  addShareHistory,
} from "@/utils/share-history";

const SHORT_CODE_PLACEHOLDER = "留空则自动生成";

export default function ShortLinkPage() {
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShortUrl("");

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("请输入要缩短的链接");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("链接格式无效");
      return;
    }

    setLoading(true);
    try {
      const body: { url: string; code?: string } = { url: trimmedUrl };
      if (customCode.trim()) body.code = customCode.trim();

      const res = await fetch("/api/short-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "生成失败");
        return;
      }
      if (data.shortUrl) {
        setShortUrl(data.shortUrl);
        // 添加到历史记录
        addShareHistory({
          type: "short-link",
          shortUrl: data.shortUrl,
          originalUrl: trimmedUrl,
          customCode: customCode.trim() || undefined,
          expiresAt: data.expiresAt,
        });
        // 触发历史记录刷新
        setHistoryKey((prev) => prev + 1);
      }
    } catch {
      setError("生成短链接失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!shortUrl) return;
    navigator.clipboard
      .writeText(shortUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-12 px-4">
      <div className="inline-block max-w-2xl text-center justify-center mb-6">
        <h1 className="text-3xl font-bold">短链接</h1>
        <p className="text-default-500 mt-3">
          将长链接缩短，支持自定义短链，默认 30 天有效
        </p>
      </div>

      <div className="w-full max-w-xl">
        <Card className="shadow-md border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              生成短链接
            </h2>
          </CardHeader>
          <CardBody className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="原链接"
                placeholder="https://example.com/very/long/url"
                value={url}
                onValueChange={setUrl}
                isInvalid={!!error && !shortUrl}
                errorMessage={error && !shortUrl ? error : undefined}
                type="url"
                autoComplete="url"
                classNames={{ input: "font-mono text-sm" }}
              />
              <Input
                label="自定义短链（可选）"
                placeholder={SHORT_CODE_PLACEHOLDER}
                description="2～32 位，仅支持字母、数字、下划线和连字符"
                value={customCode}
                onValueChange={setCustomCode}
                classNames={{ input: "font-mono" }}
              />
              <Button
                type="submit"
                color="primary"
                isLoading={loading}
                className="w-full"
              >
                生成
              </Button>
            </form>
          </CardBody>
        </Card>

        {shortUrl && (
          <>
            <Divider className="my-6" />
            <Card className="shadow-md border border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-2">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  短链接
                </h3>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto">
                    <code className="text-sm text-gray-800 dark:text-gray-200 break-all">
                      {shortUrl}
                    </code>
                  </div>
                  <Button
                    color="primary"
                    size="sm"
                    variant="flat"
                    startContent={<CopyIcon />}
                    onPress={copyToClipboard}
                  >
                    {copied ? "已复制" : "复制"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </>
        )}

        <Divider className="my-6" />

        <ShareHistory key={historyKey} type="short-link" />
      </div>
    </section>
  );
}
