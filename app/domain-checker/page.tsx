import { DomainChecker } from '@/components/domain-checker';

export default function DomainCheckerPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center mb-8">
        <h1 className="text-3xl font-bold">域名查询</h1>
        <p className="text-default-500 mt-2">快速查询域名是否已被注册，获取详细的 WHOIS 信息</p>
      </div>

      <DomainChecker />
    </section>
  );
}