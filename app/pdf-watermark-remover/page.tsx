"use client";

import { useState, useCallback } from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { useDropzone } from "react-dropzone";
import { PDFDocument, rgb } from "pdf-lib";

interface ProcessedFile {
  name: string;
  pdfBytes: Uint8Array;
  pages: number;
}

export default function PdfWatermarkRemover() {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(
      (file) => file.type === "application/pdf"
    );
    setFiles((prev) => [...prev, ...pdfFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
  });

  const processSingleFile = async (file: File): Promise<ProcessedFile> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    // 处理每一页
    for (const page of pages) {
      const { width, height } = page.getSize();

      // 计算水印区域（右下角）
      const watermarkWidth = width / 3;
      const watermarkHeight = height / 14;
      const watermarkX = width - watermarkWidth - 10; // 右边距10px
      const watermarkY = 6; // 底边距6px

      // 用白色矩形覆盖水印区域
      page.drawRectangle({
        x: watermarkX,
        y: watermarkY,
        width: watermarkWidth,
        height: watermarkHeight,
        color: rgb(1, 1, 1), // 白色
        opacity: 1,
        borderWidth: 0,
      });
    }

    const modifiedPdfBytes = await pdfDoc.save();

    return {
      name: file.name,
      pdfBytes: modifiedPdfBytes,
      pages: pages.length,
    };
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    setProcessing(true);
    setProgress({ current: 0, total: files.length });
    const results: ProcessedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await processSingleFile(files[i]);
      results.push(result);
      setProgress({ current: i + 1, total: files.length });
    }

    setProcessedFiles(results);
    setProcessing(false);
  };

  const handleDownload = (file: ProcessedFile) => {
    const blob = new Blob([file.pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name.replace(".pdf", "_去水印.pdf");
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    processedFiles.forEach((file) => {
      handleDownload(file);
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">PDF 水印去除工具</h1>

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
              <p>将PDF文件拖放到这里</p>
            ) : (
              <p>
                点击或拖放PDF文件到这里上传
                <br />
                <span className="text-sm text-default-500">
                  支持批量上传，自动去除右下角水印
                </span>
              </p>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-default-500 mb-2">
                已选择 {files.length} 个文件
              </p>
              <Button
                color="primary"
                onPress={handleProcess}
                isDisabled={processing}
                className="w-full"
              >
                {processing
                  ? `处理中... ${progress.current}/${progress.total}`
                  : "开始处理"}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {processedFiles.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                处理完成 ({processedFiles.length} 个文件)
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
                  className="flex justify-between items-center p-3 bg-default-100 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-default-500">
                      {file.pages} 页
                    </p>
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
          </CardBody>
        </Card>
      )}
    </div>
  );
}
