"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { useTheme } from "next-themes";

// 图标组件
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

const ExternalLinkIcon = () => (
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
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15,3 21,3 21,9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

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

export function HtmlPreview() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // 确保组件已挂载，避免hydration问题
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [html, setHtml] = useState<string>(
    `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML预览示例</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 40px;
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            background: #fff;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        .highlight {
            background: #f1c40f;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .button {
            background: #3498db;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
        }
        .button:hover {
            background: #2980b9;
        }
        .code {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Monaco', 'Menlo', monospace;
            border-left: 4px solid #3498db;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>欢迎使用 HTML 预览工具</h1>
        
        <p>这是一个 <span class="highlight">HTML预览示例</span>，你可以在这里编辑HTML代码并实时查看效果。</p>
        
        <h2>功能特点</h2>
        <ul>
            <li>实时预览</li>
            <li>响应式设计</li>
            <li>语法高亮</li>
            <li>代码提示</li>
        </ul>
        
        <h2>示例代码</h2>
        <div class="code">
function greet(name) {
    return \`Hello, \${name}!\`;
}
        </div>
        
        <button class="button" onclick="alert('Hello from HTML!')">
            点击测试
        </button>
        
        <p>尝试修改左侧的HTML代码，看看效果！</p>
    </div>
</body>
</html>`,
  );
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [showShareSuccess, setShowShareSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

        setHtml(decodedContent);
      } catch (error: any) {
        console.error("加载分享内容失败:", error);
        alert("加载分享内容失败，链接可能已损坏");
      }
    }
  }, []);

  // 更新iframe内容
  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
      }
    }
  }, [html]);

  const toggleEditor = () => {
    setShowEditor(!showEditor);
  };

  const openInNewTab = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const handleShare = async () => {
    if (!html.trim()) {
      alert("内容不能为空");
      return;
    }

    setIsSharing(true);
    setShareUrl("");

    try {
      // 将内容编码为Base64
      const encodedContent = btoa(encodeURIComponent(html));
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
    } catch (error: any) {
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
      .catch((err: Error) => {
        console.error("复制失败:", err);
      });
  };

  const formatHtml = () => {
    try {
      // 简单的HTML格式化
      const formatted = html
        .replace(/></g, '>\n<')
        .replace(/<(\/?)([^>]+)>/g, '\n$1$2\n')
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.trim())
        .join('\n');
      setHtml(formatted);
    } catch (error: any) {
      console.error("格式化失败:", error);
    }
  };

  return (
    <div className="w-full max-w-6xl space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          HTML编辑器
        </h2>
        <div className="flex space-x-2 flex-wrap gap-2">
          <Button
            className="font-medium"
            color="primary"
            size="sm"
            startContent={<ShareIcon />}
            variant="light"
            onPress={handleShare}
            isLoading={isSharing}
          >
            分享
          </Button>
          <Button
            className="font-medium"
            color="primary"
            size="sm"
            startContent={<ExternalLinkIcon />}
            variant="light"
            onPress={openInNewTab}
          >
            新页面打开
          </Button>
          <Button
            className="font-medium"
            color="primary"
            size="sm"
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
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                HTML代码输入
              </h3>
              <Button
                className="font-medium"
                color="default"
                size="sm"
                variant="light"
                onPress={formatHtml}
              >
                格式化
              </Button>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <Textarea
              className="min-h-[300px] font-mono text-sm"
              placeholder="在此输入HTML代码..."
              value={html}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHtml(e.target.value)}
            />
          </CardBody>
        </Card>
      )}

      <Divider className="my-6" />

      <Card className="shadow-md border border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              预览效果
            </h3>
            <Button
              className="font-medium"
              color="primary"
              size="sm"
              startContent={<ExternalLinkIcon />}
              variant="light"
              onPress={openInNewTab}
            >
              新页面打开
            </Button>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <iframe
              ref={iframeRef}
              className="w-full min-h-[400px] border-0"
              title="HTML Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}