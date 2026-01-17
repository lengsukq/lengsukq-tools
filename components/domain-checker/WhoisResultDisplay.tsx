import { WhoisResponse } from "./types";

interface WhoisResultDisplayProps {
  result: WhoisResponse;
}

/**
 * WHOIS 查询结果展示组件
 */
export function WhoisResultDisplay({ result }: WhoisResultDisplayProps) {
  return (
    <div className="p-4 space-y-4 bg-gray-50 rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-lg">域名状态：</span>
          <span
            className={`ml-2 px-3 py-1 text-sm rounded-full ${
              result.isRegistered
                ? "bg-red-200 text-red-800"
                : "bg-green-200 text-green-800"
            }`}
          >
            {result.isRegistered ? "已被注册" : "可以注册"}
          </span>
        </div>
        <span className="text-gray-500 text-sm">域名: {result.domain}</span>
      </div>

      {result.whoisData && (
        <div className="space-y-3">
          {result.whoisData["DNS Serve"] && (
            <div>
              <div className="font-medium text-gray-700">DNS 服务器</div>
              <div className="text-sm text-gray-600">
                {result.whoisData["DNS Serve"].join(", ")}
              </div>
            </div>
          )}

          {result.whoisData["Registration Time"] && (
            <div>
              <div className="font-medium text-gray-700">注册时间</div>
              <div className="text-sm text-gray-600">
                {result.whoisData["Registration Time"]}
              </div>
            </div>
          )}

          {result.whoisData["Expiration Time"] && (
            <div>
              <div className="font-medium text-gray-700">到期时间</div>
              <div className="text-sm text-gray-600">
                {result.whoisData["Expiration Time"]}
              </div>
            </div>
          )}

          {result.whoisData["Registrar URL"] && (
            <div>
              <div className="font-medium text-gray-700">注册商</div>
              <a
                className="text-blue-600 hover:underline text-sm"
                href={result.whoisData["Registrar URL"]}
                rel="noopener noreferrer"
                target="_blank"
              >
                {result.whoisData["Registrar URL"]}
              </a>
            </div>
          )}

          <div>
            <div className="font-medium text-gray-700">WHOIS 信息</div>
            <pre className="p-3 mt-2 text-xs bg-gray-100 rounded-lg overflow-x-auto text-gray-800">
              {JSON.stringify(result.whoisData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
