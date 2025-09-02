"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import ReactMarkdown from "react-markdown";

// 简单的编辑图标
const EditDocumentIcon = () => (
  <svg
    fill="none"
    height="20"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// 简单的眼睛图标
const EyeIcon = () => (
  <svg
    fill="none"
    height="20"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// 简单的分享图标
const ShareIcon = () => (
  <svg
    fill="none"
    height="20"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
    <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
  </svg>
);

// 简单的复制图标
const CopyIcon = () => (
  <svg
    fill="none"
    height="16"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export function MarkdownPreview() {
  const [markdown, setMarkdown] = useState<string>(
    "# Markdown预览\n\n这是一个**Markdown**预览工具。\n\n## 功能特点\n\n- 实时预览\n- 可收起的编辑器\n- 支持标准Markdown语法\n\n### 列表示例\n\n1. 第一项\n2. 第二项\n3. 第三项\n\n### 代码示例\n\n```javascript\nfunction helloWorld() {\n  console.log('Hello, World!');\n}\n```\n\n> 这是一个引用块\n\n[链接示例](https://example.com)\n",
  );
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [showShareSuccess, setShowShareSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // 从URL参数加载分享内容
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get("shared");

    if (sharedData) {
      try {
        // 隐藏编辑器，只显示预览
        setShowEditor(false);

        // 解码Base64内容
        const decodedContent = decodeURIComponent(atob(sharedData));

        setMarkdown(decodedContent);
      } catch (error) {
        console.error("加载分享内容失败:", error);
        alert("加载分享内容失败，链接可能已损坏");
      }
    }
  }, []);

  const toggleEditor = () => {
    setShowEditor(!showEditor);
  };

  const handleShare = async () => {
    if (!markdown.trim()) {
      alert("内容不能为空");

      return;
    }

    setIsSharing(true);
    setShareUrl("");

    try {
      // 将内容编码为Base64
      const encodedContent = btoa(encodeURIComponent(markdown));
      const currentUrl = new URL(window.location.href);

      // 移除现有的shared参数
      currentUrl.searchParams.delete("shared");

      // 添加新的shared参数
      currentUrl.searchParams.set("shared", encodedContent);

      const longUrl = currentUrl.toString();
      console.log("生成的长URL:", longUrl);
      
      // 调用后端短链接API
      const response = await fetch('/api/short-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: longUrl }),
      });
      
      console.log("API响应状态:", response.status);
      
      const data = await response.json();
      console.log("API响应数据:", data);
      
      if (data.success && data.shortUrl) {
        // 使用短链接
        console.log("短链接生成成功:", data.shortUrl);
        setShareUrl(data.shortUrl);
      } else {
        // 如果短链接生成失败，使用原始长链接
        console.warn("短链接生成失败，使用原始链接。响应数据:", data);
        setShareUrl(longUrl);
      }
      
      setShowShareSuccess(true);

      // 3秒后隐藏成功消息
      setTimeout(() => {
        setShowShareSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("分享失败:", error);
      alert("分享失败，请重试");
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("复制失败:", err);
      });
  };

  return (
    <div className="w-full max-w-6xl space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          Markdown编辑器
        </h2>
        <div className="flex space-x-2">
          <Button
            className="font-medium"
            color="primary"
            isLoading={isSharing}
            startContent={<ShareIcon />}
            variant="light"
            onPress={handleShare}
          >
            分享
          </Button>
          <Button
            className="font-medium"
            color="primary"
            startContent={showEditor ? <EyeIcon /> : <EditDocumentIcon />}
            variant="light"
            onPress={toggleEditor}
          >
            {showEditor ? "隐藏编辑器" : "显示编辑器"}
          </Button>
        </div>
      </div>

      {showShareSuccess && (
        <div
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">分享成功！</strong>
          <span className="block sm:inline">
            {" "}
            短链接已生成，方便分享和传播。
          </span>
        </div>
      )}

      {shareUrl && (
        <Card className="shadow-md border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              分享链接
            </h3>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto">
                <code className="text-sm text-gray-800 dark:text-gray-200">
                  {shareUrl}
                </code>
              </div>
              <Button
                className="font-medium"
                color="primary"
                size="sm"
                startContent={<CopyIcon />}
                variant="light"
                onPress={copyToClipboard}
              >
                {copied ? "已复制" : "复制"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
      {showEditor && (
        <Card className="shadow-md border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Markdown输入
            </h3>
          </CardHeader>
          <CardBody className="pt-0">
            <Textarea
              className="min-h-[300px] font-mono text-sm"
              placeholder="在此输入Markdown文本..."
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
            />
          </CardBody>
        </Card>
      )}

      <Divider className="my-6" />

      <Card className="shadow-md border border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            预览结果
          </h3>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="prose prose-lg prose-blue max-w-none dark:prose-invert dark:prose-headings:text-gray-200 dark:prose-p:text-gray-300 dark:prose-strong:text-gray-200 dark:prose-code:text-gray-200 dark:prose-pre:bg-gray-800 dark:prose-blockquote:text-gray-300 dark:prose-li:text-gray-300 prose-p:my-4 prose-headings:my-5 prose-ul:my-4 prose-ol:my-4 prose-pre:my-5 prose-blockquote:my-4 min-h-[300px] overflow-auto">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
