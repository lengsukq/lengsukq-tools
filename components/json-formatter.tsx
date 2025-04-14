'use client';

import { useState } from 'react';
import { Button } from '@heroui/button';
import { Textarea } from '@heroui/input';
import { Card, CardBody } from '@heroui/card';

export function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const formatJson = () => {
    try {
      if (!input.trim()) {
        setError('请输入JSON字符串');
        setOutput('');
        return;
      }
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (e) {
      setError('无效的JSON格式');
      setOutput('');
    }
  };

  const minifyJson = () => {
    try {
      if (!input.trim()) {
        setError('请输入JSON字符串');
        setOutput('');
        return;
      }
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e) {
      setError('无效的JSON格式');
      setOutput('');
    }
  };

  const copyToClipboard = async () => {
    if (output) {
      await navigator.clipboard.writeText(output);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-4">
      <Card>
        <CardBody>
          <Textarea
            placeholder="在此输入JSON字符串..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[200px] font-mono"
          />
        </CardBody>
      </Card>

      <div className="flex gap-2 justify-center">
        <Button color="primary" onClick={formatJson}>格式化</Button>
        <Button color="secondary" onClick={minifyJson}>压缩</Button>
        <Button color="default" onClick={copyToClipboard} disabled={!output}>复制结果</Button>
      </div>

      {error && (
        <div className="text-red-500 text-center">{error}</div>
      )}

      {output && (
        <Card>
          <CardBody>
            <pre className="whitespace-pre-wrap font-mono break-all">{output}</pre>
          </CardBody>
        </Card>
      )}
    </div>
  );
}