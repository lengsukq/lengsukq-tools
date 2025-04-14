'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Slider } from '@heroui/slider';
import { useDropzone } from "react-dropzone";

// 防抖hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ImageCompressor() {
  const [quality, setQuality] = useState(80);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<{ original: { size: number; dimensions: string } | null, compressed: { size: number; dimensions: string } | null } | null>(null);
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; image: string | null }>({ isOpen: false, image: null });

  // 清理URL对象
  const cleanupURLs = () => {
    if (preview) URL.revokeObjectURL(preview);
    if (compressedImage) URL.revokeObjectURL(compressedImage);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // 清理之前的URL对象
    cleanupURLs();
    const file = acceptedFiles[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setImage(file);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      
      const img = new Image();
      img.onload = () => {
        setImageInfo(prev => ({
          original: {
            size: file.size,
            dimensions: `${img.width}x${img.height}`
          },
          compressed: prev?.compressed || null
        }));
        compressImage(file, quality);
      };
      img.src = objectUrl;
    }
  }, [quality]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: false
  });

  const compressImage = async (file: File, quality: number) => {
    // 如果存在之前的压缩图片URL，先清理掉
    if (compressedImage) {
      URL.revokeObjectURL(compressedImage);
      setCompressedImage(null);
    }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    canvas.toBlob(
      async (blob) => {
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          setCompressedImage(objectUrl);
          
          const compressedImg = new Image();
          compressedImg.onload = () => {
            setImageInfo(prev => ({
              original: prev?.original || null,
              compressed: {
                size: blob.size,
                dimensions: `${compressedImg.width}x${compressedImg.height}`
              }
            }));
          };
          compressedImg.src = objectUrl;
        }
      },
      file.type,
      quality / 100
    );
  };

  const handleQualityChange = (value: number) => {
    setQuality(value);
  };

  const debouncedQuality = useDebounce(quality, 300);

  useEffect(() => {
    if (image) {
      compressImage(image, debouncedQuality);
    }
  }, [debouncedQuality, image]);

  const handleDownload = () => {
    if (!compressedImage) return;
    const link = document.createElement('a');
    link.href = compressedImage;
    link.download = `compressed-${image?.name || 'image'}`;
    link.click();
  };

  // 组件卸载时清理URL对象
  useEffect(() => {
    return () => cleanupURLs();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">图片压缩工具</h1>
      <Card className="mb-6">
        <CardBody>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-default-200'}`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>将图片拖放到这里</p>
            ) : (
              <p>点击或拖放图片到这里上传<br /><span className="text-sm text-default-500">支持 JPG 和 PNG 格式</span></p>
            )}
          </div>

          {preview && (
            <div className="mt-4">
              <p className="mb-2">压缩质量: {quality}%</p>
              <Slider
                value={quality}
                onChangeEnd={(val)=>handleQualityChange(val as number)}
                minValue={1}
                maxValue={100}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </CardBody>
      </Card>

      {preview && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardBody>
                <p className="text-sm text-default-500 mb-2">原图</p>
                <div 
                  className="cursor-pointer" 
                  onClick={() => setPreviewModal({ isOpen: true, image: preview })}
                >
                  <img src={preview} alt="原图" className="w-full rounded hover:opacity-90 transition-opacity" />
                </div>
                {imageInfo?.original && (
                  <p className="text-xs text-default-400 mt-2">
                    尺寸: {imageInfo.original.dimensions}<br />
                    大小: {(imageInfo.original.size / 1024).toFixed(2)} KB
                  </p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-sm text-default-500 mb-2">压缩后</p>
                {compressedImage && (
                  <>
                    <div 
                      className="cursor-pointer" 
                      onClick={() => setPreviewModal({ isOpen: true, image: compressedImage })}
                    >
                      <img src={compressedImage} alt="压缩后" className="w-full rounded hover:opacity-90 transition-opacity" />
                    </div>
                    {imageInfo?.compressed && (
                      <p className="text-xs text-default-400 mt-2">
                        尺寸: {imageInfo.compressed.dimensions}<br />
                        大小: {(imageInfo.compressed.size / 1024).toFixed(2)} KB
                      </p>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          </div>

          <Button
            color="primary"
            className="w-full"
            onPressEnd={handleDownload}
            disabled={!compressedImage}
          >
            下载压缩后的图片
          </Button>
        </div>
      )}

      {/* 图片预览模态框 */}
      {previewModal.isOpen && previewModal.image && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setPreviewModal({ isOpen: false, image: null })}
        >
          <div className="max-w-[90vw] max-h-[90vh] relative">
            <img 
              src={previewModal.image} 
              alt="预览图片" 
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}