"use client";

import { useState, useCallback } from "react";
import { Card, CardBody, Button, Input } from "@heroui/react";
import { useDropzone } from "react-dropzone";

import { ProcessedFile, UnlockError } from "./types";
import {
  unlockMultiplePdfs,
  downloadUnlockedFile,
  formatFileSize,
} from "./utils";

export default function PdfUnlocker() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [errorFiles, setErrorFiles] = useState<UnlockError[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(
      (file) => file.type === "application/pdf",
    );

    setFiles((prev) => [...prev, ...pdfFiles]);
    setProcessedFiles([]);
    setErrorFiles([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
  });

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setProcessedFiles([]);
    setErrorFiles([]);
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setPassword("");
    setPasswordError("");
    setProcessedFiles([]);
    setErrorFiles([]);
    setProgress({ current: 0, total: 0 });
  }, []);

  const handleUnlock = async () => {
    if (files.length === 0) {
      return;
    }

    if (!password.trim()) {
      setPasswordError("请输入PDF密码");
      return;
    }

    setPasswordError("");
    setProcessing(true);
    setProgress({ current: 0, total: files.length });
    setProcessedFiles([]);
    setErrorFiles([]);

    const result = await unlockMultiplePdfs(files, password.trim());

    setProcessedFiles(result.success);
    setErrorFiles(result.errors);
    setProgress({ current: result.success.length, total: files.length });
    setProcessing(false);
  };

  const handleDownload = (file: ProcessedFile) => {
    downloadUnlockedFile(file);
  };

  const handleDownloadAll = () => {
    processedFiles.forEach((file) => {
      handleDownload(file);
    });
  };

  const hasResults = processedFiles.length > 0 || errorFiles.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">PDF 密码解锁工具</h1>
        <p className="text-default-600">
          移除 PDF 文件的打开密码保护，解锁后可以自由阅读、编辑和打印。所有操作在本地完成，保护隐私安全
        </p>
      </div>

      {/* 功能说明 */}
      <Card className="mb-6">
        <CardBody>
          <div className="bg-warning-50 dark:bg-warning-900/20 border-l-4 border-warning-500 p-4 mb-4 rounded-r-lg">
            <div className="flex items-start gap-2">
              <span className="text-warning-600 dark:text-warning-400 font-semibold">
                重要提示：
              </span>
              <div className="text-sm text-default-700 dark:text-default-300">
                <p className="mb-1">
                  • 本工具仅用于解锁您拥有合法权限的PDF文件，请勿用于非法用途
                </p>
                <p>
                  •
                  需要知道正确的PDF打开密码才能解锁，您需要先知道密码才能去除密码保护
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2 text-default-700 dark:text-default-300">
              功能特点：
            </h3>
            <ul className="space-y-1 text-sm text-default-600 dark:text-default-400">
              <li>✓ 移除 PDF 打开密码保护</li>
              <li>✓ 支持批量解锁多个 PDF 文件</li>
              <li>✓ 解锁后保留所有原始内容和排版</li>
              <li>✓ 不登录、无广告，完全免费</li>
              <li>✓ 所有操作都在本地浏览器中完成，文件不会上传到服务器</li>
              <li>
                ✓
                支持解锁后查看文件大小变化，直观了解解锁效果
              </li>
            </ul>
          </div>

          <div className="bg-default-100 dark:bg-default-50 p-3 rounded-lg text-xs text-default-500 dark:text-default-400">
            <p>
              <strong>适用场景：</strong>
              忘记密码的PDF文档、需要批量处理加密的PDF文件、去除了权限限制后方便打印和编辑
            </p>
          </div>
        </CardBody>
      </Card>

      {/* 密码输入 */}
      <Card className="mb-6">
        <CardBody>
          <h2 className="text-lg font-semibold mb-4">输入 PDF 密码</h2>
          <Input
            className="max-w-md"
            placeholder="请输入 PDF 文件的打开密码"
            type={showPassword ? "text" : "password"}
            value={password}
            isInvalid={!!passwordError}
            errorMessage={passwordError}
            onValueChange={(value) => {
              setPassword(value);
              if (passwordError) {
                setPasswordError("");
              }
            }}
            endContent={
              <button
                aria-label="切换密码显示"
                className="focus:outline-none"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg
                    className="h-5 w-5 text-default-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-default-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                    <path
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                  </svg>
                )}
              </button>
            }
          />
          <p className="text-xs text-default-400 mt-2">
            请输入 PDF 文件设置的打开密码
          </p>
        </CardBody>
      </Card>

      {/* 上传区域 */}
      <Card className="mb-6">
        <CardBody>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/10"
                : "border-default-200"
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>将 PDF 文件拖放到这里</p>
            ) : (
              <div>
                <div className="flex justify-center mb-3">
                  <svg
                    className="h-12 w-12 text-default-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                  </svg>
                </div>
                <p>点击或拖放 PDF 文件到这里上传</p>
                <p className="text-sm text-default-500 mt-1">
                  支持批量上传多个加密 PDF 文件
                </p>
              </div>
            )}
          </div>

          {/* 已选择的文件列表 */}
          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-default-600">
                  已选择 {files.length} 个文件
                </p>
                <Button
                  color="danger"
                  size="sm"
                  variant="light"
                  onPress={clearAll}
                >
                  清空全部
                </Button>
              </div>
              <div className="space-y-2 mb-4">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-default-100 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <svg
                        className="h-5 w-5 text-danger flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                        />
                      </svg>
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <button
                      className="text-default-400 hover:text-danger transition-colors flex-shrink-0 ml-2"
                      onClick={() => removeFile(index)}
                      type="button"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M6 18L18 6M6 6l12 12"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                color="primary"
                isDisabled={processing || !password.trim()}
                onPress={handleUnlock}
              >
                {processing
                  ? `解锁中... ${progress.current}/${progress.total}`
                  : "开始解锁"}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 处理结果 */}
      {hasResults && (
        <Card>
          <CardBody>
            {/* 成功解锁的文件 */}
            {processedFiles.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-success">
                    解锁成功 ({processedFiles.length} 个文件)
                  </h2>
                  {processedFiles.length > 1 && (
                    <Button
                      color="primary"
                      size="sm"
                      onPress={handleDownloadAll}
                    >
                      全部下载
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {processedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                    >
                      <div className="min-w-0 flex-1 mr-4">
                        <p className="font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-3 text-sm text-default-500 mt-1">
                          <span>{file.pages} 页</span>
                          <span className="text-danger line-through">
                            {formatFileSize(file.originalSize)}
                          </span>
                          <span className="text-success">
                            {formatFileSize(file.unlockedSize)}
                          </span>
                        </div>
                      </div>
                      <Button
                        color="primary"
                        size="sm"
                        onPress={() => handleDownload(file)}
                      >
                        下载
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 解锁失败的文件 */}
            {errorFiles.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-danger mb-4">
                  解锁失败 ({errorFiles.length} 个文件)
                </h2>
                <div className="space-y-2">
                  {errorFiles.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg border border-danger-200"
                    >
                      <p className="font-medium text-danger">{item.name}</p>
                      <p className="text-sm text-danger-600 dark:text-danger-400 mt-1">
                        {item.error}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
