"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
} from "@heroui/react";
import { CopyIcon, TrashIcon, HistoryIcon } from "@/components/icons/index";
import {
  getShareHistory,
  deleteShareHistory,
  type ShareHistoryItem,
} from "@/utils/share-history";

interface ShareHistoryProps {
  type: "short-link" | "markdown";
  onCopy?: (url: string) => void;
  emptyMessage?: string;
}

export function ShareHistory({
  type,
  onCopy,
  emptyMessage = "暂无历史记录",
}: ShareHistoryProps) {
  const [history, setHistory] = useState<ShareHistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [type]);

  const loadHistory = () => {
    setHistory(getShareHistory(type));
  };

  const copyToClipboard = (item: ShareHistoryItem) => {
    navigator.clipboard
      .writeText(item.shortUrl)
      .then(() => {
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
        if (onCopy) {
          onCopy(item.shortUrl);
        }
      })
      .catch(() => {});
  };

  const deleteItem = (id: string) => {
    deleteShareHistory(type, id);
    loadHistory();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-md border border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          历史记录
        </h3>
        <Chip size="sm" variant="flat" startContent={<HistoryIcon size={16} />}>
          {history.length} 条
        </Chip>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border ${
                isExpired(item.expiresAt)
                  ? "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono text-primary break-all">
                      {item.shortUrl}
                    </code>
                    {isExpired(item.expiresAt) && (
                      <Chip size="sm" color="warning" variant="flat">
                        已过期
                      </Chip>
                    )}
                  </div>
                  {type === "short-link" && item.originalUrl && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.originalUrl}
                    </p>
                  )}
                  {type === "markdown" && item.contentPreview && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {item.contentPreview}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    onPress={() => copyToClipboard(item)}
                  >
                    {copiedId === item.id ? (
                      <span className="text-xs">已复制</span>
                    ) : (
                      <CopyIcon size={18} />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    isIconOnly
                    onPress={() => deleteItem(item.id)}
                  >
                    <TrashIcon size={18} />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                <span>创建于 {formatDate(item.createdAt)}</span>
                {item.expiresAt && (
                  <span>过期于 {formatDate(item.expiresAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}