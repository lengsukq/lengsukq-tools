import { ApiClient } from "@/components/api-client/ApiClient";

export default function ApiClientPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 px-4">
      <div className="inline-block max-w-xl text-center justify-center mb-8">
        <h1 className="text-3xl font-bold">API 客户端</h1>
        <p className="text-default-500 mt-2">
          类似 Postman 的工具，通过服务器代理绕过 CORS 限制
        </p>
      </div>

      <ApiClient />
    </section>
  );
}
