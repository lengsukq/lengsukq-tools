import { JsonFormatter } from '@/components/json-formatter';

export default function JsonFormatterPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center mb-8">
        <h1 className="text-3xl font-bold">JSON格式化</h1>
        <p className="text-default-500 mt-2">在线JSON格式化、压缩、语法验证工具</p>
      </div>

      <JsonFormatter />
    </section>
  );
}