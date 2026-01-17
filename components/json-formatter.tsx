"use client";

import { useState } from "react";
import { Button, Textarea, Card, CardBody } from "@heroui/react";
import { formatJson as formatJsonUtil, minifyJson as minifyJsonUtil } from "@/utils/json-utils";

export function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const formatJson = () => {
    const result = formatJsonUtil(input);
    setOutput(result.output);
    setError(result.error);
  };

  const minifyJson = () => {
    const result = minifyJsonUtil(input);
    setOutput(result.output);
    setError(result.error);
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
            className="min-h-[200px] font-mono"
            placeholder="在此输入JSON字符串..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </CardBody>
      </Card>

      <div className="flex gap-2 justify-center">
        <Button color="primary" onClick={formatJson}>
          格式化
        </Button>
        <Button color="secondary" onClick={minifyJson}>
          压缩
        </Button>
        <Button color="default" disabled={!output} onClick={copyToClipboard}>
          复制结果
        </Button>
      </div>

      {error && <div className="text-red-500 text-center">{error}</div>}

      {output && (
        <Card>
          <CardBody>
            <pre className="whitespace-pre-wrap font-mono break-all">
              {output}
            </pre>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
