'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';

export default function UUIDGenerator() {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState<string>('1');

  const generateUUIDs = () => {
    const newUuids = Array.from({ length: Number(count) }, () => uuidv4());
    setUuids(newUuids);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <h1 className="text-2xl font-bold">UUID生成器</h1>
          <p className="text-default-500 mt-2">生成随机的UUID (v4版本)</p>
        </CardHeader>
        <CardBody>
          <div className="flex gap-4 mb-6">
            <Input
              type="number"
              min={1}
              max={100}
              value={count}
              onValueChange={(value) => setCount(value)}
              placeholder="生成数量"
              className="w-32"
            />
            <Button color="primary" onClick={generateUUIDs}>
              生成UUID
            </Button>
          </div>

          {uuids.length > 0 && (
            <div className="space-y-3">
              {uuids.map((uuid, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                >
                  <code className="font-mono">{uuid}</code>
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={() => copyToClipboard(uuid)}
                  >
                    复制
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}